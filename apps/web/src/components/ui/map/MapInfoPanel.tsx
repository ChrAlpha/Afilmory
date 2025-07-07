import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { MapBounds } from '~/types/map'

interface MapInfoPanelProps {
  markersCount: number
  bounds: MapBounds | null
}

export const MapInfoPanel = ({ markersCount, bounds }: MapInfoPanelProps) => {
  const { t } = useTranslation()

  return (
    <m.div
      className="absolute top-4 right-4 z-40 max-w-sm"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <div className="bg-material-thick border-fill-tertiary rounded-xl border p-5 shadow-xl backdrop-blur-[80px]">
        <m.div
          className="flex items-start gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        >
          {/* Icon container */}
          <div className="bg-blue/10 ring-blue/20 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-1">
            <i className="i-mingcute-map-line" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-text text-lg leading-tight font-semibold">
              {t('explory.explore.map')}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-text-secondary text-sm">
                {t('explory.found.locations', { count: markersCount })}
              </span>
            </div>
          </div>
        </m.div>

        {bounds && (
          <m.div
            className="border-fill-secondary mt-4 border-t pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1, delay: 0.5 }}
          >
            {/* Header with icon */}
            <div className="mb-3 flex items-center gap-2">
              <i className="i-mingcute-location-line" />
              <span className="text-text text-sm font-medium">
                {t('explory.shooting.range')}
              </span>
            </div>

            {/* Coordinate grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-fill-vibrant-quaternary border-fill-tertiary rounded-lg border p-3 text-center">
                <div className="text-text-secondary mb-1 text-xs font-medium tracking-wide uppercase">
                  Min
                </div>
                <div className="text-text font-mono text-sm tabular-nums">
                  {bounds.minLat.toFixed(4)}
                </div>
                <div className="text-text font-mono text-sm tabular-nums">
                  {bounds.minLng.toFixed(4)}
                </div>
              </div>
              <div className="bg-fill-vibrant-quaternary border-fill-tertiary rounded-lg border p-3 text-center">
                <div className="text-text-secondary mb-1 text-xs font-medium tracking-wide uppercase">
                  Max
                </div>
                <div className="text-text font-mono text-sm tabular-nums">
                  {bounds.maxLat.toFixed(4)}
                </div>
                <div className="text-text font-mono text-sm tabular-nums">
                  {bounds.maxLng.toFixed(4)}
                </div>
              </div>
            </div>
          </m.div>
        )}
      </div>
    </m.div>
  )
}
