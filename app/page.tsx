'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  Wind,
  Anchor,
  Truck,
  Plane,
  Train,
  MapPin,
  Bell,
  CheckCircle,
  RefreshCw,
  Shield,
  Zap,
  BarChart3,
  Route,
  Thermometer,
  Navigation
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { shipmentsApi, alertsApi, analyticsApi, predictionApi } from '@/lib/api'
import { useShipmentStore, useAlertStore, useDashboardStore } from '@/lib/store'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { LiveMap } from '@/components/LiveMap'

const riskColors = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
}

const statusColors = {
  in_transit: 'bg-blue-500',
  delivered: 'bg-emerald-500',
  delayed: 'bg-amber-500',
  at_risk: 'bg-red-500',
  rerouted: 'bg-purple-500',
  pending: 'bg-slate-500'
}

const transportIcons = {
  sea: Anchor,
  air: Plane,
  rail: Train,
  truck: Truck
}

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
  const { shipments, setShipments, selectedShipment, selectShipment } = useShipmentStore()
  const { kpiData, setKPIData } = useDashboardStore()
  const [predictions, setPredictions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

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
    queryFn: () => alertsApi.getAll({ limit: 5 }),
    refetchInterval: 10000,
  })

  const { data: predictionsData } = useQuery({
    queryKey: ['predictions'],
    queryFn: predictionApi.getDisruptionPredictions,
    refetchInterval: 60000,
  })

  useEffect(() => {
    if (shipmentsData?.items) {
      setShipments(shipmentsData.items)
    }
  }, [shipmentsData, setShipments])

  useEffect(() => {
    if (kpiResponse) {
      setKPIData(kpiResponse)
    }
  }, [kpiResponse, setKPIData])

  useEffect(() => {
    if (predictionsData) {
      setPredictions(predictionsData)
    }
  }, [predictionsData])

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time risk score updates
      setShipments(shipments.map(s => ({
        ...s,
        riskScore: Math.min(100, Math.max(0, s.riskScore + (Math.random() - 0.5) * 2))
      })))
    }, 5000)
    return () => clearInterval(interval)
  }, [shipments, setShipments])

  const handleReroute = async (shipmentId: string) => {
    const optimization = await predictionApi.getOptimizedRoute(shipmentId)
    alert(`Route optimized! Time savings: ${optimization.timeSavings}h, Cost savings: $${optimization.costSavings.toLocaleString()}`)
  }

  const kpiCards = kpiData ? [
    { title: 'Active Shipments', value: kpiData.activeShipments, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'On-Time %', value: `${kpiData.onTimePercentage}%`, icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'At Risk', value: kpiData.atRiskShipments, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Cost Efficiency', value: `${kpiData.costEfficiency}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ] : []

  const trendData = [
    { time: '00:00', onTime: 85, atRisk: 12, delayed: 3 },
    { time: '04:00', onTime: 87, atRisk: 10, delayed: 3 },
    { time: '08:00', onTime: 86, atRisk: 11, delayed: 3 },
    { time: '12:00', onTime: 88, atRisk: 9, delayed: 3 },
    { time: '16:00', onTime: 87, atRisk: 10, delayed: 3 },
    { time: '20:00', onTime: 89, atRisk: 8, delayed: 3 },
    { time: 'Now', onTime: 87.3, atRisk: 9.7, delayed: 3 },
  ]

  const riskDistribution = [
    { name: 'Low', value: 65, color: '#10b981' },
    { name: 'Medium', value: 20, color: '#f59e0b' },
    { name: 'High', value: 10, color: '#f97316' },
    { name: 'Critical', value: 5, color: '#ef4444' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-background p-6 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Smart Supply Chain Command Center</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Real-time logistics monitoring & AI-powered disruption prediction</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Updates
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={cn("p-3 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("w-6 h-6", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto lg:w-[400px] gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Map */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="h-[500px]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Live Shipment Tracking</CardTitle>
                    <CardDescription>Real-time positions of all active shipments</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(transportIcons).map(([mode, Icon]) => (
                      <Badge key={mode} variant="outline" className="gap-1">
                        <Icon className="w-3 h-3" />
                        {shipments.filter(s => s.transportMode === mode).length}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="h-[400px] bg-muted/50 rounded-b-lg m-0 p-0 relative overflow-hidden">
                  <LiveMap shipments={shipments} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Critical Alerts */}
            <motion.div variants={itemVariants}>
              <Card className="h-[500px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Critical Alerts
                    {(alertsData?.filter((a: any) => !a.is_acknowledged).length ?? 0) > 0 && (
                      <Badge variant="destructive">
                        {alertsData?.filter((a: any) => !a.is_acknowledged).length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {alertsData?.map((alert: any) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "p-3 rounded-lg border-l-4",
                            alert.severity === 'critical' ? 'border-l-red-500 bg-red-500/10' :
                            alert.severity === 'high' ? 'border-l-orange-500 bg-orange-500/10' :
                            'border-l-amber-500 bg-amber-500/10'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={cn(
                              "w-4 h-4 mt-0.5",
                              alert.severity === 'critical' ? 'text-red-500' :
                              alert.severity === 'high' ? 'text-orange-500' :
                              'text-amber-500'
                            )} />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{alert.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                              {alert.recommended_action && (
                                <p className="text-xs text-blue-400 mt-1">💡 {alert.recommended_action}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Performance Trends */}
          <motion.div variants={itemVariants}>
            <Card>
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
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="onTime" stroke="#10b981" fillOpacity={1} fill="url(#colorOnTime)" name="On Time %" />
                      <Area type="monotone" dataKey="atRisk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="At Risk %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="shipments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Shipments</CardTitle>
              <CardDescription>All shipments currently in transit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipments.map((shipment) => {
                  const TransportIcon = transportIcons[shipment.transportMode]
                  return (
                    <motion.div
                      key={shipment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            shipment.riskLevel === 'critical' ? 'bg-red-500/20' :
                            shipment.riskLevel === 'high' ? 'bg-orange-500/20' :
                            shipment.riskLevel === 'medium' ? 'bg-amber-500/20' :
                            'bg-emerald-500/20'
                          )}>
                            <TransportIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{shipment.trackingNumber}</p>
                              <Badge variant={
                                shipment.currentStatus === 'in_transit' ? 'default' :
                                shipment.currentStatus === 'at_risk' ? 'destructive' :
                                shipment.currentStatus === 'delayed' ? 'secondary' :
                                'outline'
                              }>
                                {shipment.currentStatus.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {shipment.originName} → {shipment.destinationName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0">
                          <div className="text-left md:text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Risk Score:</span>
                              <span className={cn(
                                "font-bold",
                                shipment.riskScore > 75 ? 'text-red-500' :
                                shipment.riskScore > 55 ? 'text-orange-500' :
                                shipment.riskScore > 35 ? 'text-amber-500' :
                                'text-emerald-500'
                              )}>{shipment.riskScore}</span>
                            </div>
                            <Progress value={shipment.riskScore} className="w-24 h-2" />
                          </div>
                          {shipment.riskLevel === 'critical' && (
                            <Button size="sm" variant="destructive" onClick={() => handleReroute(shipment.id)}>
                              <Route className="w-4 h-4 mr-1" />
                              Reroute
                            </Button>
                          )}
                        </div>
                      </div>
                      {shipment.weatherConditions?.severeWeatherAlert && (
                        <div className="mt-3 p-2 bg-red-500/10 rounded flex items-center gap-2 text-sm text-red-400">
                          <Wind className="w-4 h-4" />
                          Severe weather alert: {shipment.weatherConditions.conditions}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                AI Disruption Predictions
              </CardTitle>
              <CardDescription>Machine learning models predicting potential supply chain disruptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((pred, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "p-4 rounded-lg border-l-4",
                      pred.severity === 'critical' ? 'border-l-red-500 bg-red-500/5' :
                      pred.severity === 'high' ? 'border-l-orange-500 bg-orange-500/5' :
                      'border-l-amber-500 bg-amber-500/5'
                    )}
                  >
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3">
                          <Shield className={cn(
                            "w-5 h-5",
                            pred.severity === 'critical' ? 'text-red-500' :
                            pred.severity === 'high' ? 'text-orange-500' :
                            'text-amber-500'
                          )} />
                          <p className="font-semibold">Shipment SC-2024-00{pred.shipmentId}</p>
                          <Badge variant={pred.probability > 0.8 ? 'destructive' : 'secondary'}>
                            {(pred.probability * 100).toFixed(0)}% Risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Predicted delay: {pred.predictedDelay} hours
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {pred.factors.map((factor: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-1">AI Recommendations:</p>
                          <ul className="space-y-1">
                            {pred.recommendedActions.map((action: string, j: number) => (
                              <li key={j} className="text-sm flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full md:w-auto">
                        View Details
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Shipments by risk level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {riskDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}: {item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transport Mode Analysis</CardTitle>
                <CardDescription>Distribution by transportation type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Sea', count: 45, efficiency: 82 },
                      { name: 'Air', count: 23, efficiency: 94 },
                      { name: 'Rail', count: 18, efficiency: 88 },
                      { name: 'Truck', count: 14, efficiency: 91 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Shipments" />
                      <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <motion.div variants={itemVariants} className="text-center text-sm text-muted-foreground pt-8">
        <p>Built for Smart Supply Chain Hackathon • Real-time AI-powered logistics optimization</p>
      </motion.div>
    </motion.div>
  )
}
