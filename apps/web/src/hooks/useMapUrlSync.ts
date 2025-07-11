import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import type { PhotoMarker } from '~/types/map'

/**
 * Hook to synchronize selected marker with URL parameters
 * Allows sharing specific marker selection via URL
 */
export function useMapUrlSync(markers: PhotoMarker[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)

  // Get selected marker from URL on mount
  useEffect(() => {
    const markerIdFromUrl = searchParams.get('marker')
    if (markerIdFromUrl && markers.length > 0) {
      // Check if the marker exists in the current markers
      const markerExists = markers.some(
        (marker) => marker.id === markerIdFromUrl,
      )
      if (markerExists) {
        setSelectedMarkerId(markerIdFromUrl)
      } else {
        // If marker doesn't exist, remove it from URL
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('marker')
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [markers, searchParams, setSearchParams])

  // Update URL when selected marker changes
  const updateSelectedMarker = (markerId: string | null) => {
    setSelectedMarkerId(markerId)

    const newParams = new URLSearchParams(searchParams)
    if (markerId) {
      newParams.set('marker', markerId)
    } else {
      newParams.delete('marker')
    }

    setSearchParams(newParams, { replace: true })
  }

  // Get the selected marker object
  const selectedMarker = selectedMarkerId
    ? markers.find((marker) => marker.id === selectedMarkerId) || null
    : null

  return {
    selectedMarkerId,
    selectedMarker,
    updateSelectedMarker,
  }
}

/**
 * Hook to handle automatic map focus on URL-selected marker
 * Separates the URL sync logic from the map focusing logic
 */
export function useMapFocusOnUrlMarker(
  markers: PhotoMarker[],
  selectedMarkerId: string | null,
  mapRef: React.RefObject<any> | undefined,
  isMapLoaded: boolean,
) {
  useEffect(() => {
    if (!selectedMarkerId || !isMapLoaded || !mapRef?.current) return

    const selectedMarker = markers.find((m) => m.id === selectedMarkerId)
    if (!selectedMarker) return

    // Focus on the selected marker with a slight delay to ensure map is ready
    const timer = setTimeout(() => {
      try {
        const map = mapRef.current.getMap()
        if (map) {
          map.flyTo({
            center: [selectedMarker.longitude, selectedMarker.latitude],
            zoom: Math.max(map.getZoom(), 14), // Ensure reasonable zoom level
            duration: 1000,
          })
        }
      } catch (error) {
        console.warn('Failed to focus on selected marker:', error)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [selectedMarkerId, isMapLoaded, mapRef, markers])
}
