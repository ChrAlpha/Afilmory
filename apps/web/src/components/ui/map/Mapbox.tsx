'use client'

// Styles
import 'mapbox-gl/dist/mapbox-gl.css'

import { m } from 'motion/react'
import { useMemo, useState } from 'react'
import type { LayerProps } from 'react-map-gl/mapbox'
import Map, { Layer, Marker, Source, useMap } from 'react-map-gl/mapbox'

import { LazyImage } from '~/components/ui/lazy-image'
import type { PhotoMarker } from '~/types/map'

// Clustering utilities
interface ClusterPoint {
  type: 'Feature'
  properties: {
    cluster?: boolean
    cluster_id?: number
    point_count?: number
    point_count_abbreviated?: string
    marker?: PhotoMarker
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

// Simple clustering algorithm for small datasets
function clusterMarkers(markers: PhotoMarker[], zoom: number): ClusterPoint[] {
  if (markers.length === 0) return []

  // At high zoom levels, don't cluster
  if (zoom >= 15) {
    return markers.map((marker) => ({
      type: 'Feature' as const,
      properties: { marker },
      geometry: {
        type: 'Point' as const,
        coordinates: [marker.longitude, marker.latitude],
      },
    }))
  }

  const clusters: ClusterPoint[] = []
  const processed = new Set<string>()

  // Simple distance-based clustering
  const threshold = Math.max(0.001, 0.01 / Math.pow(2, zoom - 10)) // Adjust threshold based on zoom

  for (const marker of markers) {
    if (processed.has(marker.id)) continue

    const nearby = [marker]
    processed.add(marker.id)

    // Find nearby markers
    for (const other of markers) {
      if (processed.has(other.id)) continue

      const distance = Math.sqrt(
        Math.pow(marker.longitude - other.longitude, 2) +
          Math.pow(marker.latitude - other.latitude, 2),
      )

      if (distance < threshold) {
        nearby.push(other)
        processed.add(other.id)
      }
    }

    if (nearby.length === 1) {
      // Single marker
      clusters.push({
        type: 'Feature',
        properties: { marker },
        geometry: {
          type: 'Point',
          coordinates: [marker.longitude, marker.latitude],
        },
      })
    } else {
      // Cluster
      const centerLng =
        nearby.reduce((sum, m) => sum + m.longitude, 0) / nearby.length
      const centerLat =
        nearby.reduce((sum, m) => sum + m.latitude, 0) / nearby.length

      clusters.push({
        type: 'Feature',
        properties: {
          cluster: true,
          point_count: nearby.length,
          point_count_abbreviated: nearby.length.toString(),
          marker: nearby[0], // Representative marker for the cluster
        },
        geometry: {
          type: 'Point',
          coordinates: [centerLng, centerLat],
        },
      })
    }
  }

  return clusters
}

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/dark-v11',
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
              <ClusterMarker
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
              <PhotoMarkerPin
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
        {geoJsonData && <GeoJsonLayer data={geoJsonData} />}
      </Map>
    </div>
  )
}

const DEFAULT_LAYER_STYLE: LayerProps = {
  id: 'data',
  type: 'fill',
  paint: {
    'fill-color': '#0080ff',
    'fill-opacity': 0.5,
  },
}

interface GeoJsonLayerProps {
  data: GeoJSON.FeatureCollection
  layerStyle?: LayerProps
}

interface MapControlsProps {
  onGeolocate?: (longitude: number, latitude: number) => void
}

interface PhotoMarkerPinProps {
  marker: PhotoMarker
  isSelected?: boolean
  onClick?: (marker: PhotoMarker) => void
  onClose?: () => void
}

interface ClusterMarkerProps {
  longitude: number
  latitude: number
  pointCount: number
  representativeMarker?: PhotoMarker
}

const GeoJsonLayer = ({
  data,
  layerStyle = DEFAULT_LAYER_STYLE,
}: GeoJsonLayerProps) => {
  return (
    <Source type="geojson" data={data}>
      <Layer {...layerStyle} />
    </Source>
  )
}

const MapControls = ({ onGeolocate }: MapControlsProps) => {
  const { current: map } = useMap()

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom()
      map.easeTo({ zoom: currentZoom + 1, duration: 300 })
    }
  }

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom()
      map.easeTo({ zoom: currentZoom - 1, duration: 300 })
    }
  }

  const handleCompass = () => {
    if (map) {
      map.easeTo({ bearing: 0, pitch: 0, duration: 500 })
    }
  }

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords
          if (map) {
            map.flyTo({
              center: [longitude, latitude],
              zoom: 14,
              duration: 1000,
            })
          }
          onGeolocate?.(longitude, latitude)
        },
        (error) => {
          console.warn('Geolocation error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      )
    }
  }

  return (
    <m.div
      className="absolute bottom-4 left-4 z-40 flex flex-col gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Control Group Container */}
      <div className="bg-material-thick border-fill-tertiary flex flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-[120px]">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="放大"
        >
          <i className="i-mingcute-add-line text-text transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>

        {/* Divider */}
        <div className="bg-fill-secondary h-px w-full" />

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="缩小"
        >
          <i className="i-mingcute-subtract-line text-text transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Compass Button */}
      <div className="bg-material-thick border-fill-tertiary overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-[120px]">
        <button
          onClick={handleCompass}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="重置方向"
        >
          <i className="i-mingcute-navigation-line text-text transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Geolocate Button */}
      <div className="bg-material-thick border-fill-tertiary overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-[120px]">
        <button
          onClick={handleGeolocate}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="定位到我的位置"
        >
          <i className="i-mingcute-location-line text-text transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>
    </m.div>
  )
}

