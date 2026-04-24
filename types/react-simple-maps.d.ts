declare module 'react-simple-maps' {
  import { ComponentType, SVGProps, ReactNode } from 'react'

  interface ComposableMapProps {
    projection?: string
    projectionConfig?: {
      scale?: number
      center?: [number, number]
      rotate?: [number, number, number]
    }
    width?: number
    height?: number
    style?: React.CSSProperties
    children?: ReactNode
  }

  interface GeographiesProps {
    geography: string | object
    children: (data: { geographies: any[] }) => ReactNode
  }

  interface GeographyProps {
    geography: any
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: React.CSSProperties & { outline?: string }
      hover?: React.CSSProperties & { outline?: string }
      pressed?: React.CSSProperties & { outline?: string }
    }
    onMouseEnter?: (event: React.MouseEvent) => void
    onMouseLeave?: (event: React.MouseEvent) => void
    onClick?: (event: React.MouseEvent) => void
  }

  interface MarkerProps {
    coordinates: [number, number]
    children?: ReactNode
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    onClick?: () => void
    className?: string
  }

  interface LineProps {
    from: [number, number]
    to: [number, number]
    stroke?: string
    strokeWidth?: number
    strokeLinecap?: string
    strokeDasharray?: string
    strokeOpacity?: number
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
  export const Marker: ComponentType<MarkerProps>
  export const Line: ComponentType<LineProps>
}
