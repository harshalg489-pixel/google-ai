import axios from 'axios'
import type { Shipment, Alert, KPIData, AnalyticsData, RouteOptimization, DisruptionPrediction } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// Mock data for hackathon demo
const mockShipments: Shipment[] = [
  {
    id: '1',
    trackingNumber: 'SC-2024-001',
    carrier: 'Maersk Line',
    originName: 'Shanghai, China',
    originLat: 31.2304,
    originLon: 121.4737,
    destinationName: 'Los Angeles, USA',
    destinationLat: 34.0522,
    destinationLon: -118.2437,
    currentStatus: 'in_transit',
    riskLevel: 'high',
    riskScore: 78,
    plannedEta: '2024-04-25T10:00:00Z',
    transportMode: 'sea',
    cargoType: 'Electronics',
    weight: 25000,
    value: 2500000,
    weatherConditions: {
      temperature: 25,
      conditions: 'Stormy',
      windSpeed: 45,
      visibility: 2000,
      severeWeatherAlert: true
    },
    portCongestion: {
      portName: 'Port of Los Angeles',
      congestionLevel: 'high',
      averageWaitTime: 48,
      vesselCount: 85
    }
  },
  {
    id: '2',
    trackingNumber: 'SC-2024-002',
    carrier: 'DHL Aviation',
    originName: 'Frankfurt, Germany',
    originLat: 50.1109,
    originLon: 8.6821,
    destinationName: 'New York, USA',
    destinationLat: 40.7128,
    destinationLon: -74.0060,
    currentStatus: 'in_transit',
    riskLevel: 'low',
    riskScore: 22,
    plannedEta: '2024-04-19T18:30:00Z',
    transportMode: 'air',
    cargoType: 'Pharmaceuticals',
    weight: 5000,
    value: 8000000
  },
  {
    id: '3',
    trackingNumber: 'SC-2024-003',
    carrier: 'Union Pacific',
    originName: 'Chicago, USA',
    originLat: 41.8781,
    originLon: -87.6298,
    destinationName: 'Dallas, USA',
    destinationLat: 32.7767,
    destinationLon: -96.7970,
    currentStatus: 'delayed',
    riskLevel: 'medium',
    riskScore: 55,
    plannedEta: '2024-04-20T08:00:00Z',
    transportMode: 'rail',
    cargoType: 'Automotive Parts',
    weight: 15000,
    value: 1200000
  },
  {
    id: '4',
    trackingNumber: 'SC-2024-004',
    carrier: 'FedEx Freight',
    originName: 'Detroit, USA',
    originLat: 42.3314,
    originLon: -83.0458,
    destinationName: 'Toronto, Canada',
    destinationLat: 43.6532,
    destinationLon: -79.3832,
    currentStatus: 'at_risk',
    riskLevel: 'critical',
    riskScore: 92,
    plannedEta: '2024-04-19T14:00:00Z',
    transportMode: 'truck',
    cargoType: 'Medical Supplies',
    weight: 2000,
    value: 500000
  },
  {
    id: '5',
    trackingNumber: 'SC-2024-005',
    carrier: 'COSCO Shipping',
    originName: 'Singapore',
    originLat: 1.3521,
    originLon: 103.8198,
    destinationName: 'Rotterdam, Netherlands',
    destinationLat: 51.9244,
    destinationLon: 4.4777,
    currentStatus: 'rerouted',
    riskLevel: 'medium',
    riskScore: 45,
    plannedEta: '2024-04-28T06:00:00Z',
    transportMode: 'sea',
    cargoType: 'Raw Materials',
    weight: 50000,
    value: 1800000
  }
]

const mockAlerts: Alert[] = [
  {
    id: 'a1',
    shipment_id: '1',
    alert_type: 'weather',
    severity: 'critical',
    title: 'Severe Weather Detected',
    message: 'Storm system in Pacific Ocean may delay shipment by 24-48 hours',
    is_acknowledged: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    recommended_action: 'Consider rerouting through Port of Oakland'
  },
  {
    id: 'a2',
    shipment_id: '4',
    alert_type: 'delay',
    severity: 'high',
    title: 'Border Crossing Delay',
    message: 'Expected 6-hour delay at Ambassador Bridge due to customs inspection',
    is_acknowledged: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    recommended_action: 'Expedite customs documentation'
  },
  {
    id: 'a3',
    shipment_id: '5',
    alert_type: 'reroute',
    severity: 'medium',
    title: 'Route Optimized',
    message: 'AI system detected faster route via Suez Canal alternative',
    is_acknowledged: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    recommended_action: 'Monitor new route performance'
  }
]

