// Styles
import 'maplibre-gl/dist/maplibre-gl.css'

import { m } from 'motion/react'
import { useMemo, useState } from 'react'
import type { LayerProps } from 'react-map-gl/maplibre'
import Map, { Layer, Marker, Source, useMap } from 'react-map-gl/maplibre'
import { Link } from 'react-router'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '~/components/ui/hover-card'
import { LazyImage } from '~/components/ui/lazy-image'
import type { PhotoMarker } from '~/types/map'

import { GlassButton } from '../button/GlassButton'
import { ClusterPhotoGrid } from './ClusterPhotoGrid'

// Clustering utilities
interface ClusterPoint {
  type: 'Feature'
  properties: {
    cluster?: boolean
    cluster_id?: number
    point_count?: number
    point_count_abbreviated?: string
    marker?: PhotoMarker
    clusteredPhotos?: PhotoMarker[]
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
          clusteredPhotos: nearby, // All photos in the cluster
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

// 默认使用 dark 主题
const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

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
  onClusterClick?: (longitude: number, latitude: number) => void
  className?: string
  style?: React.CSSProperties
  mapRef?: React.RefObject<any>
}

export const Maplibre = ({
  id,
  initialViewState = DEFAULT_VIEW_STATE,
  markers = DEFAULT_MARKERS,
  geoJsonData,
  onMarkerClick,
  onGeoJsonClick,
  onGeolocate,
  onClusterClick,
  className = 'w-full h-full',
  style = DEFAULT_STYLE,
  mapRef,
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
        mapStyle={MAP_STYLE}
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
                clusteredPhotos={clusterPoint.properties.clusteredPhotos}
                onClusterClick={onClusterClick}
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
  clusteredPhotos?: PhotoMarker[]
  onClusterClick?: (longitude: number, latitude: number) => void
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
          type="button"
          onClick={handleZoomIn}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="放大"
        >
          <i className="i-mingcute-add-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>

        {/* Divider */}
        <div className="bg-fill-secondary h-px w-full" />

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="缩小"
        >
          <i className="i-mingcute-minimize-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Compass Button */}
      <div className="bg-material-thick border-fill-tertiary overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-[120px]">
        <button
          type="button"
          onClick={handleCompass}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="重置方向"
        >
          <i className="i-mingcute-navigation-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Geolocate Button */}
      <div className="bg-material-thick border-fill-tertiary overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-[120px]">
        <button
          type="button"
          onClick={handleGeolocate}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex h-12 w-12 items-center justify-center transition-colors"
          title="定位到我的位置"
        >
          <i className="i-mingcute-location-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>
    </m.div>
  )
}

const ClusterMarker = ({
  longitude,
  latitude,
  pointCount,
  representativeMarker: _representativeMarker,
  clusteredPhotos = [],
  onClusterClick,
}: ClusterMarkerProps) => {
  const size = Math.min(64, Math.max(40, 32 + Math.log(pointCount) * 8))

  return (
    <Marker longitude={longitude} latitude={latitude}>
      <HoverCard openDelay={300} closeDelay={150}>
        <HoverCardTrigger asChild>
          <m.div
            className="group relative cursor-pointer"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClusterClick?.(longitude, latitude)}
          >
            {/* Subtle pulse ring for attention */}
            <div
              className="bg-blue/20 absolute inset-0 animate-pulse rounded-full opacity-60"
              style={{
                width: size + 12,
                height: size + 12,
                left: -6,
                top: -6,
              }}
            />

            {/* Main cluster container */}
            <div
              className="relative flex items-center justify-center rounded-full border border-white/40 bg-white/95 shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white hover:shadow-xl dark:border-white/10 dark:bg-black/80 dark:hover:bg-black/90"
              style={{
                width: size,
                height: size,
              }}
            >
              {/* Background mosaic of photos */}
              {clusteredPhotos.length > 0 && (
                <div className="absolute inset-1 overflow-hidden rounded-full">
                  {/* Show up to 4 photos in a mosaic pattern */}
                  {clusteredPhotos.slice(0, 4).map((photoMarker, index) => {
                    const positions = [
                      { left: '0%', top: '0%', width: '50%', height: '50%' },
                      { left: '50%', top: '0%', width: '50%', height: '50%' },
                      { left: '0%', top: '50%', width: '50%', height: '50%' },
                      { left: '50%', top: '50%', width: '50%', height: '50%' },
                    ]
                    const position = positions[index]

                    return (
                      <div
                        key={photoMarker.photo.id}
                        className="absolute opacity-30"
                        style={position}
                      >
                        <LazyImage
                          src={
                            photoMarker.photo.thumbnailUrl ||
                            photoMarker.photo.originalUrl
                          }
                          alt={photoMarker.photo.title || photoMarker.photo.id}
                          thumbHash={photoMarker.photo.thumbHash}
                          className="h-full w-full object-cover"
                          rootMargin="100px"
                          threshold={0.1}
                        />
                      </div>
                    )
                  })}

                  {/* Overlay for mosaic effect */}
                  <div className="from-blue/40 to-indigo/60 absolute inset-0 bg-gradient-to-br" />
                </div>
              )}

              {/* Glass morphism overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5" />

              {/* Count display */}
              <div className="relative z-10 flex flex-col items-center text-xs">
                <span className="text-text font-bold">{pointCount}</span>
              </div>

              {/* Subtle inner shadow for depth */}
              <div className="absolute inset-0 rounded-full shadow-inner shadow-black/5" />
            </div>
          </m.div>
        </HoverCardTrigger>

        <HoverCardContent
          className="w-80 overflow-hidden border-white/20 bg-white/95 p-0 backdrop-blur-[120px] dark:bg-black/95"
          side="top"
          align="center"
          sideOffset={8}
        >
          <div className="p-4">
            <ClusterPhotoGrid
              photos={clusteredPhotos}
              onPhotoClick={(_photo) => {
                // Optional: handle individual photo clicks
                // Photo click handling can be implemented here if needed
              }}
            />
          </div>
        </HoverCardContent>
      </HoverCard>
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
      <HoverCard openDelay={400} closeDelay={100}>
        <HoverCardTrigger asChild>
          <m.div
            className="group relative cursor-pointer"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClick}
          >
            {/* Selection ring */}
            {isSelected && (
              <div className="bg-blue/30 absolute inset-0 -m-2 animate-pulse rounded-full" />
            )}

