import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Filter,
  Search,
  ChevronDown,
  MapPin,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Route,
  FileText,
  Download,
  Ship,
  Plane,
  Train,
  Truck
} from 'lucide-react'
import { shipmentsApi } from '../lib/api'
import { useShipmentStore } from '../store/shipmentStore'
import ShipmentMap from '../components/ShipmentMap'
import AlertsPanel from '../components/AlertsPanel'
import { alertsApi } from '../lib/api'
import { cn, formatDate, formatDuration, getRiskColor, getRiskBgColor, getRiskBorderColor } from '../lib/utils'

const transportIcons = {
  sea: Ship,
  air: Plane,
  rail: Train,
  truck: Truck
}

const statusColors: Record<string, string> = {
  pending: 'bg-slate-500/20 text-slate-400',
  in_transit: 'bg-blue-500/20 text-blue-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
  delayed: 'bg-red-500/20 text-red-400',
  at_risk: 'bg-violet-500/20 text-violet-400',
  rerouted: 'bg-amber-500/20 text-amber-400',
}

export default function Shipments() {
  const { shipments, setShipments, selectedShipment, selectShipment } = useShipmentStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [riskFilter, setRiskFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'at-risk'>('all')
  const [shipmentAlerts, setShipmentAlerts] = useState([])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['shipments', selectedTab],
    queryFn: () => shipmentsApi.getAll({
      status: selectedTab === 'active' ? ['in_transit'] :
              selectedTab === 'at-risk' ? ['at_risk', 'delayed'] : undefined,
      pageSize: 50
    }),
    refetchInterval: 10000,
  })

  useEffect(() => {
    if (data?.items) {
      setShipments(data.items)
    }
  }, [data, setShipments])

  useEffect(() => {
    const fetchAlerts = async () => {
      const alerts = await alertsApi.getAll({ limit: 50 })
      setShipmentAlerts(alerts)
    }
    fetchAlerts()
  }, [])

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shipment.originName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shipment.destinationName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(shipment.currentStatus)
    const matchesRisk = riskFilter.length === 0 || riskFilter.includes(shipment.riskLevel)

    return matchesSearch && matchesStatus && matchesRisk
  })

  const stats = {
    total: shipments.length,
    active: shipments.filter(s => s.currentStatus === 'in_transit').length,
    atRisk: shipments.filter(s => ['high', 'critical'].includes(s.riskLevel)).length,
    delivered: shipments.filter(s => s.currentStatus === 'delivered').length,
  }

  const getShipmentAlerts = (shipmentId: string) => {
    return shipmentAlerts.filter(a => a.shipment_id === shipmentId)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-muted-foreground">Manage and track all your shipments in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            Map View
          </button>
          <button className="px-4 py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: stats.total, color: 'text-foreground' },
          { label: 'In Transit', value: stats.active, color: 'text-blue-400' },
          { label: 'At Risk', value: stats.atRisk, color: 'text-red-400' },
          { label: 'Delivered', value: stats.delivered, color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTab('all')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedTab === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  All Shipments
                </button>
                <button
                  onClick={() => setSelectedTab('active')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedTab === 'active' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setSelectedTab('at-risk')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedTab === 'at-risk' ? 'bg-red-500/10 text-red-400' : 'hover:bg-muted'
                  )}
                >
                  At Risk
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by tracking number, origin, or destination..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Shipment</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Route</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Risk</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">ETA</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="h-12 bg-muted rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredShipments.map((shipment) => {
                      const TransportIcon = transportIcons[shipment.transportMode] || Package
                      const alerts = getShipmentAlerts(shipment.id)

                      return (
                        <tr
                          key={shipment.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => selectShipment(shipment)}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <TransportIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{shipment.trackingNumber}</p>
                                <p className="text-sm text-muted-foreground">{shipment.carrier}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{shipment.originName}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-sm">{shipment.destinationName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium capitalize',
                              statusColors[shipment.currentStatus]
                            )}>
                              {shipment.currentStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    shipment.riskScore > 75 ? 'bg-violet-500' :
                                    shipment.riskScore > 55 ? 'bg-red-500' :
                                    shipment.riskScore > 35 ? 'bg-amber-500' : 'bg-emerald-500'
                                  )}
                                  style={{ width: `${shipment.riskScore}%` }}
                                />
                              </div>
                              <span className={cn('text-sm font-medium', getRiskColor(shipment.riskLevel))}>
                                {shipment.riskScore}
                              </span>
                              {alerts.length > 0 && (
                                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                                  {alerts.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {formatDate(shipment.plannedEta)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <Route className="w-4 h-4" />
                              </button>
                              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && filteredShipments.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No shipments found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80">
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Recent Alerts</h2>
            <AlertsPanel alerts={shipmentAlerts.slice(0, 10)} compact={true} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
