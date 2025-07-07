import type { PhotoManifestItem } from '@afilmory/builder'

export * from './provider'

/**
 * GPS Cardinal directions enum
 */
export enum GPSDirection {
  North = 'N',
  South = 'S',
  East = 'E',
  West = 'W',
}

/**
 * Enhanced GPS coordinates interface with altitude and direction
 */
export interface GPSCoordinates {
  latitude: number
  longitude: number
  altitude?: number
  latitudeRef?: GPSDirection.North | GPSDirection.South
  longitudeRef?: GPSDirection.East | GPSDirection.West
  altitudeRef?: 'Above Sea Level' | 'Below Sea Level'
}

/**
 * Photo marker interface for map display
 */
export interface PhotoMarker {
  id: string
  longitude: number
  latitude: number
  altitude?: number
  latitudeRef?: GPSDirection.North | GPSDirection.South
  longitudeRef?: GPSDirection.East | GPSDirection.West
  altitudeRef?: 'Above Sea Level' | 'Below Sea Level'

  photo: PhotoManifestItem
}

/**
 * Map bounds interface
 */
export interface MapBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  centerLat: number
  centerLng: number
  bounds: [[number, number], [number, number]]
}

/**
 * Map view state interface
 */
export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
}

/**
 * Legacy Mapbox component props (deprecated)
 * @deprecated Use BaseMapProps from provider interface instead
 */
export interface MapboxProps {
  id?: string
  initialViewState?: MapViewState
  markers?: PhotoMarker[]
  geoJsonData?: GeoJSON.FeatureCollection
  onMarkerClick?: (marker: PhotoMarker) => void
  onGeoJsonClick?: (feature: GeoJSON.Feature) => void
  showGeocoder?: boolean
  className?: string
  style?: React.CSSProperties
}
