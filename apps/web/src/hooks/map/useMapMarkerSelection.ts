import { useState } from 'react'

import type { PhotoMarker } from '~/types/map'

/**
 * Hook to manage map marker selection state
 */
export function useMapMarkerSelection() {
  const [selectedMarker, setSelectedMarker] = useState<PhotoMarker | null>(null)

  const selectMarker = (marker: PhotoMarker) => {
    setSelectedMarker(marker)
    console.info('Selected photo:', marker.photo.title || marker.photo.id)
  }

  const clearSelection = () => {
    setSelectedMarker(null)
  }

  return {
    selectedMarker,
    selectMarker,
    clearSelection,
  }
}
