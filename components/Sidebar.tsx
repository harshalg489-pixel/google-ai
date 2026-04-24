'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  Zap,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type SidebarSection = 'overview' | 'shipments' | 'predictions' | 'analytics'

interface SidebarProps {
  activeSection: SidebarSection
  onSectionChange: (section: SidebarSection) => void
  alertCount?: number
}

const navItems = [
  { id: 'overview' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'shipments' as const, label: 'Shipments', icon: Package },
  { id: 'predictions' as const, label: 'AI Predictions', icon: Zap },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
]

export function Sidebar({ activeSection, onSectionChange, alertCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border sticky top-0 z-40 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-cyan flex items-center justify-center flex-shrink-0 glow-cyan">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">
                Logi<span className="text-primary">XQ</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 whitespace-nowrap">Supply Chain AI</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                isActive
                  ? 'text-primary-foreground bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={cn('w-5 h-5 flex-shrink-0 relative z-10', isActive && 'text-primary-foreground')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="relative z-10 whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-2 pb-4 space-y-1">
        {/* Alerts Button */}
        <div
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            'text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer'
          )}
        >
          <div className="relative flex-shrink-0">
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-bold">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Alerts
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5 flex-shrink-0" /> : <ChevronLeft className="w-5 h-5 flex-shrink-0" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Status */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-1 mt-2 p-3 rounded-lg bg-accent/50 border border-border overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <div className="status-dot bg-emerald-500" />
                <span className="text-xs text-muted-foreground">System Online</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Activity className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">All services healthy</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
