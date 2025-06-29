import { useMemo } from 'react'

import {
  calculateMapBounds,
  getInitialViewStateForMarkers,
} from '~/lib/map-utils'
import type { PhotoMarker } from '~/types/map'

/**
 * Hook to calculate map bounds and initial view state
 */
export function useMapBounds(markers: PhotoMarker[]) {
  const bounds = useMemo(() => calculateMapBounds(markers), [markers])

  const initialViewState = useMemo(
    () => getInitialViewStateForMarkers(markers),
    [markers],
  )

  return {
    bounds,
    initialViewState,
  }
}
