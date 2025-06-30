import type { GeocoderOptions } from '@mapbox/mapbox-gl-geocoder'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import * as mapboxgl from 'mapbox-gl'
import * as React from 'react'
import type { MapRef } from 'react-map-gl/mapbox'

import { Mapbox } from '~/components/ui/map/Mapbox'
import { useIsDark } from '~/hooks/common'
import { useMapContext } from '~/hooks/useMap'
import type { BaseMapProps, PhotoMarker } from '~/types/map'

// You need to set VITE_MAPBOX_ACCESS_TOKEN in your environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

/**
 * Map adapter interface for different map providers
 */
export interface MapAdapter {
  name: string
  isAvailable: boolean
  initialize: () => Promise<void>
  cleanup?: () => void
}

/**
 * Mapbox map adapter implementation
 * This adapts Mapbox to work with our generic map provider system
 */
export class MapboxMapAdapter implements MapAdapter {
  name = 'mapbox'

  get isAvailable(): boolean {
    return !!MAPBOX_TOKEN
  }

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
  showGeocoder,
  handlers,
}) => {
  const mapRef = React.useRef<MapRef>(null)
  const isDark = useIsDark()

  // Get configuration from Map Provider context
  const { config, popupInfo, setPopupInfo } = useMapContext()

  // Use config values with props as fallback
  const effectiveShowGeocoder = showGeocoder ?? config.showGeocoder
  const effectiveTheme =
    config.theme === 'auto' ? (isDark ? 'dark' : 'light') : config.theme

  // Add Geocoder control
  React.useEffect(() => {
    if (!effectiveShowGeocoder || !mapRef.current || !MAPBOX_TOKEN) return

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
  }, [effectiveShowGeocoder])

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
        duration: config.animationDuration,
        zoom: zoom || config.defaultZoom,
      })
    },
    [config.animationDuration, config.defaultZoom],
  )

  // Handle marker click
  const handleMarkerClick = React.useCallback(
    (marker: PhotoMarker) => {
      if (handlers?.onMarkerClick) {
        handlers.onMarkerClick(marker)
      } else {
        // Fallback to setting popup info in global state
        setPopupInfo({
          marker,
          longitude: marker.longitude,
          latitude: marker.latitude,
        })
      }
    },
    [handlers, setPopupInfo],
  )

  // Handle popup close
  const handlePopupClose = React.useCallback(() => {
    setPopupInfo(null)
  }, [setPopupInfo])

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
      popupInfo={popupInfo}
      onPopupClose={handlePopupClose}
      theme={effectiveTheme}
    />
  )
}

/**
 * Create a Mapbox adapter instance
 */
export const createMapboxAdapter = (): MapAdapter => {
  return new MapboxMapAdapter()
}
