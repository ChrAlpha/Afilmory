// Styles
import 'maplibre-gl/dist/maplibre-gl.css'

import { m } from 'motion/react'
import { useMemo, useState } from 'react'
import type { LayerProps } from 'react-map-gl/maplibre'
import Map, {
  GeolocateControl,
  Layer,
  Marker,
  NavigationControl,
  Source,
} from 'react-map-gl/maplibre'
import { Link } from 'react-router'

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
  light: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const

// Default values to avoid inline object creation
const DEFAULT_VIEW_STATE = {
  longitude: -122.4,
  latitude: 37.8,
  zoom: 14,
}

const DEFAULT_MARKERS: PhotoMarker[] = []
const DEFAULT_STYLE = { width: '100%', height: '100%' }

export interface PureMaplibreProps {
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
  mapRef?: React.RefObject<any>
  theme?: 'light' | 'dark'
}

export const Maplibre = ({
  id,
  initialViewState = DEFAULT_VIEW_STATE,
  markers = DEFAULT_MARKERS,
  geoJsonData,
  onMarkerClick,
  onGeoJsonClick,
  onGeolocate,
  className = 'w-full h-full',
  style = DEFAULT_STYLE,
  mapRef,
  theme = 'dark',
}: PureMaplibreProps) => {
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

  const mapStyle = `${MAP_STYLES[theme]}`

  // Clustered markers
  const clusteredMarkers = useMemo(
    () => clusterMarkers(markers, currentZoom),
    [markers, currentZoom],
  )

  return (
    <div className={className} style={style}>
      <Map
        id={id}
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
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

// Default layer style
const DEFAULT_LAYER_STYLE: LayerProps = {
  id: 'data',
  type: 'fill',
  paint: {
    'fill-color': '#0080ff',
    'fill-opacity': 0.5,
  },
}

// Component interfaces
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

// Component implementations
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
  return (
    <>
      <NavigationControl position="bottom-left" />
      <GeolocateControl
        position="bottom-left"
        trackUserLocation
        onGeolocate={(e) => {
          onGeolocate?.(e.coords.longitude, e.coords.latitude)
        }}
      />
    </>
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
    >
      <div className="group relative">
        {/* Marker icon */}
        <div
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-lg transition-all hover:scale-110 ${
            isSelected
              ? 'bg-accent hover:bg-accent'
              : 'bg-accent/50 hover:bg-accent/70'
          }`}
          onClick={handleClick}
        >
          <span className="text-xs font-semibold text-white">
            <i className="i-mingcute-camera-2-ai-fill" />
          </span>
        </div>

        {/* Hover tooltip */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 transform rounded bg-black/75 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
          {marker.photo.title || marker.photo.id}
        </div>

        {/* Selected popup */}
        {isSelected && (
          <m.div
            className="absolute -top-68 left-1/2 z-50 -translate-x-1/2 transform"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="relative w-64 cursor-default rounded-lg bg-white shadow-xl dark:bg-gray-800">
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-2 right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/70"
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
              <div className="relative overflow-hidden rounded-t-lg">
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
              <div className="flex flex-col gap-2 p-4">
                <Link to={`/${marker.photo.id}`} target="_blank">
                  <h3
                    className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
                    title={marker.photo.title || marker.photo.id}
                  >
                    {marker.photo.title || marker.photo.id}
                    <i className="i-mingcute-link-2-fill ml-1 text-xs text-gray-500" />
                  </h3>
                </Link>

                {marker.photo.exif?.DateTimeOriginal && (
                  <p className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <i className="i-mingcute-calendar-2-line" />
                    {new Date(
                      marker.photo.exif.DateTimeOriginal,
                    ).toLocaleDateString()}
                  </p>
                )}

                {marker.photo.exif?.Make && marker.photo.exif?.Model && (
                  <p className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <i className="i-mingcute-camera-2-line" />
                    {marker.photo.exif.Make} {marker.photo.exif.Model}
                  </p>
                )}

                <p className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <i className="i-mingcute-map-line" />
                  {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
                </p>
              </div>

              {/* Arrow pointing to marker */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform">
                <div className="h-4 w-4 rotate-45 bg-white dark:bg-gray-800" />
              </div>
            </div>
          </m.div>
        )}
      </div>
    </Marker>
  )
}
