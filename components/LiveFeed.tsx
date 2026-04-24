'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Package,
  Route,
  Shield,
  Activity,
  Bell,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export interface FeedItem {
  id: string
  type: 'alert' | 'update' | 'reroute' | 'prediction' | 'system'
  title: string
  message: string
  timestamp: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

const typeConfig = {
  alert: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-l-amber-500' },
  update: { icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-l-blue-500' },
  reroute: { icon: Route, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-l-purple-500' },
  prediction: { icon: Shield, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-l-cyan-500' },
  system: { icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
}

interface LiveFeedProps {
  items: FeedItem[]
  className?: string
  maxItems?: number
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return time.toLocaleDateString()
}

export function LiveFeed({ items, className, maxItems = 20 }: LiveFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const displayItems = items.slice(0, maxItems)

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="status-dot bg-emerald-500" />
        <span className="text-sm font-semibold">Live Activity</span>
        <span className="text-xs text-muted-foreground ml-auto">{items.length} events</span>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-2 space-y-1.5">
          <AnimatePresence initial={false}>
            {displayItems.map((item, index) => {
              const config = typeConfig[item.type] || typeConfig.system
              const Icon = config.icon

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.02 }}
                  className={cn(
                    'p-2.5 rounded-md border-l-2 transition-colors hover:bg-accent/50',
                    config.border,
                    config.bg
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', config.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  )
}
