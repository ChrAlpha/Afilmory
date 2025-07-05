import type { GeocoderOptions } from '@mapbox/mapbox-gl-geocoder'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import * as mapboxgl from 'mapbox-gl'
import * as React from 'react'
import type { MapRef } from 'react-map-gl/mapbox'

import { Mapbox } from '~/components/ui/map/Mapbox'
import { useIsDark } from '~/hooks/common'
import type { BaseMapProps, PhotoMarker } from '~/types/map'

import type { MapAdapter } from './MapProvider'

// You need to set VITE_MAPBOX_ACCESS_TOKEN in your environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

/**
 * Mapbox map adapter implementation
 * This adapts Mapbox to work with our generic map provider system
 */
export class MapboxMapAdapter implements MapAdapter {
  name = 'mapbox'

  get isAvailable(): boolean {
    return !!MAPBOX_TOKEN
  }

  MapComponent = MapboxMapComponent

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
 * Mapbox map component that integrates with the Map Provider context
 * This component reads configuration from the MapProvider context
 */
export const MapboxMapComponent: React.FC<BaseMapProps> = ({
  id,
  initialViewState,
  markers,
  geoJsonData,
  className,
  style,
  showGeocoder = true, // Default to true
  handlers,
}) => {
  const mapRef = React.useRef<MapRef>(null)
  const isDark = useIsDark()

  // Use simple theme logic
  const theme = isDark ? 'dark' : 'light'

  // Default map config constants
  const DEFAULT_ANIMATION_DURATION = 1000
  const DEFAULT_ZOOM = 14

  // Add Geocoder control
  React.useEffect(() => {
    if (!showGeocoder || !mapRef.current || !MAPBOX_TOKEN) return

    const map = mapRef.current
    const geocoderOptions: GeocoderOptions = {
      accessToken: MAPBOX_TOKEN,
      mapboxgl,
    }
    const geocoder = new MapboxGeocoder(geocoderOptions)

    map.getMap().addControl(geocoder)

    return () => {
      if (map) {
        map.getMap().removeControl(geocoder)
      }
    }
  }, [showGeocoder])

  // Handle GeoJSON click
  const handleGeoJsonClick = React.useCallback(
    (
      event: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.GeoJSONFeature[]
      },
    ) => {
      if (!handlers?.onGeoJsonClick) return

      const feature = event.features?.[0]
      if (feature) {
        handlers.onGeoJsonClick(feature as GeoJSON.Feature)
      }
    },
    [handlers],
  )

  // Fly to location with animation duration from config
  const flyToLocation = React.useCallback(
    (longitude: number, latitude: number, zoom?: number) => {
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        duration: DEFAULT_ANIMATION_DURATION,
        zoom: zoom || DEFAULT_ZOOM,
      })
    },
    [], // No dependencies needed as constants don't change
  )

  // Handle marker click
  const handleMarkerClick = React.useCallback(
    (marker: PhotoMarker) => {
      handlers?.onMarkerClick?.(marker)
    },
    [handlers],
  )

  // Handle geolocate
  const handleGeolocate = React.useCallback(
    (longitude: number, latitude: number) => {
      flyToLocation(longitude, latitude)
      handlers?.onGeolocate?.(longitude, latitude)
    },
    [flyToLocation, handlers],
  )

  return (
    <Mapbox
      id={id}
      initialViewState={initialViewState}
      markers={markers}
      geoJsonData={geoJsonData}
      onMarkerClick={handleMarkerClick}
      onGeoJsonClick={handleGeoJsonClick}
      onGeolocate={handleGeolocate}
      className={className}
      style={style}
      mapboxToken={MAPBOX_TOKEN || ''}
      mapRef={mapRef}
      theme={theme}
    />
  )
}

/**
 * Create a Mapbox adapter instance
 */
export const createMapboxAdapter = (): MapAdapter => {
  return new MapboxMapAdapter()
}
