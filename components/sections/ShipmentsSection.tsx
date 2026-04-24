'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Anchor, Plane, Train, Truck, Wind, Route } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Shipment } from '@/types'

const transportIcons: Record<string, any> = { sea: Anchor, air: Plane, rail: Train, truck: Truck }
const itemV = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }

interface Props {
  shipments: Shipment[]
  onReroute: (id: string) => void
}

export function ShipmentsSection({ shipments, onReroute }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Active Shipments</CardTitle>
        <CardDescription>All shipments currently being tracked</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {shipments.map((shipment) => {
            const TransportIcon = transportIcons[shipment.transportMode] || Truck
            return (
              <motion.div
                key={shipment.id}
                variants={itemV}
                initial="hidden"
                animate="visible"
                className="p-4 rounded-lg border border-border hover:border-primary/30 transition-all card-lift bg-card/50"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      shipment.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                      shipment.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      shipment.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    )}>
                      <TransportIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{shipment.trackingNumber}</span>
                        <Badge variant={
                          shipment.currentStatus === 'at_risk' ? 'destructive' :
                          shipment.currentStatus === 'delayed' ? 'secondary' : 'outline'
                        } className="text-[10px] h-5">
                          {shipment.currentStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{shipment.originName} → {shipment.destinationName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Risk:</span>
                        <span className={cn('text-sm font-bold',
                          shipment.riskScore > 75 ? 'text-red-400' :
                          shipment.riskScore > 55 ? 'text-orange-400' :
                          shipment.riskScore > 35 ? 'text-amber-400' : 'text-emerald-400'
                        )}>{Math.round(shipment.riskScore)}</span>
                      </div>
                      <Progress value={shipment.riskScore} className="w-20 h-1.5 mt-1" />
                    </div>
                    {shipment.riskLevel === 'critical' && (
                      <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => onReroute(shipment.id)}>
                        <Route className="w-3 h-3 mr-1" /> Reroute
                      </Button>
                    )}
                  </div>
                </div>
                {shipment.weatherConditions?.severeWeatherAlert && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded flex items-center gap-2 text-xs text-red-400">
                    <Wind className="w-3.5 h-3.5" /> Severe weather: {shipment.weatherConditions.conditions}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
