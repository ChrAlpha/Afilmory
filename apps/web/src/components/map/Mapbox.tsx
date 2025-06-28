'use client'

// Styles
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import type { PhotoManifestItem } from '@afilmory/builder'
import type { GeocoderOptions } from '@mapbox/mapbox-gl-geocoder'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import * as mapboxgl from 'mapbox-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayerProps, MapRef } from 'react-map-gl'
import Map, {
  GeolocateControl,
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
} from 'react-map-gl'

import { useIsDark } from '~/hooks/common/useDark'

export interface PhotoMarker {
  id: string
  longitude: number
  latitude: number
  photo: PhotoManifestItem
}

export interface MapboxProps {
  id?: string
  initialViewState?: {
    longitude: number
    latitude: number
    zoom: number
  }
  markers?: PhotoMarker[]
  geoJsonData?: GeoJSON.FeatureCollection
  onMarkerClick?: (marker: PhotoMarker) => void
  onGeoJsonClick?: (feature: GeoJSON.Feature) => void
  showGeocoder?: boolean
  className?: string
  style?: React.CSSProperties
}

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const

// You need to set VITE_MAPBOX_ACCESS_TOKEN in your environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

// Default values to avoid inline object creation
const DEFAULT_VIEW_STATE = {
  longitude: -122.4,
  latitude: 37.8,
  zoom: 14,
}

const DEFAULT_MARKERS: PhotoMarker[] = []
const DEFAULT_STYLE = { width: '100%', height: '100%' }

const Mapbox = ({
  id,
  initialViewState = DEFAULT_VIEW_STATE,
  markers = DEFAULT_MARKERS,
  geoJsonData,
  onMarkerClick,
  onGeoJsonClick,
  showGeocoder = false,
  className = 'w-full h-full',
  style = DEFAULT_STYLE,
}: MapboxProps) => {
  const mapRef = useRef<MapRef>(null)
  const isDark = useIsDark()
  const [popupInfo, setPopupInfo] = useState<{
    marker: PhotoMarker
    longitude: number
    latitude: number
  } | null>(null)

  // GeoJSON layer style
  const layerStyle: LayerProps = {
    id: 'data',
    type: 'fill',
    paint: {
      'fill-color': '#0080ff',
      'fill-opacity': 0.5,
    },
  }

  // Add Geocoder control
  useEffect(() => {
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
  const onClick = useCallback(
    (
      event: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.GeoJSONFeature[]
      },
    ) => {
      if (!onGeoJsonClick) return

      const feature = event.features?.[0]
      if (feature) {
        onGeoJsonClick(feature as GeoJSON.Feature)
      }
    },
    [onGeoJsonClick],
  )

  // Fly to location
  const flyToLocation = useCallback((longitude: number, latitude: number) => {
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      duration: 2000,
      zoom: 14,
    })
  }, [])

  // Handle marker click
  const handleMarkerClick = useCallback(
    (marker: PhotoMarker) => {
      if (onMarkerClick) {
        onMarkerClick(marker)
      } else {
        setPopupInfo({
          marker,
          longitude: marker.longitude,
          latitude: marker.latitude,
        })
      }
    },
    [onMarkerClick],
  )

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={style}
      >
        <div className="p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Missing Mapbox Token
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please set VITE_MAPBOX_ACCESS_TOKEN in your environment variables
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      <Map
        id={id}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[isDark ? 'dark' : 'light']}
        interactiveLayerIds={geoJsonData ? ['data'] : undefined}
        onClick={onClick}
      >
        {/* Navigation Controls */}
        <NavigationControl position="bottom-left" />
        <GeolocateControl
          position="bottom-left"
          trackUserLocation
          onGeolocate={(e) => {
            flyToLocation(e.coords.longitude, e.coords.latitude)
          }}
        />

        {/* Photo Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMarkerClick(marker)}
          >
            <div className="group relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg transition-all hover:scale-110 hover:bg-blue-600">
                <span className="text-xs font-semibold text-white">📷</span>
              </div>
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 transform rounded bg-black/75 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                {marker.photo.title || marker.photo.id}
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            offset={15}
            className="max-w-none overflow-hidden rounded-xl p-0"
            closeButton={false}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setPopupInfo(null)}
                className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/70"
              >
                <span className="sr-only">Close</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-white"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className="w-64 overflow-hidden rounded-lg bg-white dark:bg-gray-800">
                <div className="relative">
                  <img
                    src={
                      popupInfo.marker.photo.thumbnailUrl ||
                      popupInfo.marker.photo.originalUrl
                    }
                    alt={
                      popupInfo.marker.photo.title || popupInfo.marker.photo.id
                    }
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="space-y-2 p-4">
                  <h3
                    className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
                    title={
                      popupInfo.marker.photo.title || popupInfo.marker.photo.id
                    }
                  >
                    {popupInfo.marker.photo.title || popupInfo.marker.photo.id}
                  </h3>

                  {popupInfo.marker.photo.exif?.DateTimeOriginal && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      📅{' '}
                      {new Date(
                        popupInfo.marker.photo.exif.DateTimeOriginal,
                      ).toLocaleDateString()}
                    </p>
                  )}

                  {popupInfo.marker.photo.exif?.Make &&
                    popupInfo.marker.photo.exif?.Model && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        📸 {popupInfo.marker.photo.exif.Make}{' '}
                        {popupInfo.marker.photo.exif.Model}
                      </p>
                    )}

                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    📍 {popupInfo.latitude.toFixed(6)},{' '}
                    {popupInfo.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </Popup>
        )}

        {/* GeoJSON Layer */}
        {geoJsonData && (
          <Source type="geojson" data={geoJsonData}>
            <Layer {...layerStyle} />
          </Source>
        )}
      </Map>
    </div>
  )
}

export default Mapbox
