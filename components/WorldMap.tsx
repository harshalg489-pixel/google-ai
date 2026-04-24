'use client'

import { memo, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from 'react-simple-maps'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Shipment } from '@/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const riskColorMap: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

interface WorldMapProps {
  shipments: Shipment[]
  onShipmentClick?: (shipment: Shipment) => void
  className?: string
}

function WorldMapInner({ shipments, onShipmentClick, className }: WorldMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className={cn('relative w-full h-full overflow-hidden rounded-lg', className)}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_var(--background)_100%)] opacity-60" />

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 120,
          center: [20, 20],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rpiProperties?.name || geo.id}
                geography={geo}
                fill="oklch(0.22 0.03 255)"
                stroke="oklch(0.3 0.03 255)"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { fill: 'oklch(0.27 0.04 255)', outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {/* Route Lines */}
        {shipments.map((shipment) => (
          <Line
            key={`route-${shipment.id}`}
            from={[shipment.originLon, shipment.originLat]}
            to={[shipment.destinationLon, shipment.destinationLat]}
            stroke={riskColorMap[shipment.riskLevel] || '#3b82f6'}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="4 2"
            strokeOpacity={0.5}
          />
        ))}

        {/* Origin Markers */}
        {shipments.map((shipment) => (
          <Marker
            key={`origin-${shipment.id}`}
            coordinates={[shipment.originLon, shipment.originLat]}
          >
            <circle
              r={3}
              fill={riskColorMap[shipment.riskLevel] || '#3b82f6'}
              opacity={0.5}
            />
          </Marker>
        ))}

        {/* Destination Markers with Glow */}
        {shipments.map((shipment) => (
          <Marker
            key={`dest-${shipment.id}`}
            coordinates={[shipment.destinationLon, shipment.destinationLat]}
            onMouseEnter={() => setHoveredId(shipment.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onShipmentClick?.(shipment)}
            className="map-marker"
          >
            {/* Pulse ring for critical */}
            {shipment.riskLevel === 'critical' && (
              <>
                <circle
                  r={12}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1}
                  opacity={0.3}
                >
                  <animate
                    attributeName="r"
                    values="6;16"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </>
            )}
            <circle
              r={5}
              fill={riskColorMap[shipment.riskLevel] || '#3b82f6'}
              stroke="oklch(0.17 0.03 255)"
              strokeWidth={2}
            />
          </Marker>
        ))}
      </ComposableMap>

      {/* Hover Tooltip */}
      {hoveredId && (() => {
        const shipment = shipments.find(s => s.id === hoveredId)
        if (!shipment) return null
        return (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 z-20 p-3 rounded-lg glass-card max-w-xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: riskColorMap[shipment.riskLevel] }}
              />
              <span className="text-sm font-semibold">{shipment.trackingNumber}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {shipment.originName} → {shipment.destinationName}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs">Risk: <span className="font-bold" style={{ color: riskColorMap[shipment.riskLevel] }}>{shipment.riskScore}</span></span>
              <span className="text-xs text-muted-foreground">{shipment.carrier}</span>
            </div>
          </motion.div>
        )
      })()}
    </div>
  )
}

export const WorldMap = memo(WorldMapInner)
