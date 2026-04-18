import { create } from 'zustand'

export interface KPIData {
  totalShipments: number
  activeShipments: number
  onTimePercentage: number
  delayedShipments: number
  atRiskShipments: number
  avgEtaAccuracy: number
  avgDelayProbability: number
  activeDisruptions: number
  totalAlerts24h: number
  criticalAlerts: number
  costSavingsOptimization: number
  trendDirection: 'up' | 'down' | 'stable'
}

interface DashboardState {
  kpiData: KPIData | null
  isLoading: boolean
  selectedTimeRange: string
  setKPIData: (data: KPIData) => void
  setLoading: (loading: boolean) => void
  setTimeRange: (range: string) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  kpiData: null,
  isLoading: false,
  selectedTimeRange: '24h',
  setKPIData: (data) => set({ kpiData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setTimeRange: (range) => set({ selectedTimeRange: range }),
}))
