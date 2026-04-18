import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Bell,
  Filter,
  ChevronRight,
  Zap
} from 'lucide-react'
import { cn } from '../lib/utils'
import { alertsApi } from '../lib/api'

interface Alert {
  id: string
  shipment_id?: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  is_acknowledged: boolean
  created_at: string
  recommended_action?: string
}

interface AlertsPanelProps {
  alerts: Alert[]
  onAcknowledge?: (id: string) => void
  compact?: boolean
}

const severityConfig = {
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  medium: { icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  high: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  critical: { icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
}

export default function AlertsPanel({ alerts, onAcknowledge, compact = false }: AlertsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'unacknowledged'>('all')
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'critical') return alert.severity === 'critical'
    if (filter === 'unacknowledged') return !alert.is_acknowledged
    return true
  })

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id)
    try {
      await alertsApi.acknowledge(id, 'current-user')
      onAcknowledge?.(id)
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setAcknowledging(null)
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAlerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity]
            const Icon = config.icon

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  'p-3 rounded-lg border transition-all',
                  config.bg,
                  config.border,
                  !alert.is_acknowledged && 'ring-1 ring-inset'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-4 h-4 mt-0.5', config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(alert.created_at)}
                      </span>
                      {!alert.is_acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledging === alert.id}
                          className="text-xs text-primary hover:underline"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm">No active alerts</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Live Alerts</h2>
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
            {alerts.filter(a => !a.is_acknowledged).length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
              filter === 'all' ? 'bg-muted' : 'hover:bg-muted/50'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
              filter === 'critical' ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-muted/50'
            )}
          >
            Critical
          </button>
          <button
            onClick={() => setFilter('unacknowledged')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
              filter === 'unacknowledged' ? 'bg-muted' : 'hover:bg-muted/50'
            )}
          >
            Unread
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-auto">
        <AnimatePresence>
          {filteredAlerts.map((alert, index) => {
            const config = severityConfig[alert.severity]
            const Icon = config.icon

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                  !alert.is_acknowledged && 'bg-muted/10'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-2 rounded-lg', config.bg)}>
                    <Icon className={cn('w-5 h-5', config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full shrink-0',
                        config.bg,
                        config.color
                      )}>
                        {alert.severity}
                      </span>
                    </div>

                    {alert.recommended_action && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Recommended Action</p>
                        <p className="text-sm">{alert.recommended_action}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatTime(alert.created_at)}</span>
                        <span>•</span>
                        <span className="capitalize">{alert.alert_type}</span>
                      </div>

                      {!alert.is_acknowledged ? (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledging === alert.id}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No alerts match your filters</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
