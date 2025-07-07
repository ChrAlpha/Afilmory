import { Marker } from 'react-map-gl/mapbox'

import { LazyImage } from '~/components/ui/lazy-image'

import type { ClusterMarkerProps } from './types'

export const SimpleClusterMarker = ({
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
