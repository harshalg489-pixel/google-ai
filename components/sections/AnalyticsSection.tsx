'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

const itemV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

const riskDist = [
  { name: 'Low', value: 65, color: '#10b981' },
  { name: 'Medium', value: 20, color: '#f59e0b' },
  { name: 'High', value: 10, color: '#f97316' },
  { name: 'Critical', value: 5, color: '#ef4444' },
]

const transportData = [
  { name: 'Sea', count: 45, efficiency: 82 },
  { name: 'Air', count: 23, efficiency: 94 },
  { name: 'Rail', count: 18, efficiency: 88 },
  { name: 'Truck', count: 14, efficiency: 91 },
]

const regionalData = [
  { region: 'Asia-Pacific', onTime: 85, risk: 35, volume: 90 },
  { region: 'Europe', onTime: 92, risk: 20, volume: 70 },
  { region: 'N. America', onTime: 88, risk: 28, volume: 75 },
  { region: 'Middle East', onTime: 78, risk: 42, volume: 45 },
  { region: 'Africa', onTime: 72, risk: 50, volume: 25 },
]

export function AnalyticsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <motion.div variants={itemV}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Shipments by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDist} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                    {riskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {riskDist.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemV}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Transport Mode Analysis</CardTitle>
            <CardDescription>Distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transportData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="oklch(0.7 0.18 195)" name="Shipments" radius={[4,4,0,0]} />
                  <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemV} className="lg:col-span-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Regional Performance</CardTitle>
            <CardDescription>On-time rates, risk levels, and volume by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={regionalData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="region" className="text-xs" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                  <Radar name="On-Time %" dataKey="onTime" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Radar name="Risk Score" dataKey="risk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                  <Radar name="Volume" dataKey="volume" stroke="oklch(0.7 0.18 195)" fill="oklch(0.7 0.18 195)" fillOpacity={0.1} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
