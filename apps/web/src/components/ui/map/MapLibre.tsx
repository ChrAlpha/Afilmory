// Styles
import 'maplibre-gl/dist/maplibre-gl.css'

import { useMemo, useState } from 'react'
import Map from 'react-map-gl/maplibre'

import type { PhotoMarker } from '~/types/map'

import {
  ClusterMarker,
  clusterMarkers,
  DEFAULT_MARKERS,
  DEFAULT_STYLE,
  DEFAULT_VIEW_STATE,
  GeoJsonLayer,
  MapControls,
  PhotoMarkerPin,
} from './shared'

// 默认使用 dark 主题
const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

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