const mockKPIData: KPIData = {
  totalShipments: 1247,
  activeShipments: 892,
  onTimePercentage: 87.3,
  atRiskShipments: 47,
  averageTransitTime: 5.2,
  costEfficiency: 94.1,
  co2Emissions: 2847,
  reroutedShipments: 23
}

// API implementations with mock data
export const shipmentsApi = {
  getAll: async (params?: { status?: string[]; pageSize?: number }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    let filtered = [...mockShipments]
    if (params?.status) {
      filtered = filtered.filter(s => params.status?.includes(s.currentStatus))
    }

    return { items: filtered.slice(0, params?.pageSize || 50), total: filtered.length }
  },

  getById: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 200))
    return mockShipments.find(s => s.id === id) || null
  },

  getRisk: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 150))
    const shipment = mockShipments.find(s => s.id === id)
    return { riskScore: shipment?.riskScore || 0, factors: ['Weather', 'Port congestion'] }
  },

  reroute: async (id: string, request: { newRouteId: string; reason: string }) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, message: 'Shipment rerouted successfully' }
  },
}

export const alertsApi = {
  getAll: async (params?: { shipmentId?: string; severity?: string[]; acknowledged?: boolean; limit?: number }) => {
    await new Promise(resolve => setTimeout(resolve, 200))

    let filtered = [...mockAlerts]
    if (params?.shipmentId) {
      filtered = filtered.filter(a => a.shipment_id === params.shipmentId)
    }
    if (params?.severity) {
      filtered = filtered.filter(a => params.severity?.includes(a.severity))
    }
    if (params?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.is_acknowledged === params.acknowledged)
    }

    return filtered.slice(0, params?.limit || 50)
  },

  acknowledge: async (id: string, acknowledgedBy: string) => {
    await new Promise(resolve => setTimeout(resolve, 150))
    const alert = mockAlerts.find(a => a.id === id)
    if (alert) alert.is_acknowledged = true
    return { success: true }
  },
}

export const analyticsApi = {
  getKPI: async () => {
    await new Promise(resolve => setTimeout(resolve, 250))
    return mockKPIData
  },

  getTrends: async (metric: string, period: string) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [65, 78, 82, 75, 88, 92, 87]
    }
  },
}

export const predictionApi = {
  getDisruptionPredictions: async (): Promise<DisruptionPrediction[]> => {
    await new Promise(resolve => setTimeout(resolve, 400))
    return [
      {
        shipmentId: '1',
        probability: 0.85,
        predictedDelay: 36,
        factors: ['Severe weather', 'Port congestion', 'High traffic'],
        recommendedActions: ['Reroute to alternate port', 'Expedite customs clearance', 'Increase buffer time'],
        severity: 'high'
      },
      {
        shipmentId: '4',
        probability: 0.92,
        predictedDelay: 8,
        factors: ['Border delay', 'Customs inspection', 'Documentation issues'],
        recommendedActions: ['Pre-clear customs', 'Use trusted trader program'],
        severity: 'critical'
      }
    ]
  },

  getOptimizedRoute: async (shipmentId: string): Promise<RouteOptimization> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      originalRoute: [
        { lat: 31.2304, lon: 121.4737, name: 'Shanghai', type: 'origin' },
        { lat: 34.0522, lon: -118.2437, name: 'Los Angeles', type: 'destination' }
      ],
      optimizedRoute: [
        { lat: 31.2304, lon: 121.4737, name: 'Shanghai', type: 'origin' },
        { lat: 37.8044, lon: -122.2712, name: 'Oakland', type: 'port' },
        { lat: 34.0522, lon: -118.2437, name: 'Los Angeles', type: 'destination' }
      ],
      timeSavings: 18,
      costSavings: 12500,
      riskReduction: 65
    }
  }
}

export default api
