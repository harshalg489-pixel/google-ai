'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, Shield, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DisruptionPrediction } from '@/types'

const itemV = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }

interface Props { predictions: DisruptionPrediction[] }

export function PredictionsSection({ predictions }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> AI Disruption Predictions
        </CardTitle>
        <CardDescription>ML models predicting potential supply chain disruptions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map((pred, i) => (
            <motion.div
              key={i} variants={itemV} initial="hidden" animate="visible"
              transition={{ delay: i * 0.1 }}
              className={cn('p-4 rounded-lg border-l-4',
                pred.severity === 'critical' ? 'border-l-red-500 bg-red-500/5' :
                pred.severity === 'high' ? 'border-l-orange-500 bg-orange-500/5' :
                'border-l-amber-500 bg-amber-500/5'
              )}
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3">
                    <Shield className={cn('w-5 h-5',
                      pred.severity === 'critical' ? 'text-red-400' :
                      pred.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                    )} />
                    <span className="font-semibold text-sm">Shipment SC-2024-00{pred.shipmentId}</span>
                    <Badge variant={pred.probability > 0.8 ? 'destructive' : 'secondary'} className="text-xs">
                      {(pred.probability * 100).toFixed(0)}% Risk
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Predicted delay: {pred.predictedDelay} hours</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pred.factors.map((f: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-[10px] h-5">{f}</Badge>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">AI Recommendations</p>
                    <ul className="space-y-1">
                      {pred.recommendedActions.map((action: string, j: number) => (
                        <li key={j} className="text-xs flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" /> {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs w-full md:w-auto">View Details</Button>
              </div>
            </motion.div>
          ))}
          {predictions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No disruption predictions at this time</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
