import { photoLoader } from '@afilmory/data'
import { useEffect, useState } from 'react'

import { convertPhotosToMarkersFromEXIF } from '~/lib/map-utils'
import type { PhotoMarker } from '~/types/map'

/**
 * Hook to load and manage photo markers for map display
 */
export function usePhotoMarkers() {
  const [markers, setMarkers] = useState<PhotoMarker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadPhotoMarkers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const photos = photoLoader.getPhotos()
        const photoMarkers = convertPhotosToMarkersFromEXIF(photos)

        setMarkers(photoMarkers)
        console.info(`Found ${photoMarkers.length} photos with GPS coordinates`)
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load photo markers')
        setError(error)
        console.error('Failed to load photo markers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPhotoMarkers()
  }, [])

  return {
    markers,
    isLoading,
    error,
  }
}
