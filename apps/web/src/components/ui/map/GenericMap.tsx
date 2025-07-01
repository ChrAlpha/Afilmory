import * as React from 'react'

import { getInitialViewStateForMarkers } from '~/lib/map-utils'
import { MapboxMapComponent } from '~/modules/map/MapboxAdapter'
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
  ...props
}) => {
  // Calculate initial view state from markers
  const calculatedInitialViewState = React.useMemo(
    () => initialViewState || getInitialViewStateForMarkers(markers),
    [initialViewState, markers],
  )

  // Prepare handlers for the specific map adapter
  const handlers = React.useMemo(
    () => ({
      onMarkerClick,
      onGeoJsonClick,
      onGeolocate,
    }),
    [onMarkerClick, onGeoJsonClick, onGeolocate],
  )

  return (
    <MapboxMapComponent
      {...props}
      markers={markers}
      initialViewState={calculatedInitialViewState}
      handlers={handlers}
    />
  )
}
