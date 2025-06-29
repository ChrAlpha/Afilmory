import { photoLoader } from '@afilmory/data'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapProvider } from 'react-map-gl/mapbox'
import { useNavigate } from 'react-router'

import type { PhotoMarker } from '~/components/map/Mapbox'
import Mapbox from '~/components/map/Mapbox'
import {
  calculateMapBounds,
  convertPhotosToMarkersFromEXIF,
  getInitialViewStateForMarkers,
} from '~/components/map/utils'
import { Button } from '~/components/ui/button'

export const MapSection = () => {
  const { t } = useTranslation()
  const [markers, setMarkers] = useState<PhotoMarker[]>([])
  const [selectedMarker, setSelectedMarker] = useState<PhotoMarker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Load photos and convert to markers
  useEffect(() => {
    const loadPhotoMarkers = async () => {
      setIsLoading(true)
      try {
        const photos = photoLoader.getPhotos()

        // Convert photos to markers using EXIF GPS data
        const photoMarkers = convertPhotosToMarkersFromEXIF(photos)

        setMarkers(photoMarkers)
        console.info(`Found ${photoMarkers.length} photos with GPS coordinates`)
      } catch (error) {
        console.error('Failed to load photo markers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPhotoMarkers()
  }, [])

  // Handle marker click
  const handleMarkerClick = (marker: PhotoMarker) => {
    setSelectedMarker(marker)
    console.info('Clicked photo:', marker.photo.title || marker.photo.id)
  }

  // Calculate initial view state based on markers
  const initialViewState = getInitialViewStateForMarkers(markers)
  const bounds = calculateMapBounds(markers)

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">📍</div>
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('explory.loading.map')}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('explory.parsing.location')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <MapProvider>
      <div className="relative h-full w-full">
        {/* 返回按钮 */}
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-10 w-10 rounded-full border border-white/20 bg-black/50 backdrop-blur-sm transition-all duration-200 hover:bg-black/70"
            title={t('explory.back.to.gallery')}
          >
            <i className="i-mingcute-arrow-left-line text-base text-white" />
          </Button>
        </div>
        {/* 地图信息面板 */}
        <div className="absolute top-4 right-4 z-40 max-w-sm rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:bg-gray-800/90">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t('explory.explore.map')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('explory.found.locations', { count: markers.length })}
              </p>
            </div>
          </div>

          {bounds && (
            <div className="mt-3 rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">
                  {t('explory.shooting.range')}
                </span>
                <br />
                {bounds.minLat.toFixed(2)}, {bounds.minLng.toFixed(2)} 至<br />
                {bounds.maxLat.toFixed(2)}, {bounds.maxLng.toFixed(2)}
              </p>
            </div>
          )}

          {/* Selected photo info */}
          {selectedMarker && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <img
                  src={
                    selectedMarker.photo.thumbnailUrl ||
                    selectedMarker.photo.originalUrl
                  }
                  alt={selectedMarker.photo.title || selectedMarker.photo.id}
                  className="h-12 w-12 rounded object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedMarker.photo.title || selectedMarker.photo.id}
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    📍 {selectedMarker.latitude.toFixed(4)},{' '}
                    {selectedMarker.longitude.toFixed(4)}
                  </p>
                  {selectedMarker.photo.exif?.DateTimeOriginal && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      📅{' '}
                      {new Date(
                        selectedMarker.photo.exif.DateTimeOriginal,
                      ).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMarker(null)}
                className="mt-2 w-full rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 transition-colors hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
              >
                {t('explory.clear.selection')}
              </button>
            </div>
          )}
        </div>

        {/* Mapbox component */}
        <Mapbox
          markers={markers}
          initialViewState={initialViewState}
          onMarkerClick={handleMarkerClick}
          showGeocoder={true}
          className="h-full w-full"
        />
      </div>
    </MapProvider>
  )
}
