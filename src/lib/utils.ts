import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatTime(time: string) {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

export const STAGE_LABELS: Record<string, string> = {
  booked: 'Booked',
  checked_in: 'Checked In',
  quality_check: 'Quality Check',
  weighed: 'Weighed',
  procured: 'Procured',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export const STAGE_COLORS: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-yellow-100 text-yellow-800',
  quality_check: 'bg-orange-100 text-orange-800',
  weighed: 'bg-purple-100 text-purple-800',
  procured: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  no_show: 'bg-gray-100 text-gray-600',
}

export const PAYMENT_LABELS: Record<string, string> = {
  not_applicable: 'N/A',
  pending: 'Payment Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
}

export const PAYMENT_COLORS: Record<string, string> = {
  not_applicable: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export const GRAIN_TYPES = ['wheat', 'rice', 'bajra', 'mustard', 'maize', 'sorghum']

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
