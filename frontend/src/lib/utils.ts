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

export function resolveImageUrl(url?: string | null): string {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url)
      if (typeof window !== 'undefined' && (parsed.hostname === '3ld.com.ar' || parsed.hostname === 'sistema.3ld.com.ar')) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`
      }
    } catch {}
    return url
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${cleanPath}`
  }
  return cleanPath
}