const ClusterMarker = ({
  longitude,
  latitude,
  pointCount,
  representativeMarker,
}: ClusterMarkerProps) => {
  const size = Math.min(50, Math.max(32, 24 + Math.log(pointCount) * 8))

  return (
    <Marker longitude={longitude} latitude={latitude}>
      <div className="group relative">
        {/* Cluster circle */}
        <div
          className="flex items-center justify-center rounded-full border-3 border-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg transition-all hover:scale-110 hover:from-blue-600 hover:to-blue-700"
          style={{
            width: size,
            height: size,
          }}
        >
          {/* Background thumbhash if available */}
          {representativeMarker?.photo.thumbHash && (
            <div className="absolute inset-1 overflow-hidden rounded-full opacity-30">
              <LazyImage
                src={
                  representativeMarker.photo.thumbnailUrl ||
                  representativeMarker.photo.originalUrl
                }
                alt={
                  representativeMarker.photo.title ||
                  representativeMarker.photo.id
                }
                thumbHash={representativeMarker.photo.thumbHash}
                className="h-full w-full object-cover"
                rootMargin="100px"
                threshold={0.1}
              />
            </div>
          )}

          {/* Count text */}
          <span
            className="relative z-10 font-bold text-white drop-shadow-sm"
            style={{ fontSize: Math.max(12, size / 4) }}
          >
            {pointCount}
          </span>
        </div>

        {/* Hover tooltip */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 transform rounded bg-black/75 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
          {pointCount} photos in this area
        </div>
      </div>
    </Marker>
  )
}

const PhotoMarkerPin = ({
  marker,
  isSelected = false,
  onClick,
  onClose,
}: PhotoMarkerPinProps) => {
  const handleClick = () => {
    onClick?.(marker)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.()
  }

  return (
    <Marker
      key={marker.id}
      longitude={marker.longitude}
      latitude={marker.latitude}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
    >
      <div className="group relative">
        {/* Marker icon */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg transition-all hover:scale-110 ${
            isSelected
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          <span className="text-xs font-semibold text-white">📷</span>
        </div>

        {/* Hover tooltip */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 transform rounded bg-black/75 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
          {marker.photo.title || marker.photo.id}
        </div>

        {/* Selected popup */}
        {isSelected && (
          <div className="absolute -top-64 left-1/2 z-50 -translate-x-1/2 transform">
            <div className="relative w-64 overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
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

              {/* Photo */}
              <div className="relative">
                <LazyImage
                  src={marker.photo.thumbnailUrl || marker.photo.originalUrl}
                  alt={marker.photo.title || marker.photo.id}
                  thumbHash={marker.photo.thumbHash}
                  className="h-32 w-full"
                  rootMargin="200px"
                  threshold={0.1}
                />
              </div>

              {/* Info */}
              <div className="space-y-2 p-4">
                <h3
                  className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
                  title={marker.photo.title || marker.photo.id}
                >
                  {marker.photo.title || marker.photo.id}
                </h3>

                {marker.photo.exif?.DateTimeOriginal && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    📅{' '}
                    {new Date(
                      marker.photo.exif.DateTimeOriginal,
                    ).toLocaleDateString()}
                  </p>
                )}

                {marker.photo.exif?.Make && marker.photo.exif?.Model && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    📸 {marker.photo.exif.Make} {marker.photo.exif.Model}
                  </p>
                )}

                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                  <p>
                    📍 {Math.abs(marker.latitude).toFixed(6)}°
                    {marker.latitudeRef || 'N'},{' '}
                    {Math.abs(marker.longitude).toFixed(6)}°
                    {marker.longitudeRef || 'E'}
                  </p>
                  {marker.altitude !== undefined && (
                    <p>
                      🏔️ {marker.altitudeRef === 'Below Sea Level' ? '-' : ''}
                      {Math.abs(marker.altitude).toFixed(1)}m
                      <span className="ml-1 text-gray-400 dark:text-gray-600">
                        {marker.altitudeRef === 'Below Sea Level'
                          ? '海平面以下'
                          : '海拔'}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Arrow pointing to marker */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform">
                <div className="h-4 w-4 rotate-45 bg-white dark:bg-gray-800" />
              </div>
            </div>
          </div>
        )}
      </div>
    </Marker>
  )
}
