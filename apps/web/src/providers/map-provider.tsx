import * as React from 'react'

import { calculateMapBounds } from '~/lib/map-utils'
import type { MapBounds, PhotoMarker } from '~/types/map'

/**
 * Map provider configuration
 */
export interface MapConfig {
  /** Default map provider to use */
  defaultProvider: 'mapbox' | 'google' | 'demo'
  /** Whether to show geocoder by default */
  showGeocoder: boolean
  /** Default theme */
  theme: 'light' | 'dark' | 'auto'
  /** Animation duration for map transitions */
  animationDuration: number
  /** Default zoom level */
  defaultZoom: number
}

/**
 * Map context state
 */
export interface MapContextState {
  // Configuration
  config: MapConfig
  updateConfig: (updates: Partial<MapConfig>) => void

  // Map data
  markers: PhotoMarker[]
  setMarkers: (markers: PhotoMarker[]) => void
  bounds: MapBounds | null

  // Selection state
  selectedMarker: PhotoMarker | null
  setSelectedMarker: (marker: PhotoMarker | null) => void

  // Popup state
  popupInfo: {
    marker: PhotoMarker
    longitude: number
    latitude: number
  } | null
  setPopupInfo: (
    info: { marker: PhotoMarker; longitude: number; latitude: number } | null,
  ) => void

  // Map controls
  flyToLocation: (longitude: number, latitude: number, zoom?: number) => void
  clearSelection: () => void

  // Provider availability
  availableProviders: string[]
  currentProvider: string
  switchProvider: (provider: string) => void
}

const MapContext = React.createContext<MapContextState | null>(null)

// Export the context for use in hooks
export { MapContext }

interface MapProviderProps {
  children: React.ReactNode
  initialConfig?: Partial<MapConfig>
}

const DEFAULT_INITIAL_CONFIG: Partial<MapConfig> = {}

const defaultConfig: MapConfig = {
  defaultProvider: 'mapbox',
  showGeocoder: true,
  theme: 'auto',
  animationDuration: 2000,
  defaultZoom: 14,
}

/**
 * Map Provider that manages global map state and configuration
 * This follows React Context patterns for state management
 */
export const MapProvider: React.FC<MapProviderProps> = ({
  children,
  initialConfig = DEFAULT_INITIAL_CONFIG,
}) => {
  // Configuration state
  const [config, setConfig] = React.useState<MapConfig>({
    ...defaultConfig,
    ...initialConfig,
  })

  // Map data state
  const [markers, setMarkers] = React.useState<PhotoMarker[]>([])
  const [selectedMarker, setSelectedMarker] =
    React.useState<PhotoMarker | null>(null)
  const [popupInfo, setPopupInfo] = React.useState<{
    marker: PhotoMarker
    longitude: number
    latitude: number
  } | null>(null)

  // Provider state
  const [currentProvider, setCurrentProvider] = React.useState<string>(
    config.defaultProvider,
  )

  // Available providers (could be dynamic based on API keys, etc.)
  const availableProviders = React.useMemo(() => {
    const providers: string[] = []

    // Check Mapbox availability
    if (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
      providers.push('mapbox')
    }

    // Check other providers
    // if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) providers.push('google')

    // Demo provider is always available
    providers.push('demo')

    return providers
  }, [])

  // Calculate bounds from markers
  const bounds = React.useMemo(() => calculateMapBounds(markers), [markers])

  // Map ref for controlling map instances
  const mapInstanceRef = React.useRef<{
    flyTo?: (longitude: number, latitude: number, zoom?: number) => void
  }>({})

  // Update configuration
  const updateConfig = React.useCallback((updates: Partial<MapConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  // Fly to location
  const flyToLocation = React.useCallback(
    (longitude: number, latitude: number, zoom?: number) => {
      if (mapInstanceRef.current.flyTo) {
        mapInstanceRef.current.flyTo(
          longitude,
          latitude,
          zoom || config.defaultZoom,
        )
      }
    },
    [config.defaultZoom],
  )

  // Clear selection
  const clearSelection = React.useCallback(() => {
    setSelectedMarker(null)
    setPopupInfo(null)
  }, [])

  // Switch provider
  const switchProvider = React.useCallback(
    (provider: string) => {
      if (availableProviders.includes(provider)) {
        setCurrentProvider(provider)
        console.info(`Switched to ${provider} map provider`)
      } else {
        console.warn(`Provider ${provider} is not available`)
      }
    },
    [availableProviders],
  )

  // Enhanced setSelectedMarker that also manages popup
  const enhancedSetSelectedMarker = React.useCallback(
    (marker: PhotoMarker | null) => {
      setSelectedMarker(marker)
      if (!marker) {
        setPopupInfo(null)
      }
    },
    [],
  )

  const contextValue = React.useMemo(
    (): MapContextState => ({
      // Configuration
      config,
      updateConfig,

      // Map data
      markers,
      setMarkers,
      bounds,

      // Selection state
      selectedMarker,
      setSelectedMarker: enhancedSetSelectedMarker,

      // Popup state
      popupInfo,
      setPopupInfo,

      // Map controls
      flyToLocation,
      clearSelection,

      // Provider management
      availableProviders,
      currentProvider,
      switchProvider,
    }),
    [
      config,
      updateConfig,
      markers,
      bounds,
      selectedMarker,
      enhancedSetSelectedMarker,
      popupInfo,
      flyToLocation,
      clearSelection,
      availableProviders,
      currentProvider,
      switchProvider,
    ],
  )

  // Register map instance controls
  React.useEffect(() => {
    // This will be used by map adapters to register their control methods
    return () => {
      mapInstanceRef.current = {}
    }
  }, [currentProvider])

  return <MapContext value={contextValue}>{children}</MapContext>
}
