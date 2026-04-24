'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Package, AlertTriangle, TrendingUp, Clock, RefreshCw,
  Leaf, DollarSign, RotateCw, Activity
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { shipmentsApi, alertsApi, analyticsApi, predictionApi } from '@/lib/api'
import { useShipmentStore, useDashboardStore } from '@/lib/store'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { Sidebar, SidebarSection } from '@/components/Sidebar'
import { OverviewSection } from '@/components/sections/OverviewSection'
import { ShipmentsSection } from '@/components/sections/ShipmentsSection'
import { PredictionsSection } from '@/components/sections/PredictionsSection'
import { AnalyticsSection } from '@/components/sections/AnalyticsSection'
import { cn } from '@/lib/utils'

const containerV = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export default function Dashboard() {
  const { shipments, setShipments } = useShipmentStore()
  const { kpiData, setKPIData, activeSection, setActiveSection } = useDashboardStore()
  const [predictions, setPredictions] = useState<any[]>([])
  const queryClient = useQueryClient()

  const { data: shipmentsData } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.getAll({ pageSize: 10 }),
    refetchInterval: 30000,
  })

  const { data: kpiResponse } = useQuery({
    queryKey: ['kpi'],
    queryFn: analyticsApi.getKPI,
    refetchInterval: 30000,
  })

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.getAll({ limit: 10 }),
    refetchInterval: 10000,
  })

  const { data: predictionsData } = useQuery({
    queryKey: ['predictions'],
    queryFn: predictionApi.getDisruptionPredictions,
    refetchInterval: 60000,
  })

  useEffect(() => { if (shipmentsData?.items) setShipments(shipmentsData.items) }, [shipmentsData, setShipments])
  useEffect(() => { if (kpiResponse) setKPIData(kpiResponse) }, [kpiResponse, setKPIData])
  useEffect(() => { if (predictionsData) setPredictions(predictionsData) }, [predictionsData])

  const handleReroute = async (shipmentId: string) => {
    const opt = await predictionApi.getOptimizedRoute(shipmentId)
    alert(`Route optimized! Time savings: ${opt.timeSavings}h, Cost savings: $${opt.costSavings.toLocaleString()}`)
  }

  const alertCount = alertsData?.filter((a: any) => !a.is_acknowledged).length ?? 0

  const kpiCards = kpiData ? [
    { title: 'Active Shipments', value: kpiData.activeShipments, icon: Package, color: 'text-cyan-400', gradient: 'gradient-cyan' },
    { title: 'On-Time Rate', value: kpiData.onTimePercentage, suffix: '%', decimals: 1, icon: Clock, color: 'text-emerald-400', gradient: 'gradient-emerald' },
    { title: 'At Risk', value: kpiData.atRiskShipments, icon: AlertTriangle, color: 'text-red-400', gradient: 'gradient-rose' },
    { title: 'Cost Efficiency', value: kpiData.costEfficiency, suffix: '%', decimals: 1, icon: DollarSign, color: 'text-amber-400', gradient: 'gradient-amber' },
    { title: 'Total Shipments', value: kpiData.totalShipments, icon: TrendingUp, color: 'text-purple-400', gradient: 'gradient-purple' },
    { title: 'Avg Transit (days)', value: kpiData.averageTransitTime, decimals: 1, icon: Activity, color: 'text-blue-400', gradient: 'gradient-cyan' },
    { title: 'CO₂ (tons)', value: kpiData.co2Emissions, icon: Leaf, color: 'text-green-400', gradient: 'gradient-emerald' },
    { title: 'Rerouted', value: kpiData.reroutedShipments, icon: RotateCw, color: 'text-violet-400', gradient: 'gradient-purple' },
  ] : []

  return (
    <div className="flex min-h-screen bg-background grid-pattern">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} alertCount={alertCount} />

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur border-t border-border">
        <div className="flex justify-around py-2">
          {(['overview','shipments','predictions','analytics'] as SidebarSection[]).map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={cn('p-2 rounded-lg text-xs capitalize', activeSection === s ? 'text-primary bg-primary/10' : 'text-muted-foreground')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <motion.div variants={containerV} initial="hidden" animate="visible" className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div variants={itemV} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Supply Chain <span className="text-primary">Command Center</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Real-time monitoring & AI-powered disruption prediction</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </Badge>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => queryClient.invalidateQueries()}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </motion.div>

          {/* KPI Grid */}
          <motion.div variants={itemV} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiCards.map((kpi, i) => (
              <Card key={i} className="glass-card card-lift overflow-hidden group">
                <CardContent className="p-4 relative">
                  <div className={cn('absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity', kpi.gradient)} />
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                    <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                  </div>
                  <AnimatedCounter value={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} className="text-2xl font-bold" />
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Active Section Content */}
          <motion.div variants={itemV}>
            {activeSection === 'overview' && <OverviewSection shipments={shipments} alerts={alertsData || []} />}
            {activeSection === 'shipments' && <ShipmentsSection shipments={shipments} onReroute={handleReroute} />}
            {activeSection === 'predictions' && <PredictionsSection predictions={predictions} />}
            {activeSection === 'analytics' && <AnalyticsSection />}
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemV} className="text-center pt-6 pb-4">
            <div className="h-px w-48 mx-auto mb-4 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-primary">LogiXQ AI Engine</span> • Smart Supply Chain Hackathon
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
