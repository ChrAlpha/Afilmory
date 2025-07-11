import * as React from 'react'

import { useMapUrlSync } from '~/hooks/useMapUrlSync'
import { getInitialViewStateForMarkers } from '~/lib/map-utils'
import { useMapAdapter } from '~/modules/map/MapProvider'
import type { BaseMapProps, PhotoMarker } from '~/types/map'

interface GenericMapProps extends Omit<BaseMapProps, 'handlers'> {
  /** Photo markers to display */
  markers?: PhotoMarker[]
  /** Callback when marker is clicked */
  onMarkerClick?: (marker: PhotoMarker) => void
  /** Callback when GeoJSON feature is clicked */
  onGeoJsonClick?: (feature: GeoJSON.Feature) => void
  /** Callback for geolocation */
  onGeolocate?: (longitude: number, latitude: number) => void
  /** Enable URL synchronization for selected marker */
  enableUrlSync?: boolean
}

// Default empty array to avoid inline array creation
const DEFAULT_MARKERS: PhotoMarker[] = []

/**
 * Generic map component that abstracts away the specific map provider
 * This component automatically selects the best available provider from context
 */
export const GenericMap: React.FC<GenericMapProps> = ({
  markers = DEFAULT_MARKERS,
  onMarkerClick,
  onGeoJsonClick,
  onGeolocate,
  initialViewState,
  autoFitBounds = true,
  enableUrlSync = true,
  ...props
}) => {
  const adapter = useMapAdapter()

  // URL synchronization for selected marker
  const { selectedMarkerId, selectedMarker, updateSelectedMarker } =
    useMapUrlSync(enableUrlSync ? markers : [])

  // Calculate initial view state from markers or selected marker
  const calculatedInitialViewState = React.useMemo(() => {
    // If URL sync is enabled and there's a selected marker, focus on it
    if (enableUrlSync && selectedMarker) {
      return {
        longitude: selectedMarker.longitude,
        latitude: selectedMarker.latitude,
        zoom: 15, // Close zoom for selected marker
      }
    }

    if (autoFitBounds) {
      // If autoFitBounds is enabled, use provided initialViewState or default
      return initialViewState || { longitude: 0, latitude: 0, zoom: 2 }
    }

    return initialViewState || getInitialViewStateForMarkers(markers)
  }, [initialViewState, markers, autoFitBounds, enableUrlSync, selectedMarker])

  // Calculate effective autoFitBounds - disable when there's a selected marker
  const effectiveAutoFitBounds = React.useMemo(() => {
    // If there's a selected marker from URL, disable auto fit to prevent conflicts
    if (enableUrlSync && selectedMarker) {
      return false
    }
    return autoFitBounds
  }, [autoFitBounds, enableUrlSync, selectedMarker])

  // Handle marker click with URL sync
  const handleMarkerClick = React.useCallback(
    (marker: PhotoMarker) => {
      if (enableUrlSync) {
        // Toggle selection: if already selected, deselect; otherwise select
        const newSelectedId = selectedMarkerId === marker.id ? null : marker.id
        updateSelectedMarker(newSelectedId)
      }
      onMarkerClick?.(marker)
    },
    [enableUrlSync, selectedMarkerId, updateSelectedMarker, onMarkerClick],
  )

  // Handle marker close with URL sync
  const handleMarkerClose = React.useCallback(() => {
    if (enableUrlSync) {
      updateSelectedMarker(null)
    }
  }, [enableUrlSync, updateSelectedMarker])

  // Prepare handlers for the specific map adapter
  const handlers = React.useMemo(
    () => ({
      onMarkerClick: handleMarkerClick,
      onMarkerClose: handleMarkerClose,
      onGeoJsonClick,
      onGeolocate,
    }),
    [handleMarkerClick, handleMarkerClose, onGeoJsonClick, onGeolocate],
  )

  if (!adapter) {
    return <div>Map provider not available</div>
  }

  const { MapComponent } = adapter

  return (
    <MapComponent
      {...props}
      markers={markers}
      initialViewState={calculatedInitialViewState}
      autoFitBounds={effectiveAutoFitBounds}
      handlers={handlers}
      selectedMarkerId={enableUrlSync ? selectedMarkerId : undefined}
    />
  )
}
