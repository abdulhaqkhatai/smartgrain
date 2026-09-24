-- ============================================================
-- Smart Grain Procurement System — Full Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- ENUM types
create type user_role as enum ('farmer', 'staff', 'admin');
create type procurement_stage as enum ('booked', 'checked_in', 'quality_check', 'weighed', 'procured', 'rejected', 'cancelled', 'no_show');
create type payment_stage as enum ('not_applicable', 'pending', 'processing', 'paid', 'failed');
create type notification_channel as enum ('sms', 'email', 'in_app');
create type notification_type as enum ('booking_confirmed', 'queue_reminder', 'your_turn', 'stage_update', 'payment_update', 'cancelled', 'booking_reminder_24h');

-- Sequence for booking references
create sequence if not exists booking_ref_seq;

-- Centres (create before profiles so profiles can FK to it)
create table centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  address text not null,
  district text not null,
  state text not null,
  latitude numeric,
  longitude numeric,
  grain_types text[] not null default '{wheat,rice}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique not null,
  role user_role not null default 'farmer',
  assigned_centre_id uuid references centres(id),
  village text,
  created_at timestamptz default now()
);

-- Slot templates
create table slot_templates (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid references centres(id) not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  capacity int not null check (capacity > 0),
  is_active boolean default true
);

-- Concrete slots
create table slots (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid references centres(id) not null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  capacity int not null,
  booked_count int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(centre_id, slot_date, start_time)
);

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references profiles(id) not null,
  centre_id uuid references centres(id) not null,
  slot_id uuid references slots(id) not null,
  grain_type text not null,
  estimated_quantity_kg numeric not null,
  actual_quantity_kg numeric,
  booking_reference text unique not null,
  procurement_stage procurement_stage not null default 'booked',
  payment_stage payment_stage not null default 'not_applicable',
  payment_amount numeric,
  queue_position int,
  booked_at timestamptz default now(),
  checked_in_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  notes text
);

-- Status history
create table booking_status_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) not null,
  changed_by uuid references profiles(id),
  old_stage text,
  new_stage text,
  changed_at timestamptz default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references profiles(id) not null,
  booking_id uuid references bookings(id),
  type notification_type not null,
  channel notification_channel not null,
  message text not null,
  sent_at timestamptz default now(),
  delivery_status text default 'sent',
  read_at timestamptz
);

-- Indexes
create index idx_bookings_slot on bookings(slot_id);
create index idx_bookings_farmer on bookings(farmer_id);
create index idx_bookings_centre_date_stage on bookings(centre_id, procurement_stage);
create index idx_slots_centre_date on slots(centre_id, slot_date);

-- Live queue view
create or replace view live_queue as
select
  b.id as booking_id,
  b.centre_id,
  s.slot_date,
  b.farmer_id,
  b.procurement_stage,
  b.booking_reference,
  b.grain_type,
  b.estimated_quantity_kg,
  b.booked_at,
  row_number() over (
    partition by b.centre_id, s.slot_date
    order by b.booked_at asc
  ) as queue_position,
  count(*) over (partition by b.centre_id, s.slot_date) as total_in_queue
from bookings b
join slots s on s.id = b.slot_id
where b.procurement_stage in ('booked', 'checked_in', 'quality_check', 'weighed');

-- book_slot RPC (race-condition-safe)
create or replace function book_slot(
  p_farmer_id uuid,
  p_slot_id uuid,
  p_grain_type text,
  p_estimated_quantity_kg numeric
) returns bookings as $$
declare
  v_slot slots%rowtype;
  v_booking bookings;
begin
  select * into v_slot from slots where id = p_slot_id for update;

  if v_slot.booked_count >= v_slot.capacity then
    raise exception 'SLOT_FULL';
  end if;

  if v_slot.is_active = false then
    raise exception 'SLOT_INACTIVE';
  end if;

  update slots set booked_count = booked_count + 1 where id = p_slot_id;

  insert into bookings (farmer_id, centre_id, slot_id, grain_type, estimated_quantity_kg, booking_reference)
  values (
    p_farmer_id, v_slot.centre_id, p_slot_id, p_grain_type, p_estimated_quantity_kg,
    'GRN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('booking_ref_seq')::text, 6, '0')
  )
  returning * into v_booking;

  -- Log initial status
  insert into booking_status_log (booking_id, changed_by, old_stage, new_stage)
  values (v_booking.id, p_farmer_id, null, 'booked');

  return v_booking;
end;
$$ language plpgsql security definer;

-- update_booking_stage RPC
create or replace function update_booking_stage(
  p_booking_id uuid,
  p_new_stage procurement_stage,
  p_staff_id uuid,
  p_actual_quantity_kg numeric default null,
  p_payment_amount numeric default null
) returns bookings as $$
declare
  v_booking bookings;
  v_old_stage procurement_stage;
  v_caller_role user_role;
  v_caller_centre uuid;
