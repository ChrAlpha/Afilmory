import * as React from 'react'

import type { MapContextState } from '~/providers/map-provider'
import { MapContext } from '~/providers/map-provider'
import type { PhotoMarker } from '~/types/map'

/**
 * Hook to access map context - must be used within MapProvider
 */
export const useMapContext = (): MapContextState => {
  const context = React.use(MapContext)
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider')
  }
  return context
}

/**
 * Hook for map configuration
 */
export const useMapConfig = () => {
  const { config, updateConfig } = useMapContext()
  return { config, updateConfig }
}

/**
 * Hook for map selection state
 */
export const useMapSelection = () => {
  const {
    selectedMarker,
    setSelectedMarker,
    popupInfo,
    setPopupInfo,
    clearSelection,
  } = useMapContext()

  const selectMarker = React.useCallback(
    (marker: PhotoMarker) => {
      setSelectedMarker(marker)
      console.info('Selected photo:', marker.photo.title || marker.photo.id)
    },
    [setSelectedMarker],
  )

  return {
    selectedMarker,
    selectMarker,
    clearSelection,
    popupInfo,
    setPopupInfo,
  }
}

/**
 * Hook for map data management
 */
export const useMapData = () => {
  const { markers, setMarkers, bounds } = useMapContext()
  return { markers, setMarkers, bounds }
}

/**
 * Hook for provider management
 */
export const useMapProvider = () => {
  const { availableProviders, currentProvider, switchProvider } =
    useMapContext()
  return { availableProviders, currentProvider, switchProvider }
}

/**
 * Standalone hook for local map selection (when not using global context)
 * This is useful for components that manage their own selection state
 */
export const useLocalMapSelection = () => {
  const [selectedMarker, setSelectedMarker] =
    React.useState<PhotoMarker | null>(null)
  const [popupInfo, setPopupInfo] = React.useState<{
    marker: PhotoMarker
    longitude: number
    latitude: number
  } | null>(null)

  const selectMarker = React.useCallback((marker: PhotoMarker) => {
    setSelectedMarker(marker)
    console.info('Selected photo:', marker.photo.title || marker.photo.id)
  }, [])

  const clearSelection = React.useCallback(() => {
    setSelectedMarker(null)
    setPopupInfo(null)
  }, [])

  return {
    selectedMarker,
    selectMarker,
    clearSelection,
    popupInfo,
    setPopupInfo,
  }
}
