import { m } from 'motion/react'
import { MapProvider } from 'react-map-gl/mapbox'

import {
  MapBackButton,
  MapInfoPanel,
  MapLoadingState,
} from '~/components/ui/map'
import {
  useMapBounds,
  useMapMarkerSelection,
  usePhotoMarkers,
} from '~/hooks/map'

import { MapboxContainer } from './MapboxContainer'

export const MapSection = () => {
  // Use hooks for map functionality
  const { markers, isLoading, error } = usePhotoMarkers()
  const { selectedMarker, selectMarker, clearSelection } =
    useMapMarkerSelection()
  const { bounds, initialViewState } = useMapBounds(markers)

  // Show loading state
  if (isLoading) {
    return <MapLoadingState />
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <div className="text-lg font-medium text-red-900 dark:text-red-100">
            地图加载失败
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            请检查网络连接或刷新页面重试
          </p>
        </div>
      </div>
    )
  }

  return (
    <MapProvider>
      <div className="relative h-full w-full">
        {/* Back button */}
        <MapBackButton />

        {/* Map info panel */}
        <MapInfoPanel
          markersCount={markers.length}
          bounds={bounds}
          selectedMarker={selectedMarker}
          onClearSelection={clearSelection}
        />

        {/* Mapbox component */}
        <m.div
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="h-full w-full"
        >
          <MapboxContainer
            markers={markers}
            initialViewState={initialViewState}
            onMarkerClick={selectMarker}
            showGeocoder={true}
            className="h-full w-full"
          />
        </m.div>
      </div>
    </MapProvider>
  )
}
