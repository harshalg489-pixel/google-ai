import { create } from 'zustand'

export interface Shipment {
  id: string
  trackingNumber: string
  carrier: string
  transportMode: 'sea' | 'air' | 'rail' | 'truck'
  currentStatus: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  plannedEta: string
  originName: string
  destinationName: string
  originLat: number
  originLon: number
  destinationLat: number
  destinationLon: number
}

interface ShipmentState {
  shipments: Shipment[]
  selectedShipment: Shipment | null
  filterStatus: string[]
  filterRiskLevel: string[]
  setShipments: (shipments: Shipment[]) => void
  addShipment: (shipment: Shipment) => void
  updateShipment: (id: string, updates: Partial<Shipment>) => void
  selectShipment: (shipment: Shipment | null) => void
  setFilterStatus: (status: string[]) => void
  setFilterRiskLevel: (levels: string[]) => void
}

export const useShipmentStore = create<ShipmentState>((set) => ({
  shipments: [],
  selectedShipment: null,
  filterStatus: [],
  filterRiskLevel: [],
  setShipments: (shipments) => set({ shipments }),
  addShipment: (shipment) => set((state) => ({
    shipments: [shipment, ...state.shipments]
  })),
  updateShipment: (id, updates) => set((state) => ({
    shipments: state.shipments.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
  })),
  selectShipment: (shipment) => set({ selectedShipment: shipment }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterRiskLevel: (levels) => set({ filterRiskLevel: levels }),
}))
