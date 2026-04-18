import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${Math.round(hours)}h`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  if (remainingHours === 0) {
    return `${days}d`
  }
  return `${days}d ${remainingHours}h`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
    critical: 'text-violet-400',
  }
  return colors[level.toLowerCase()] || 'text-gray-400'
}

export function getRiskBgColor(level: string): string {
  const colors: Record<string, string> = {
    low: 'bg-emerald-500/20',
    medium: 'bg-amber-500/20',
    high: 'bg-red-500/20',
    critical: 'bg-violet-500/20',
  }
  return colors[level.toLowerCase()] || 'bg-gray-500/20'
}

export function getRiskBorderColor(level: string): string {
  const colors: Record<string, string> = {
    low: 'border-emerald-500/30',
    medium: 'border-amber-500/30',
    high: 'border-red-500/30',
    critical: 'border-violet-500/30',
  }
  return colors[level.toLowerCase()] || 'border-gray-500/30'
}

export function getTransportIcon(mode: string): string {
  const icons: Record<string, string> = {
    sea: 'Ship',
    air: 'Plane',
    rail: 'Train',
    truck: 'Truck',
  }
  return icons[mode.toLowerCase()] || 'Package'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
