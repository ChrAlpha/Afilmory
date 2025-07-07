import { lazy } from 'react'

import type { MapAdapter } from './MapProvider'

// You need to set VITE_MAPBOX_ACCESS_TOKEN in your environment variables
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

const Mapbox = lazy(() =>
  import('./components/MapboxMapComponent').then((m) => ({
    default: m.MapboxMapComponent,
  })),
)
/**
 * Mapbox map adapter implementation
 * This adapts Mapbox to work with our generic map provider system
 */
export class MapboxMapAdapter implements MapAdapter {
  name = 'mapbox'

  get isAvailable(): boolean {
    return !!MAPBOX_TOKEN
  }

  MapComponent = Mapbox

  async initialize(): Promise<void> {
    if (!this.isAvailable) {
      throw new Error(
        'Mapbox token not found. Please set VITE_MAPBOX_ACCESS_TOKEN in your environment variables.',
      )
    }
    // Mapbox doesn't require additional initialization
  }

  cleanup(): void {
    // No cleanup needed for Mapbox
  }
}

/**
 * Create a Mapbox adapter instance
 */
export const createMapboxAdapter = (): MapAdapter => {
  return new MapboxMapAdapter()
}
