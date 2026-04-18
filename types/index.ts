// Smart Supply Chain Types

export interface Shipment {
  id: string
  trackingNumber: string
  carrier: string
  originName: string
  originLat: number
  originLon: number
  destinationName: string
  destinationLat: number
  destinationLon: number
  currentStatus: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'at_risk' | 'rerouted'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  plannedEta: string
  actualEta?: string
  transportMode: 'sea' | 'air' | 'rail' | 'truck'
  cargoType: string
  weight: number
  value: number
  weatherConditions?: WeatherConditions
  portCongestion?: PortCongestion
}

export interface WeatherConditions {
  temperature: number
  conditions: string
  windSpeed: number
  visibility: number
  severeWeatherAlert: boolean
}

export interface PortCongestion {
  portName: string
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe'
  averageWaitTime: number
  vesselCount: number
}

export interface Alert {
  id: string
  shipment_id: string
  alert_type: 'weather' | 'congestion' | 'delay' | 'risk' | 'reroute'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  is_acknowledged: boolean
  created_at: string
  recommended_action?: string
}

export interface KPIData {
  totalShipments: number
  activeShipments: number
  onTimePercentage: number
  atRiskShipments: number
  averageTransitTime: number
  costEfficiency: number
  co2Emissions: number
  reroutedShipments: number
}

export interface RouteOptimization {
  originalRoute: RoutePoint[]
  optimizedRoute: RoutePoint[]
  timeSavings: number
  costSavings: number
  riskReduction: number
}

export interface RoutePoint {
  lat: number
  lon: number
  name: string
  type: 'origin' | 'destination' | 'waypoint' | 'port'
  estimatedArrival?: string
}

export interface DisruptionPrediction {
  shipmentId: string
  probability: number
  predictedDelay: number
  factors: string[]
  recommendedActions: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AnalyticsData {
  dailyShipments: TimeSeriesData[]
  riskDistribution: RiskDistributionData[]
  transportModeSplit: TransportModeData[]
  regionalPerformance: RegionalPerformanceData[]
  costTrends: TimeSeriesData[]
}

export interface TimeSeriesData {
  date: string
  value: number
  label?: string
}

export interface RiskDistributionData {
  level: string
  count: number
  percentage: number
}

export interface TransportModeData {
  mode: string
  count: number
  percentage: number
  avgTransitTime: number
}

export interface RegionalPerformanceData {
  region: string
  onTimeRate: number
  totalShipments: number
  avgDelay: number
}
