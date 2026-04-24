import { create } from 'zustand'
import type { Shipment, KPIData, Alert } from '@/types'
import type { SidebarSection } from '@/components/Sidebar'

interface ShipmentState {
  shipments: Shipment[]
  selectedShipment: Shipment | null
  setShipments: (shipments: Shipment[]) => void
  selectShipment: (shipment: Shipment | null) => void
  updateShipmentStatus: (id: string, status: string) => void
}

export const useShipmentStore = create<ShipmentState>()((set) => ({
  shipments: [],
  selectedShipment: null,
  setShipments: (shipments) => set({ shipments }),
  selectShipment: (shipment) => set({ selectedShipment: shipment }),
  updateShipmentStatus: (id, status) =>
    set((state) => ({
      shipments: state.shipments.map((s) =>
        s.id === id ? { ...s, currentStatus: status as any } : s
      ),
    })),
}))

interface DashboardState {
  kpiData: KPIData | null
  activeSection: SidebarSection
  setKPIData: (data: KPIData) => void
  setActiveSection: (section: SidebarSection) => void
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  kpiData: null,
  activeSection: 'overview',
  setKPIData: (data) => set({ kpiData: data }),
  setActiveSection: (section) => set({ activeSection: section }),
}))

interface AlertState {
  alerts: Alert[]
  unreadCount: number
  setAlerts: (alerts: Alert[]) => void
  acknowledgeAlert: (id: string) => void
}

export const useAlertStore = create<AlertState>()((set) => ({
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.is_acknowledged).length,
    }),
  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, is_acknowledged: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
}))

interface PredictionState {
  predictions: any[]
  selectedPrediction: any | null
  setPredictions: (predictions: any[]) => void
  selectPrediction: (prediction: any | null) => void
}

export const usePredictionStore = create<PredictionState>()((set) => ({
  predictions: [],
  selectedPrediction: null,
  setPredictions: (predictions) => set({ predictions }),
  selectPrediction: (prediction) => set({ selectedPrediction: prediction }),
}))
