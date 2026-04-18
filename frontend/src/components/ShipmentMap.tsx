import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { motion } from 'framer-motion'
import { Loader2, Layers, ZoomIn, ZoomOut } from 'lucide-react'
import { useShipmentStore } from '../store/shipmentStore'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface ShipmentsMapProps {
  height?: string
  showHeatmap?: boolean
}

export default function ShipmentMap({ height = '500px', showHeatmap = false }: ShipmentsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const { shipments } = useShipmentStore()
  const [isLoading, setIsLoading] = useState(true)
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'dark' | 'light'>('dark')

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [10, 30],
      zoom: 2,
      projection: 'globe',
    })

    map.current.on('load', () => {
      setIsLoading(false)

      if (showHeatmap && map.current) {
        map.current.addSource('heatmap', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map.current.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap',
          paint: {
            'heatmap-weight': ['get', 'intensity'],
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 255, 0)',
              0.2, 'rgb(0, 255, 255)',
              0.4, 'rgb(0, 255, 0)',
              0.6, 'rgb(255, 255, 0)',
              0.8, 'rgb(255, 0, 0)',
              1, 'rgb(128, 0, 128)'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.7
          }
        })
      }
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || shipments.length === 0) return

    markers.current.forEach(marker => marker.remove())
    markers.current = []

    shipments.forEach((shipment) => {
      const el = document.createElement('div')
      el.className = `shipment-marker shipment-${shipment.riskLevel}`

      const color = {
        low: '#10b981',
        medium: '#f59e0b',
        high: '#ef4444',
        critical: '#7c3aed'
      }[shipment.riskLevel] || '#6b7280'

      el.innerHTML = `
        <div style="
          width: 16px;
          height: 16px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 2px ${color}40;
          cursor: pointer;
          transition: transform 0.2s;
        " class="marker-dot"></div>
      `

      el.addEventListener('mouseenter', () => {
        const dot = el.querySelector('.marker-dot') as HTMLElement
        if (dot) dot.style.transform = 'scale(1.5)'
      })

      el.addEventListener('mouseleave', () => {
        const dot = el.querySelector('.marker-dot') as HTMLElement
        if (dot) dot.style.transform = 'scale(1)'
      })

      const popup = new mapboxgl.Popup({ offset: 10 }).setHTML(`
        <div class="p-2">
          <p class="font-semibold">${shipment.trackingNumber}</p>
          <p class="text-sm text-gray-400">${shipment.originName} → ${shipment.destinationName}</p>
          <p class="text-sm">Status: <span class="capitalize">${shipment.currentStatus}</span></p>
          <p class="text-sm">Risk: <span style="color: ${color}">${shipment.riskLevel}</span></p>
        </div>
      `)

      if (map.current) {
        const marker = new mapboxgl.Marker(el)
          .setLngLat([shipment.originLon, shipment.originLat])
          .setPopup(popup)
          .addTo(map.current)

        markers.current.push(marker)
      }
    })
  }, [shipments])

  const handleZoomIn = () => map.current?.zoomIn()
  const handleZoomOut = () => map.current?.zoomOut()

  const changeLayer = (layer: 'satellite' | 'dark' | 'light') => {
    const styleMap = {
      satellite: 'mapbox://styles/mapbox/satellite-v9',
      dark: 'mapbox://styles/mapbox/dark-v11',
      light: 'mapbox://styles/mapbox/light-v11'
    }
    map.current?.setStyle(styleMap[layer])
    setActiveLayer(layer)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-xl overflow-hidden border border-border bg-card"
    >
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="glass rounded-lg p-1 flex gap-1">
          {(['dark', 'light', 'satellite'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => changeLayer(layer)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeLayer === layer
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 glass rounded-lg hover:bg-muted transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 glass rounded-lg hover:bg-muted transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={mapContainer}
        style={{ height }}
        className="w-full"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 glass rounded-lg p-3">
        <p className="text-xs font-medium mb-2">Risk Level</p>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span>Critical</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
