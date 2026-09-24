-- Additional seed data (run after creating test user accounts)
-- Replace UUIDs with actual auth.users IDs after creating accounts
-- This file is for reference — actual seeding done via Supabase dashboard

-- Example: Insert a test admin profile (replace 'your-admin-uuid' with real UUID)
-- insert into profiles (id, full_name, phone, role) values
--   ('your-admin-uuid', 'Admin User', '+911234567890', 'admin');

-- Example: Insert a test staff profile
-- insert into profiles (id, full_name, phone, role, assigned_centre_id) values
--   ('your-staff-uuid', 'Staff User', '+919876543210', 'staff',
--    (select id from centres where code = 'JDH-01'));
