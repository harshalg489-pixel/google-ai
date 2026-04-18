import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Activity,
  MapPin,
  Clock,
  AlertTriangle,
  DollarSign
} from 'lucide-react'
import { analyticsApi, simulationApi } from '../lib/api'
import RiskChart from '../components/RiskChart'
import { cn, formatCurrency } from '../lib/utils'

const timeRanges = [
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
]

const metrics = [
  { id: 'delays', label: 'Delay Frequency', icon: Clock },
  { id: 'risk', label: 'Risk Levels', icon: AlertTriangle },
  { id: 'volume', label: 'Shipment Volume', icon: Activity },
  { id: 'alerts', label: 'Alert Count', icon: AlertTriangle },
]

export default function Analytics() {
  const [selectedRange, setSelectedRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('delays')
  const [activeTab, setActiveTab] = useState<'overview' | 'forecasts' | 'simulation'>('overview')

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['analytics-kpi'],
    queryFn: analyticsApi.getKPI,
  })

  const { data: trendsData } = useQuery({
    queryKey: ['analytics-trends', selectedMetric, selectedRange],
    queryFn: () => analyticsApi.getTrends(selectedMetric, selectedRange),
  })

  const { data: forecastsData } = useQuery({
    queryKey: ['analytics-forecasts'],
    queryFn: () => analyticsApi.getTrends('volume', '7d'),
  })

  const simulationScenarios = [
    { id: 'port_closure', label: 'Port Closure', severity: 'high', description: 'Major port closed for 48 hours' },
    { id: 'weather_event', label: 'Severe Weather', severity: 'critical', description: 'Typhoon affecting Asian shipping lanes' },
    { id: 'carrier_delay', label: 'Carrier Delay', severity: 'medium', description: 'Capacity shortage on major routes' },
  ]

  const runSimulation = async (scenarioId: string) => {
    const scenario = simulationScenarios.find(s => s.id === scenarioId)
    if (!scenario) return

    try {
      const result = await simulationApi.run({
        scenario_type: scenario.id,
        severity: scenario.severity,
        delay_hours: scenario.severity === 'critical' ? 72 :
                    scenario.severity === 'high' ? 48 : 24,
        description: scenario.description
      })

      console.log('Simulation result:', result)
    } catch (error) {
      console.error('Simulation failed:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Deep insights into your supply chain performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  selectedRange === range.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
          { id: 'simulation', label: 'What-If Simulation', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
              ))
            ) : kpiData ? (
              <>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">On-Time Rate</p>
                      <p className="text-2xl font-bold">{kpiData.onTimePercentage}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Disruptions</p>
                      <p className="text-2xl font-bold">{kpiData.activeDisruptions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ETA Accuracy</p>
                      <p className="text-2xl font-bold">{kpiData.avgEtaAccuracy}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Savings</p>
                      <p className="text-2xl font-bold">{formatCurrency(kpiData.costSavingsOptimization)}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Trend Analysis</h3>
                <div className="flex gap-2">
                  {metrics.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMetric(m.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        selectedMetric === m.id
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>              <RiskChart type="timeline" height={300} data={trendsData?.data} />
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Regional Risk Distribution</h3>
              </div>
              <RiskChart type="distribution" height={300} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'forecasts' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">AI-Powered Forecasts</h3>
          <p className="text-muted-foreground mb-6">
            Our AI models predict upcoming shipment volumes and potential disruptions based on historical patterns,
            seasonal trends, and current risk indicators.
          </p>

          <div className="space-y-4">
            {[
              { label: 'Volume Forecast (7 days)', confidence: 87, trend: 'increasing' },
              { label: 'Delay Risk Forecast', confidence: 92, trend: 'stable' },
              { label: 'Port Congestion Prediction', confidence: 78, trend: 'increasing' },
            ].map((forecast) => (
              <div key={forecast.label} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{forecast.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Model confidence: {forecast.confidence}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    forecast.trend === 'increasing' ? 'text-red-400' : 'text-emerald-400'
                  )}>
                    {forecast.trend === 'increasing' ? '↗' : '→'} {forecast.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">What-If Scenario Simulation</h3>
          <p className="text-muted-foreground mb-6">
            Run simulations to predict the impact of potential disruptions on your supply chain.
            This helps you prepare contingency plans and optimize risk mitigation strategies.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {simulationScenarios.map((scenario) => (
              <div key={scenario.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{scenario.label}</span>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    scenario.severity === 'critical' ? 'bg-violet-500/20 text-violet-400' :
                    scenario.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  )}>
                    {scenario.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{scenario.description}</p>
                <button
                  onClick={() => runSimulation(scenario.id)}
                  className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                    Run Simulation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
