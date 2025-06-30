import * as React from 'react'

import { useMapProvider, useMapSelection } from '~/hooks/useMap'
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
  const { selectMarker } = useMapSelection()
  const { currentProvider, availableProviders } = useMapProvider()

  // Calculate initial view state from markers
  const calculatedInitialViewState = React.useMemo(
    () => initialViewState || getInitialViewStateForMarkers(markers),
    [initialViewState, markers],
  )

  // Handle marker click
  const handleMarkerClick = React.useCallback(
    (marker: PhotoMarker) => {
      selectMarker(marker)
      onMarkerClick?.(marker)
    },
    [selectMarker, onMarkerClick],
  )

  // Prepare handlers for the specific map adapter
  const handlers = React.useMemo(
    () => ({
      onMarkerClick: handleMarkerClick,
      onGeoJsonClick,
      onGeolocate,
    }),
    [handleMarkerClick, onGeoJsonClick, onGeolocate],
  )

  // Render the appropriate map adapter based on current provider
  const renderMapAdapter = () => {
    switch (currentProvider) {
      case 'mapbox': {
        return (
          <MapboxMapComponent
            {...props}
            markers={markers}
            initialViewState={calculatedInitialViewState}
            handlers={handlers}
          />
        )
      }

      case 'demo': {
        // Demo provider could be imported here
        return (
          <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="p-8 text-center">
              <h3 className="mb-2 text-lg font-semibold">Demo Map Provider</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Found {markers.length} photo markers
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Provider: {currentProvider}
              </p>
            </div>
          </div>
        )
      }

      default: {
        return (
          <div className="flex h-full items-center justify-center bg-red-100 dark:bg-red-900">
            <div className="p-8 text-center">
              <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
                No Map Provider Available
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                Current: {currentProvider}, Available:{' '}
                {availableProviders.join(', ')}
              </p>
            </div>
          </div>
        )
      }
    }
  }

  return renderMapAdapter()
}
