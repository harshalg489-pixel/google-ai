import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react'
import { useWebSocketStore } from '../store/websocketStore'
import { cn } from '../lib/utils'

const notifications = [
  {
    id: 1,
    type: 'alert',
    title: 'High congestion at Port of Singapore',
    message: '3 shipments affected',
    time: '2 min ago',
    severity: 'high'
  },
  {
    id: 2,
    type: 'success',
    title: 'Route optimization complete',
    message: 'Saved 14 hours on SC-2024-8842',
    time: '15 min ago',
    severity: 'low'
  },
  {
    id: 3,
    type: 'info',
    title: 'Weather advisory',
    message: 'Typhoon approaching Taiwan Strait',
    time: '1 hour ago',
    severity: 'medium'
  }
]

export default function Header() {
  const [isDark, setIsDark] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const { isConnected } = useWebSocketStore()

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search shipments, routes, or alerts..."
            className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-emerald-500' : 'bg-red-500'
          )} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {isDark ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-muted rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-medium">Notifications</h3>
                  <button className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {notification.type === 'alert' && (
                          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                        )}
                        {notification.type === 'success' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                        )}
                        {notification.type === 'info' && (
                          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="flex items-center gap-2 pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">JD</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
