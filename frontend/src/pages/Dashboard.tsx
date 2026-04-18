import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Activity,
  MapPin,
  Users
} from 'lucide-react'
import { analyticsApi, alertsApi, shipmentsApi } from '../lib/api'
import { useDashboardStore, type KPIData } from '../store/dashboardStore'
import { useShipmentStore } from '../store/shipmentStore'
import { useWebSocketStore } from '../store/websocketStore'
import KPICard from '../components/KPICard'
import ShipmentMap from '../components/ShipmentMap'
import AlertsPanel from '../components/AlertsPanel'
import RiskChart from '../components/RiskChart'
import ChatAssistant from '../components/ChatAssistant'
import { cn, formatCurrency, formatDuration } from '../lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function Dashboard() {
  const { kpiData, setKPIData } = useDashboardStore()
  const { setShipments } = useShipmentStore()
  const { lastMessage } = useWebSocketStore()
  const [recentAlerts, setRecentAlerts] = useState([])

  const { data: kpiResponse, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi'],
    queryFn: analyticsApi.getKPI,
    refetchInterval: 30000,
  })

  const { data: shipmentsResponse } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.getAll({ pageSize: 50 }),
    refetchInterval: 30000,
  })

  const ALERTS_LIMIT = 20;

  const { data: alertsResponse } = useQuery({
    queryKey: ['alerts', ALERTS_LIMIT],
    queryFn: () => alertsApi.getAll({ limit: ALERTS_LIMIT }),
    refetchInterval: 10000,
  })

  useEffect(() => {
    if (kpiResponse) {
      setKPIData(kpiResponse)
    }
  }, [kpiResponse, setKPIData])

  useEffect(() => {
    if (shipmentsResponse?.items) {
      setShipments(shipmentsResponse.items)
    }
  }, [shipmentsResponse, setShipments])

  useEffect(() => {
    if (alertsResponse) {
      setRecentAlerts(alertsResponse)
    }
  }, [alertsResponse])

  useEffect(() => {
    if (lastMessage?.type === 'shipment:update') {
      // Handle real-time updates
    }
  }, [lastMessage])

  const kpiCards = kpiResponse ? [
    {
      title: 'Active Shipments',
      value: kpiResponse.activeShipments.toLocaleString(),
      change: 12.5,
      trend: 'up' as const,
      icon: <Package className="w-5 h-5" />,
      color: 'blue' as const,
      subtitle: `${kpiResponse.totalShipments} total tracked`
    },
    {
      title: 'On-Time Performance',
      value: `${kpiResponse.onTimePercentage}%`,
      change: -2.3,
      trend: 'down' as const,
      icon: <Clock className="w-5 h-5" />,
      color: 'emerald' as const,
      subtitle: `${kpiResponse.delayedShipments} delayed`
    },
    {
      title: 'At-Risk Shipments',
      value: kpiResponse.atRiskShipments.toString(),
      change: 8.1,
      trend: 'up' as const,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'red' as const,
      subtitle: `${kpiResponse.criticalAlerts} critical alerts`
    },
    {
      title: 'ETA Accuracy',
      value: `${kpiResponse.avgEtaAccuracy}%`,
      change: 5.4,
      trend: 'up' as const,
      icon: <Activity className="w-5 h-5" />,
      color: 'violet' as const,
      subtitle: `${kpiResponse.avgDelayProbability}% delay probability`
    },
    {
      title: 'Active Disruptions',
      value: kpiResponse.activeDisruptions.toString(),
      change: -15.2,
      trend: 'down' as const,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'amber' as const,
      subtitle: `${kpiResponse.totalAlerts24h} alerts today`
    },
    {
      title: 'Cost Savings',
      value: formatCurrency(kpiResponse.costSavingsOptimization),
      change: 23.8,
      trend: 'up' as const,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'emerald' as const,
      subtitle: 'From route optimization'
    },
  ] : []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Real-time supply chain monitoring and AI-powered insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Generate Report
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiLoading ? (
          [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="h-32 bg-card border border-border rounded-xl animate-pulse"
            />
          ))
        ) : (
          kpiCards.map((kpi, i) => (
            <KPICard key={kpi.title} {...kpi} delay={i * 0.1} />
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Global Shipment Tracking</h2>
              <div className="flex items-center gap-2">
                <button className="text-xs px-3 py-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  Heatmap
                </button>
                <button className="text-xs px-3 py-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  Live Routes
                </button>
              </div>
            </div>
            <ShipmentMap height="400px" showHeatmap={true} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Risk Distribution</h2>
              <button className="text-xs text-primary hover:underline">View Details</button>
            </div>
            <RiskChart type="distribution" height={250} />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Risk Trend (7 Days)</h2>
            </div>
            <RiskChart type="timeline" height={200} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AlertsPanel alerts={recentAlerts.slice(0, 10)} compact={true} />
        </motion.div>
      </div>

      <ChatAssistant />
    </motion.div>
  )
}
