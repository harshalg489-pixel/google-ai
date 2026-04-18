import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  icon: React.ReactNode
  color: 'emerald' | 'amber' | 'red' | 'blue' | 'violet'
  subtitle?: string
  delay?: number
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
  },
}

export default function KPICard({
  title,
  value,
  change,
  trend = 'stable',
  icon,
  color,
  subtitle,
  delay = 0
}: KPICardProps) {
  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-xl border p-6 transition-all duration-300',
        'bg-card hover:bg-card/80',
        colors.border
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>

          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <ArrowUpRight className={cn('w-4 h-4', colors.text)} />
              ) : trend === 'down' ? (
                <ArrowDownRight className={cn('w-4 h-4', colors.text)} />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={cn('text-sm font-medium', colors.text)}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">
                vs last period
              </span>
            </div>
          )}

          {subtitle && !change && (
            <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
          )}
        </div>

        <div className={cn('p-3 rounded-xl', colors.bg)}>
          <div className={colors.text}>{icon}</div>
        </div>
      </div>

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1',
          colors.bg.replace('/10', '/30')
        )}
      >
        <div
          className={cn('h-full transition-all duration-500', colors.bg.replace('/10', ''))}
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      </div>
    </motion.div>
  )
}
