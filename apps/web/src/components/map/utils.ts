import type { PhotoManifestItem } from '@afilmory/builder'

import { ExifToolManager } from '~/lib/exiftool'

import type { PhotoMarker } from './Mapbox'

// GPS coordinate validation function
function isValidGPSCoordinates(
  coords: { latitude: number; longitude: number } | null,
): coords is { latitude: number; longitude: number } {
  if (!coords) return false

  const { latitude, longitude } = coords

  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

// Extract GPS coordinates from photo using EXIF data
async function extractGPSFromPhoto(
  photoUrl: string,
  _s3Key?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Fetch the image as a blob
    const response = await fetch(photoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()

    // Extract EXIF data using ExifToolManager
    const metadata = await ExifToolManager.parse(blob)

    if (!metadata || typeof metadata !== 'object') {
      return null
    }

    // Type assertion for EXIF data structure
    const exifData = metadata as any

    if (!exifData.GPSLatitude || !exifData.GPSLongitude) {
      return null
    }

    let latitude: number
    let longitude: number

    // Handle different coordinate formats
    if (typeof exifData.GPSLatitude === 'string') {
      latitude = Number.parseFloat(exifData.GPSLatitude)
    } else {
      latitude = Number(exifData.GPSLatitude)
    }

    if (typeof exifData.GPSLongitude === 'string') {
      longitude = Number.parseFloat(exifData.GPSLongitude)
    } else {
      longitude = Number(exifData.GPSLongitude)
    }

    // Apply GPS reference directions
    if (
      exifData.GPSLatitudeRef === 'S' ||
      exifData.GPSLatitudeRef === 'South'
    ) {
      latitude = -Math.abs(latitude)
    } else {
      latitude = Math.abs(latitude)
    }

    if (
      exifData.GPSLongitudeRef === 'W' ||
      exifData.GPSLongitudeRef === 'West'
    ) {
      longitude = -Math.abs(longitude)
    } else {
      longitude = Math.abs(longitude)
    }

    const coords = { latitude, longitude }

    // Validate coordinates before returning
    if (isValidGPSCoordinates(coords)) {
      return coords
    }

    return null
  } catch (error) {
    console.warn('Failed to extract GPS coordinates:', error)
    return null
  }
}

/**
 * Convert PhotoManifestItem array to PhotoMarker array by extracting GPS coordinates
 * @param photos Array of PhotoManifestItem
 * @returns Promise<PhotoMarker[]> Array of photos with valid GPS coordinates
 */
export async function convertPhotosToMarkers(
  photos: PhotoManifestItem[],
): Promise<PhotoMarker[]> {
  const validMarkers: PhotoMarker[] = []

  // Process photos in batches to avoid overwhelming the browser
  const batchSize = 5
  for (let i = 0; i < photos.length; i += batchSize) {
    const batch = photos.slice(i, i + batchSize)
    const batchPromises = batch.map(async (photo) => {
      try {
        const gpsCoords = await extractGPSFromPhoto(
          photo.originalUrl,
          photo.s3Key,
        )
        if (isValidGPSCoordinates(gpsCoords)) {
          return {
            id: photo.id,
            longitude: gpsCoords.longitude,
            latitude: gpsCoords.latitude,
            photo,
          } as PhotoMarker
        }
      } catch (error) {
        console.warn(`Failed to extract GPS for photo ${photo.id}:`, error)
      }
      return null
    })

    const batchResults = await Promise.all(batchPromises)
    validMarkers.push(
      ...batchResults.filter(
        (marker): marker is PhotoMarker => marker !== null,
      ),
    )
  }

  return validMarkers
}

/**
 * Convert PhotoManifestItem to PhotoMarker if it has GPS coordinates in EXIF
 * @param photo PhotoManifestItem
 * @returns PhotoMarker | null
 */
export function convertPhotoToMarkerFromEXIF(
  photo: PhotoManifestItem,
): PhotoMarker | null {
  const { exif } = photo

  if (!exif?.GPSLatitude || !exif?.GPSLongitude) {
    return null
  }

  // Convert GPS coordinates from EXIF format to decimal degrees
  let latitude: number
  let longitude: number

  try {
    // Handle different EXIF coordinate formats
    if (typeof exif.GPSLatitude === 'number') {
      latitude = exif.GPSLatitude
    } else {
      latitude = Number(exif.GPSLatitude)
    }

    if (typeof exif.GPSLongitude === 'number') {
      longitude = exif.GPSLongitude
    } else {
      longitude = Number(exif.GPSLongitude)
    }

    // Apply reference direction
    if (exif.GPSLatitudeRef === 'S' || exif.GPSLatitudeRef === 'South') {
      latitude = -latitude
    }

    if (exif.GPSLongitudeRef === 'W' || exif.GPSLongitudeRef === 'West') {
      longitude = -longitude
    }

    // Validate coordinates
    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null
    }

    return {
      id: photo.id,
      longitude,
      latitude,
      photo,
    }
  } catch (error) {
    console.warn(
      `Failed to parse GPS coordinates for photo ${photo.id}:`,
      error,
    )
    return null
  }
}

/**
 * Convert array of PhotoManifestItem to PhotoMarker array using EXIF data
 * @param photos Array of PhotoManifestItem
 * @returns PhotoMarker[] Array of photos with valid GPS coordinates from EXIF
 */
export function convertPhotosToMarkersFromEXIF(
  photos: PhotoManifestItem[],
): PhotoMarker[] {
  return photos
    .map((photo) => convertPhotoToMarkerFromEXIF(photo))
    .filter((marker): marker is PhotoMarker => marker !== null)
}

/**
 * Calculate the bounds and center point for a set of markers
 * @param markers Array of PhotoMarker
 * @returns Bounds and center information
 */
export function calculateMapBounds(markers: PhotoMarker[]) {
  if (markers.length === 0) {
    return null
  }

  const latitudes = markers.map((m) => m.latitude)
  const longitudes = markers.map((m) => m.longitude)

  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
    bounds: [
      [minLng, minLat], // Southwest coordinates
      [maxLng, maxLat], // Northeast coordinates
    ] as [[number, number], [number, number]],
  }
}

/**
 * Get initial view state that fits all markers
 * @param markers Array of PhotoMarker
 * @returns View state object for the map
 */
export function getInitialViewStateForMarkers(markers: PhotoMarker[]) {
  const bounds = calculateMapBounds(markers)

  if (!bounds) {
    // Default view if no markers
    return {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10,
    }
  }

  // Calculate zoom level based on bounds
  const latDiff = bounds.maxLat - bounds.minLat
  const lngDiff = bounds.maxLng - bounds.minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  let zoom = 10
  if (maxDiff < 0.01) zoom = 15
  else if (maxDiff < 0.1) zoom = 12
  else if (maxDiff < 1) zoom = 8
  else if (maxDiff < 10) zoom = 5
  else zoom = 2

  return {
    longitude: bounds.centerLng,
    latitude: bounds.centerLat,
    zoom,
  }
}
