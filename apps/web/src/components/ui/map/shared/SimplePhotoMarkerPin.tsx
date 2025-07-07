import { Marker } from 'react-map-gl/mapbox'

import { LazyImage } from '~/components/ui/lazy-image'

import type { PhotoMarkerPinProps } from './types'

export const SimplePhotoMarkerPin = ({
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
