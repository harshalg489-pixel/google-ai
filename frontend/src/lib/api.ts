import axios from 'axios'

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

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface ShipmentFilters {
  status?: string[]
  riskLevel?: string[]
  transportMode?: string[]
}

export const shipmentsApi = {
  getAll: async (params: PaginationParams & ShipmentFilters = {}) => {
    const { data } = await api.get('/shipments', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/shipments/${id}`)
    return data
  },

  create: async (shipment: any) => {
    const { data } = await api.post('/shipments', shipment)
    return data
  },

  getRisk: async (id: string) => {
    const { data } = await api.get(`/shipments/${id}/risk`)
    return data
  },

  reroute: async (id: string, request: { newRouteId: string; reason: string }) => {
    const { data } = await api.put(`/shipments/${id}/reroute`, request)
    return data
  },
}

export const riskApi = {
  getHeatmap: async (bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number }) => {
    const { data } = await api.get('/risk/heatmap', { params: bounds })
    return data
  },
}

export const routesApi = {
  optimize: async (request: any) => {
    const { data } = await api.post('/routes/optimize', request)
    return data
  },
}

export const alertsApi = {
  getAll: async (params?: { shipmentId?: string; severity?: string[]; acknowledged?: boolean }) => {
    const { data } = await api.get('/alerts', { params })
    return data
  },

  acknowledge: async (id: string, acknowledgedBy: string) => {
    const { data } = await api.put(`/alerts/${id}/acknowledge`, null, {
      params: { acknowledged_by: acknowledgedBy }
    })
    return data
  },
}

export const analyticsApi = {
  getKPI: async () => {
    const { data } = await api.get('/analytics/kpi')
    return data
  },

  getTrends: async (metric: string, period: string) => {
    const { data } = await api.get('/analytics/trends', { params: { metric, period } })
    return data
  },
}

export const simulationApi = {
  run: async (scenario: any) => {
    const { data } = await api.post('/simulate', scenario)
    return data
  },
}

export const chatApi = {
  send: async (message: string, context?: string) => {
    const { data } = await api.post('/chat', { message, shipment_context: context })
    return data
  },
}

export default api
