import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  Bell,
  Zap
} from 'lucide-react'
import { cn } from '../lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Shipments', href: '/shipments', icon: Package },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

const secondaryNav = [
  { name: 'Notifications', href: '#', icon: Bell, badge: 3 },
  { name: 'AI Assistant', href: '#', icon: Zap },
  { name: 'Settings', href: '#', icon: Settings },
  { name: 'Help', href: '#', icon: HelpCircle },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40"
    >
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">Supply Chain</h1>
            <p className="text-xs text-muted-foreground">Disruption Detection</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3">
        <div className="space-y-1">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Overview
          </p>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-0.5 h-6 bg-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-8 space-y-1">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            System
          </p>
          {secondaryNav.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full"
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium">System Active</span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI monitoring {Intl.NumberFormat().format(1247)} shipments
          </p>
        </div>
      </div>
    </motion.aside>
  )
}
