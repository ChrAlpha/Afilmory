'use client'

// Styles
import 'mapbox-gl/dist/mapbox-gl.css'

import { useMemo, useState } from 'react'
import Map from 'react-map-gl/mapbox'

import type { PhotoMarker } from '~/types/map'

import {
  clusterMarkers,
  DEFAULT_MARKERS,
  DEFAULT_STYLE,
  DEFAULT_VIEW_STATE,
  MapControls,
  SimpleClusterMarker,
  SimplePhotoMarkerPin,
} from './shared'
import { MapboxGeoJsonLayer } from './shared/MapboxGeoJsonLayer'

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/dark-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const

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
  const [currentZoom, setCurrentZoom] = useState(initialViewState.zoom)

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

  // Clustered markers
  const clusteredMarkers = useMemo(
    () => clusterMarkers(markers, currentZoom),
    [markers, currentZoom],
  )

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
        onMove={(evt) => {
          setCurrentZoom(evt.viewState.zoom)
        }}
      >
        {/* Map Controls */}
        <MapControls onGeolocate={onGeolocate} />

        {/* Photo Markers */}
        {clusteredMarkers.map((clusterPoint) => {
          if (clusterPoint.properties.cluster) {
            // Render cluster marker
            return (
              <SimpleClusterMarker
                key={`cluster-${clusterPoint.geometry.coordinates[0]}-${clusterPoint.geometry.coordinates[1]}`}
                longitude={clusterPoint.geometry.coordinates[0]}
                latitude={clusterPoint.geometry.coordinates[1]}
                pointCount={clusterPoint.properties.point_count || 0}
                representativeMarker={clusterPoint.properties.marker}
              />
            )
          } else {
            // Render individual marker
            const { marker } = clusterPoint.properties
            if (!marker) return null

            return (
              <SimplePhotoMarkerPin
                key={marker.id}
                marker={marker}
                isSelected={selectedMarkerId === marker.id}
                onClick={handleMarkerClick}
                onClose={handleMarkerClose}
              />
            )
          }
        })}

        {/* GeoJSON Layer */}
        {geoJsonData && <MapboxGeoJsonLayer data={geoJsonData} />}
      </Map>
    </div>
  )
}
