import { create } from 'zustand'

interface WebSocketState {
  isConnected: boolean
  lastMessage: any | null
  connect: () => void
  disconnect: () => void
  sendMessage: (message: any) => void
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

let ws: WebSocket | null = null

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  isConnected: false,
  lastMessage: null,

  connect: () => {
    if (ws?.readyState === WebSocket.OPEN) return

    ws = new WebSocket(`${WS_URL}/ws`)

    ws.onopen = () => {
      set({ isConnected: true })
      ws?.send(JSON.stringify({ type: 'subscribe:shipments' }))
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      set({ lastMessage: message })
    }

    ws.onclose = () => {
      set({ isConnected: false })
      setTimeout(() => get().connect(), 5000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  },

  disconnect: () => {
    ws?.close()
    ws = null
    set({ isConnected: false })
  },

  sendMessage: (message) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  },
}))