            {/* Photo background preview */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <LazyImage
                src={marker.photo.thumbnailUrl || marker.photo.originalUrl}
                alt={marker.photo.title || marker.photo.id}
                thumbHash={marker.photo.thumbHash}
                className="h-full w-full object-cover opacity-40"
                rootMargin="100px"
                threshold={0.1}
              />
              {/* Overlay */}
              <div className="from-green/60 to-emerald/80 dark:from-green/70 dark:to-emerald/90 absolute inset-0 bg-gradient-to-br" />
            </div>

            {/* Main marker container */}
            <div
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl ${
                isSelected
                  ? 'border-blue/40 bg-blue/90 shadow-blue/50 dark:border-blue/30 dark:bg-blue/80'
                  : 'border-white/40 bg-white/95 hover:bg-white dark:border-white/20 dark:bg-black/80 dark:hover:bg-black/90'
              }`}
            >
              {/* Glass morphism overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5" />

              {/* Camera icon */}
              <i
                className={`i-mingcute-camera-line relative z-10 text-lg drop-shadow-sm ${
                  isSelected ? 'text-white' : 'text-gray-700 dark:text-white'
                }`}
              />

              {/* Subtle inner shadow for depth */}
              <div className="absolute inset-0 rounded-full shadow-inner shadow-black/5" />
            </div>
          </m.div>
        </HoverCardTrigger>

        <HoverCardContent
          className="w-80 overflow-hidden border-white/20 bg-white/95 p-0 backdrop-blur-[120px] dark:bg-black/95"
          side="top"
          align="center"
          sideOffset={8}
        >
          <div className="relative">
            {/* Photo header */}
            <div className="relative h-32 overflow-hidden">
              <LazyImage
                src={marker.photo.thumbnailUrl || marker.photo.originalUrl}
                alt={marker.photo.title || marker.photo.id}
                thumbHash={marker.photo.thumbHash}
                className="h-full w-full object-cover"
                rootMargin="200px"
                threshold={0.1}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* Content */}
            <div className="space-y-3 p-4">
              {/* Title with link */}
              <Link
                to={`/${marker.photo.id}`}
                target="_blank"
                className="group/link hover:text-blue flex items-center gap-2 transition-colors"
              >
                <h3
                  className="text-text flex-1 truncate text-sm font-semibold"
                  title={marker.photo.title || marker.photo.id}
                >
                  {marker.photo.title || marker.photo.id}
                </h3>
                <i className="i-mingcute-arrow-right-line text-text-secondary transition-transform group-hover/link:translate-x-0.5" />
              </Link>

              {/* Metadata */}
              <div className="space-y-2">
                {marker.photo.exif?.DateTimeOriginal && (
                  <div className="text-text-secondary flex items-center gap-2 text-xs">
                    <i className="i-mingcute-calendar-line text-sm" />
                    <span>
                      {new Date(
                        marker.photo.exif.DateTimeOriginal,
                      ).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {marker.photo.exif?.Make && marker.photo.exif?.Model && (
                  <div className="text-text-secondary flex items-center gap-2 text-xs">
                    <i className="i-mingcute-camera-line text-sm" />
                    <span className="truncate">
                      {marker.photo.exif.Make} {marker.photo.exif.Model}
                    </span>
                  </div>
                )}

                <div className="text-text-secondary space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <i className="i-mingcute-location-line text-sm" />
                    <span className="font-mono">
                      {Math.abs(marker.latitude).toFixed(4)}°
                      {marker.latitudeRef || 'N'},{' '}
                      {Math.abs(marker.longitude).toFixed(4)}°
                      {marker.longitudeRef || 'E'}
                    </span>
                  </div>
                  {marker.altitude !== undefined && (
                    <div className="flex items-center gap-2">
                      <i className="i-mingcute-mountain-2-line text-sm" />
                      <span className="font-mono">
                        {marker.altitudeRef === 'Below Sea Level' ? '-' : ''}
                        {Math.abs(marker.altitude).toFixed(1)}m
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Enhanced popup for selected state */}
      {isSelected && (
        <m.div
          className="absolute -top-80 left-1/2 z-50 -translate-x-1/2 transform"
          initial={{ y: 20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="border-fill-tertiary bg-material-thick relative w-72 cursor-default overflow-hidden rounded-xl border shadow-2xl backdrop-blur-[80px]">
            {/* Close button */}
            <GlassButton
              className="absolute top-3 right-3 z-10 size-8"
              onClick={handleClose}
            >
              <i className="i-mingcute-close-line text-lg" />
            </GlassButton>

            {/* Photo container */}
            <div className="relative overflow-hidden">
              <LazyImage
                src={marker.photo.thumbnailUrl || marker.photo.originalUrl}
                alt={marker.photo.title || marker.photo.id}
                thumbHash={marker.photo.thumbHash}
                className="h-40 w-full object-cover"
                rootMargin="200px"
                threshold={0.1}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 p-4">
              {/* Title with link */}
              <Link
                to={`/${marker.photo.id}`}
                target="_blank"
                className="group/link hover:text-blue flex items-center gap-2 transition-colors"
              >
                <h3
                  className="text-text flex-1 truncate text-base font-semibold"
                  title={marker.photo.title || marker.photo.id}
                >
                  {marker.photo.title || marker.photo.id}
                </h3>
                <i className="i-mingcute-arrow-right-line" />
              </Link>

              {/* Metadata */}
              <div className="space-y-2">
                {marker.photo.exif?.DateTimeOriginal && (
                  <div className="text-text-secondary flex items-center gap-2 text-sm">
                    <i className="i-mingcute-calendar-line" />
                    <span className="text-xs">
                      {new Date(
                        marker.photo.exif.DateTimeOriginal,
                      ).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {marker.photo.exif?.Make && marker.photo.exif?.Model && (
                  <div className="text-text-secondary flex items-center gap-2 text-sm">
                    <i className="i-mingcute-camera-line" />
                    <span className="truncate text-xs">
                      {marker.photo.exif.Make} {marker.photo.exif.Model}
                    </span>
                  </div>
                )}

                <div className="text-text-secondary space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <i className="i-mingcute-location-line" />
                    <span className="font-mono text-xs">
                      {Math.abs(marker.latitude).toFixed(6)}°
                      {marker.latitudeRef || 'N'},{' '}
                      {Math.abs(marker.longitude).toFixed(6)}°
                      {marker.longitudeRef || 'E'}
                    </span>
                  </div>
                  {marker.altitude !== undefined && (
                    <div className="flex items-center gap-2">
                      <i className="i-mingcute-mountain-2-line" />
                      <span className="font-mono text-xs">
                        {marker.altitudeRef === 'Below Sea Level' ? '-' : ''}
                        {Math.abs(marker.altitude).toFixed(1)}m
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </m.div>
      )}
    </Marker>
  )
}
