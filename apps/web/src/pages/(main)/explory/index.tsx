'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { RemoveScroll } from 'react-remove-scroll'

import { MapSection } from '~/components/map/MapSection'
import { RootPortal } from '~/components/ui/portal'

export const Component = () => {
  return (
    <RootPortal>
      <RemoveScroll className="fixed inset-0 z-[9999]">
        <Suspense fallback={<ExploryPageSkeleton />}>
          <ErrorBoundary fallback={<ExploryPageError />}>
            <MapSection />
          </ErrorBoundary>
        </Suspense>
      </RemoveScroll>
    </RootPortal>
  )
}

const ExploryPageSkeleton = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">📍</div>
        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {t('explory.loading.map')}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('explory.parsing.location')}
        </p>
      </div>
    </div>
  )
}

const ExploryPageError = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">❌</div>
        <div className="text-lg font-medium text-red-900 dark:text-red-100">
          地图加载失败
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">
          请检查网络连接或刷新页面重试
        </p>
      </div>
    </div>
  )
}
