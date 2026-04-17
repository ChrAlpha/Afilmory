import { Spring } from '@afilmory/utils'
import clsx from 'clsx'
import { m, type MotionValue } from 'motion/react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ShareModal } from '~/modules/social/ShareModal'
import type { PhotoManifest } from '~/types/photo'

interface PhotoViewerChromeProps {
  currentBlobSrc: string | null
  currentPhoto: PhotoManifest
  isInspectorVisible: boolean
  isMobile: boolean
  isMobileChromeInteractive: boolean
  isViewerChromeVisible: boolean
  chromeOpacity?: MotionValue<number>
  chromeY?: MotionValue<number>
  onClose: () => void
  onOpenDesktopInspector: () => void
  onToggleInspector: () => void
}

const baseButtonClassName =
  'bg-material-ultra-thick flex size-8 items-center justify-center rounded-full text-white backdrop-blur-2xl duration-200 hover:bg-black/40 disabled:cursor-default'

export const PhotoViewerChrome = memo(
  ({
    currentBlobSrc,
    currentPhoto,
    isInspectorVisible,
    isMobile,
    isMobileChromeInteractive,
    isViewerChromeVisible,
    chromeOpacity,
    chromeY,
    onClose,
    onOpenDesktopInspector,
    onToggleInspector,
  }: PhotoViewerChromeProps) => {
    const { t } = useTranslation()
    const interactiveClassName = isMobileChromeInteractive ? 'pointer-events-auto' : 'pointer-events-none'

    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isViewerChromeVisible ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={Spring.presets.snappy}
        className={clsx(
          'pointer-events-none absolute z-30 flex items-center justify-between',
          isMobile ? 'top-2 right-2 left-2' : 'top-4 right-4 left-4',
        )}
        style={isMobile ? { opacity: chromeOpacity, y: chromeY } : undefined}
      >
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              type="button"
              disabled={!isMobileChromeInteractive}
              className={clsx(baseButtonClassName, interactiveClassName, isInspectorVisible && 'bg-accent')}
              onClick={onToggleInspector}
            >
              <i className="i-mingcute-information-line" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ShareModal
            photo={currentPhoto}
            blobSrc={currentBlobSrc || undefined}
            trigger={
              <button
                type="button"
                disabled={!isMobileChromeInteractive}
                className={clsx(baseButtonClassName, interactiveClassName)}
                title={t('photo.share.title')}
              >
                <i className="i-mingcute-share-2-line" />
              </button>
            }
          />

          {!isMobile && !isInspectorVisible && (
            <button
              type="button"
              className={clsx(baseButtonClassName, 'pointer-events-auto')}
              onClick={onOpenDesktopInspector}
              title={t('inspector.tab.info')}
            >
              <i className="i-lucide-panel-right-open" />
            </button>
          )}

          <button
            type="button"
            disabled={!isMobileChromeInteractive}
            className={clsx(baseButtonClassName, interactiveClassName)}
            onClick={onClose}
          >
            <i className="i-mingcute-close-line" />
          </button>
        </div>
      </m.div>
    )
  },
)

PhotoViewerChrome.displayName = 'PhotoViewerChrome'