begin
  -- Authorization check
  select role, assigned_centre_id into v_caller_role, v_caller_centre
  from profiles where id = auth.uid();

  if v_caller_role = 'farmer' then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_booking from bookings where id = p_booking_id for update;

  if v_caller_role = 'staff' and v_booking.centre_id != v_caller_centre then
    raise exception 'FORBIDDEN';
  end if;

  v_old_stage := v_booking.procurement_stage;

  update bookings set
    procurement_stage = p_new_stage,
    actual_quantity_kg = coalesce(p_actual_quantity_kg, actual_quantity_kg),
    payment_amount = coalesce(p_payment_amount, payment_amount),
    payment_stage = case when p_new_stage = 'procured' then 'pending'::payment_stage else payment_stage end,
    checked_in_at = case when p_new_stage = 'checked_in' then now() else checked_in_at end,
    completed_at = case when p_new_stage in ('procured','rejected') then now() else completed_at end,
    cancelled_at = case when p_new_stage in ('cancelled','no_show') then now() else cancelled_at end
  where id = p_booking_id
  returning * into v_booking;

  insert into booking_status_log (booking_id, changed_by, old_stage, new_stage)
  values (p_booking_id, p_staff_id, v_old_stage::text, p_new_stage::text);

  perform pg_notify('booking_stage_changed', json_build_object(
    'booking_id', p_booking_id, 'new_stage', p_new_stage
  )::text);

  return v_booking;
end;
$$ language plpgsql security definer;

-- Generate slots from templates for next N days
create or replace function generate_slots_from_templates(p_days_ahead int default 14)
returns void as $$
declare
  v_template slot_templates%rowtype;
  v_date date;
begin
  for v_template in select * from slot_templates where is_active = true loop
    for i in 0..p_days_ahead loop
      v_date := current_date + i;
      if extract(dow from v_date)::int = v_template.day_of_week then
        insert into slots (centre_id, slot_date, start_time, end_time, capacity)
        values (v_template.centre_id, v_date, v_template.start_time, v_template.end_time, v_template.capacity)
        on conflict (centre_id, slot_date, start_time) do nothing;
      end if;
    end loop;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- RLS Policies
-- ============================================================

alter table profiles enable row level security;
alter table centres enable row level security;
alter table slots enable row level security;
alter table slot_templates enable row level security;
alter table bookings enable row level security;
alter table booking_status_log enable row level security;
alter table notifications enable row level security;

-- Helper function to get current user role
create or replace function get_my_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_centre()
returns uuid as $$
  select assigned_centre_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Profiles
create policy "Users can read own profile" on profiles
  for select using (id = auth.uid());
create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());
create policy "Admin reads all profiles" on profiles
  for select using (get_my_role() = 'admin');
create policy "Admin updates all profiles" on profiles
  for update using (get_my_role() = 'admin');
create policy "Users can insert own profile" on profiles
  for insert with check (id = auth.uid());
create policy "Staff reads centre farmer profiles" on profiles
  for select using (get_my_role() = 'staff');

-- Centres
create policy "Anyone can view active centres" on centres
  for select using (is_active = true);
create policy "Admin manages centres" on centres
  for all using (get_my_role() = 'admin');

-- Slots
create policy "Anyone can view active slots" on slots
  for select using (is_active = true);
create policy "Staff manages own centre slots" on slots
  for all using (get_my_role() = 'staff' and centre_id = get_my_centre() or get_my_role() = 'admin');

-- Slot templates
create policy "Staff manages own centre templates" on slot_templates
  for all using (get_my_role() = 'staff' and centre_id = get_my_centre() or get_my_role() = 'admin');
create policy "Anyone can view slot templates" on slot_templates
  for select using (true);

-- Bookings
create policy "Farmers read own bookings" on bookings
  for select using (farmer_id = auth.uid());
create policy "Farmers insert own bookings" on bookings
  for insert with check (farmer_id = auth.uid());
create policy "Farmers cancel own bookings" on bookings
  for update using (farmer_id = auth.uid() and procurement_stage in ('booked'));
create policy "Staff manages centre bookings" on bookings
  for all using (get_my_role() = 'staff' and centre_id = get_my_centre());
create policy "Admin manages all bookings" on bookings
  for all using (get_my_role() = 'admin');

-- Booking status log
create policy "Farmers read own booking logs" on booking_status_log
  for select using (
    exists (select 1 from bookings where id = booking_id and farmer_id = auth.uid())
  );
create policy "Staff manages centre booking logs" on booking_status_log
  for all using (get_my_role() in ('staff', 'admin'));

-- Notifications
create policy "Farmers read own notifications" on notifications
  for select using (farmer_id = auth.uid());
create policy "Farmers update own notifications" on notifications
  for update using (farmer_id = auth.uid());
create policy "Staff and admin manage notifications" on notifications
  for all using (get_my_role() in ('staff', 'admin'));

-- ============================================================
-- Seed Data (3 test centres)
-- ============================================================

insert into centres (name, code, address, district, state, latitude, longitude, grain_types) values
  ('Jodhpur Main Procurement Centre', 'JDH-01', 'Station Road, Near Bus Stand, Jodhpur', 'Jodhpur', 'Rajasthan', 26.2389, 73.0243, '{wheat,rice,bajra}'),
  ('Jaipur North Procurement Centre', 'JAI-01', 'Sikar Road, Near Agricultural Market, Jaipur', 'Jaipur', 'Rajasthan', 26.9124, 75.7873, '{wheat,rice}'),
  ('Bikaner Grain Centre', 'BKN-01', 'Ganga Shahar Road, Bikaner', 'Bikaner', 'Rajasthan', 28.0229, 73.3119, '{wheat,bajra,mustard}');

-- Slot templates for each centre (Mon-Sat, 3 windows per day)
insert into slot_templates (centre_id, day_of_week, start_time, end_time, capacity)
select c.id, d.dow, t.start_t::time, t.end_t::time, t.cap
from centres c
cross join (values (1),(2),(3),(4),(5),(6)) as d(dow)
cross join (values
  ('08:00','11:00', 20),
  ('11:00','14:00', 20),
  ('14:00','17:00', 15)
) as t(start_t, end_t, cap);

-- Generate slots for next 14 days
select generate_slots_from_templates(14);
