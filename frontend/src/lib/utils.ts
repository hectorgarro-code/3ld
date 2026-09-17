import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

function toDate(date: string | Date): Date {
  if (typeof date === 'string') {
    return parseISO(date)
  }
  return date
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return '-'
  return format(toDate(date), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date?: string | Date | null): string {
  if (!date) return '-'
  return format(toDate(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function timeAgo(date?: string | Date | null): string {
  if (!date) return '-'
  return formatDistanceToNow(toDate(date), { addSuffix: true, locale: es })
}
