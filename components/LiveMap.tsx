'use client'

import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Shipment } from '@/types'

// Setup mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface LiveMapProps {
  shipments: Shipment[]
}

export function LiveMap({ shipments }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({})

  useEffect(() => {
    if (map.current || !mapContainer.current) return // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      projection: 'globe' as any, // globe is valid but might not be in the mapbox-gl type defs yet depending on version
      zoom: 1.5,
      center: [30, 15],
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.scrollZoom.disable()

    map.current.on('style.load', () => {
      map.current?.setFog({}) // Set the default atmosphere style
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current) return

    // Add or update markers
    shipments.forEach((shipment) => {
      // For simplicity, we plot the shipment at its origin coordinates. 
      // In a real app, we would have currentLat/currentLon.
      const lat = shipment.originLat
      const lng = shipment.originLon

      const currentMap = map.current
      if (!currentMap) return

      // Risk colors for markers
      const color = 
        shipment.riskLevel === 'critical' ? '#ef4444' : 
        shipment.riskLevel === 'high' ? '#f97316' : 
        shipment.riskLevel === 'medium' ? '#f59e0b' : '#10b981'

      if (markersRef.current[shipment.id]) {
        // Update existing marker position/color if needed (mapbox gl marker element can be restyled)
        markersRef.current[shipment.id].setLngLat([lng, lat])
      } else {
        // Create new marker
        const el = document.createElement('div')
        el.className = 'w-4 h-4 rounded-full border-2 border-white shadow-lg animate-pulse'
        el.style.backgroundColor = color

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2 text-sm text-black">
            <strong>${shipment.trackingNumber}</strong><br/>
            Status: ${shipment.currentStatus.replace('_', ' ')}<br/>
            Risk: ${shipment.riskLevel}
          </div>`
        )

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(currentMap)

        markersRef.current[shipment.id] = marker
      }
    })

    // Remove old markers if shipments are removed
    const currentIds = shipments.map(s => s.id)
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.includes(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })

  }, [shipments])

  return (
    <div ref={mapContainer} className="w-full h-full rounded-lg absolute inset-0" />
  )
}
