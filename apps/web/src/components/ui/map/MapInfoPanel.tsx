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
      className="absolute top-4 right-4 z-40 max-w-sm rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:bg-gray-800/90"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <m.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.4 }}
      >
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('explory.explore.map')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('explory.found.locations', { count: markersCount })}
          </p>
        </div>
      </m.div>

      {bounds && (
        <m.div
          className="mt-3 rounded-md bg-blue-50 p-2 dark:bg-blue-900/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1, delay: 0.5 }}
        >
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">{t('explory.shooting.range')}</span>
            <br />
            {bounds.minLat.toFixed(2)}, {bounds.minLng.toFixed(2)}{' '}
            {t('explory.range.separator')}
            <br />
            {bounds.maxLat.toFixed(2)}, {bounds.maxLng.toFixed(2)}
          </p>
        </m.div>
      )}
    </m.div>
  )
}
