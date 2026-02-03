import { RootPortal, RootPortalProvider } from '@afilmory/ui'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { RemoveScroll } from 'react-remove-scroll'

import { useContextPhotos, usePhotoViewer } from '~/hooks/usePhotoViewer'
import { useTitle } from '~/hooks/useTitle'
import { deriveAccentFromSources } from '~/lib/color'
import { PhotoViewer } from '~/modules/viewer'

export const GlobalPhotoViewer = () => {
  const photoViewer = usePhotoViewer()
  const photos = useContextPhotos()

  const [ref, setRef] = useState<HTMLElement | null>(null)
  const rootPortalValue = useMemo(
    () => ({
      to: ref as HTMLElement,
    }),
    [ref],
  )

  // Only update title if viewer is open
  useTitle(photoViewer.isOpen ? photos[photoViewer.currentIndex]?.title || 'Afilmory' : null)

  const [accentColor, setAccentColor] = useState<string | null>(null)

  useEffect(() => {
    if (!photoViewer.isOpen) return

    const current = photos[photoViewer.currentIndex]
    if (!current) return

    let isCancelled = false

    ;(async () => {
      try {
        const color = await deriveAccentFromSources({
          thumbHash: current.thumbHash,
          thumbnailUrl: current.thumbnailUrl,
        })
        if (!isCancelled) {
          const $css = document.createElement('style')
          $css.textContent = `
         * {
             transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
            }
          `
          document.head.append($css)

          setTimeout(() => {
            $css.remove()
          }, 100)

          setAccentColor(color ?? null)
        }
      } catch {
        if (!isCancelled) setAccentColor(null)
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [photoViewer.currentIndex, photos, photoViewer.isOpen])

  // Don't render anything if not open (optimization, though AnimatePresence inside PhotoViewer handles exit anims)
  // Actually PhotoViewer needs to be mounted for AnimatePresence to work on exit?
  // PhotoViewer has `isOpen` prop.

  // The original code in index.tsx returned NotFound if photo not found.
  // Here we should probably just return null or let PhotoViewer handle it.
  if (!photos[photoViewer.currentIndex] && photoViewer.isOpen) {
    return null
  }

  return (
    <RootPortal>
      <RootPortalProvider value={rootPortalValue}>
        <RemoveScroll
          enabled={photoViewer.isOpen}
          style={
            {
              ...(accentColor ? { '--color-accent': accentColor } : {}),
            } as React.CSSProperties
          }
          ref={setRef}
          // Use viewerState.isOpen to control visibility/pointer events
          className={clsx(photoViewer.isOpen ? 'fixed inset-0 z-9999' : 'pointer-events-none fixed inset-0 z-40')}
        >
          <PhotoViewer
            photos={photos}
            currentIndex={photoViewer.currentIndex}
            isOpen={photoViewer.isOpen}
            triggerElement={photoViewer.triggerElement}
            onClose={photoViewer.closeViewer}
            onIndexChange={photoViewer.goToIndex}
          />
        </RemoveScroll>
      </RootPortalProvider>
    </RootPortal>
  )
}
