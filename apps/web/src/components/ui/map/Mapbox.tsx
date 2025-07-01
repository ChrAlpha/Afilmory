'use client'

// Styles
import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'
import Map from 'react-map-gl/mapbox'

import type { PhotoMarker } from '~/types/map'

import { GeoJsonLayer } from './GeoJsonLayer'
import { MapControls } from './MapControls'
import { PhotoMarkerPin } from './PhotoMarkerPin'

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const

// Default values to avoid inline object creation
const DEFAULT_VIEW_STATE = {
  longitude: -122.4,
  latitude: 37.8,
  zoom: 14,
}

const DEFAULT_MARKERS: PhotoMarker[] = []
const DEFAULT_STYLE = { width: '100%', height: '100%' }

export interface PureMapboxProps {
  id?: string
  initialViewState?: {
    longitude: number
    latitude: number
    zoom: number
  }
  markers?: PhotoMarker[]
  geoJsonData?: GeoJSON.FeatureCollection
  onMarkerClick?: (marker: PhotoMarker) => void
  onGeoJsonClick?: (event: any) => void
  onGeolocate?: (longitude: number, latitude: number) => void
  className?: string
  style?: React.CSSProperties
  mapboxToken: string
  mapRef?: React.RefObject<any>
  theme?: 'light' | 'dark'
}

export const Mapbox = ({
  id,
  initialViewState = DEFAULT_VIEW_STATE,
  markers = DEFAULT_MARKERS,
  geoJsonData,
  onMarkerClick,
  onGeoJsonClick,
  onGeolocate,
  className = 'w-full h-full',
  style = DEFAULT_STYLE,
  mapboxToken,
  mapRef,
  theme = 'dark',
}: PureMapboxProps) => {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)

  // Handle marker click
  const handleMarkerClick = (marker: PhotoMarker) => {
    // Toggle selection: if already selected, deselect; otherwise select
    setSelectedMarkerId((prev) => (prev === marker.id ? null : marker.id))
    onMarkerClick?.(marker)
  }

  // Handle marker close
  const handleMarkerClose = () => {
    setSelectedMarkerId(null)
  }
  if (!mapboxToken) {
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
        mapboxAccessToken={mapboxToken}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[theme]}
        interactiveLayerIds={geoJsonData ? ['data'] : undefined}
        onClick={onGeoJsonClick}
      >
        {/* Map Controls */}
        <MapControls onGeolocate={onGeolocate} />

        {/* Photo Markers */}
        {markers.map((marker) => (
          <PhotoMarkerPin
            key={marker.id}
            marker={marker}
            isSelected={selectedMarkerId === marker.id}
            onClick={handleMarkerClick}
            onClose={handleMarkerClose}
          />
        ))}

        {/* GeoJSON Layer */}
        {geoJsonData && <GeoJsonLayer data={geoJsonData} />}
      </Map>
    </div>
  )
}
