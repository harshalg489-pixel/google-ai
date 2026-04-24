'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorldMap } from '@/components/WorldMap'
import { LiveFeed, FeedItem } from '@/components/LiveFeed'
import { Anchor, Plane, Train, Truck } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Shipment, Alert } from '@/types'

const transportIcons = { sea: Anchor, air: Plane, rail: Train, truck: Truck }
const itemV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

const trendData = [
  { time: '00:00', onTime: 85, atRisk: 12 },
  { time: '04:00', onTime: 87, atRisk: 10 },
  { time: '08:00', onTime: 86, atRisk: 11 },
  { time: '12:00', onTime: 88, atRisk: 9 },
  { time: '16:00', onTime: 87, atRisk: 10 },
  { time: '20:00', onTime: 89, atRisk: 8 },
  { time: 'Now', onTime: 87.3, atRisk: 9.7 },
]

interface Props {
  shipments: Shipment[]
  alerts: Alert[]
}

export function OverviewSection({ shipments, alerts }: Props) {
  const feedItems: FeedItem[] = alerts.map(a => ({
    id: a.id,
    type: a.alert_type === 'weather' ? 'alert' : a.alert_type === 'reroute' ? 'reroute' : 'update',
    title: a.title,
    message: a.message,
    timestamp: a.created_at,
    severity: a.severity as any,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* World Map */}
        <motion.div variants={itemV} className="lg:col-span-3">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Global Shipment Tracking</CardTitle>
                <CardDescription>Real-time positions across all corridors</CardDescription>
              </div>
              <div className="flex gap-2">
                {Object.entries(transportIcons).map(([mode, Icon]) => (
                  <Badge key={mode} variant="outline" className="gap-1 text-xs">
                    <Icon className="w-3 h-3" />
                    {shipments.filter(s => s.transportMode === mode).length}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[420px]">
                <WorldMap shipments={shipments} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Feed */}
        <motion.div variants={itemV}>
          <Card className="glass-card h-[500px] overflow-hidden">
            <LiveFeed items={feedItems} />
          </Card>
        </motion.div>
      </div>

      {/* Performance Trends */}
      <motion.div variants={itemV}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Performance Trends (24h)</CardTitle>
            <CardDescription>Supply chain efficiency over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area type="monotone" dataKey="onTime" stroke="#10b981" fillOpacity={1} fill="url(#colorOnTime)" name="On Time %" />
                  <Area type="monotone" dataKey="atRisk" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAtRisk)" name="At Risk %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
