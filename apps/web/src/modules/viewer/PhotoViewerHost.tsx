import { RootPortal, RootPortalProvider } from '@afilmory/ui'
import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RemoveScroll } from 'react-remove-scroll'

import { viewerAtom } from '~/atoms/viewer'
import { useContextPhotos, usePhotoViewer } from '~/hooks/usePhotoViewer'
import { useTitle } from '~/hooks/useTitle'
import { deriveAccentFromSources } from '~/lib/color'

import { PhotoViewer } from './PhotoViewer'

export const PhotoViewerHost = () => {
  const photoViewer = usePhotoViewer()
  const photos = useContextPhotos()
  const viewerState = useAtomValue(viewerAtom)

  const [ref, setRef] = useState<HTMLElement | null>(null)
  const rootPortalValue = useMemo(
    () => ({
      to: ref as HTMLElement,
    }),
    [ref],
  )

  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const closeViewerRef = useRef(photoViewer.closeViewer)
  closeViewerRef.current = photoViewer.closeViewer

  const isCloseActiveRef = useRef(false)

  const currentPhoto = photos[photoViewer.currentIndex]
  const isViewerMounted = viewerState.isOpen || photoViewer.isOpen || isClosing
  const isOpen = (viewerState.isOpen || photoViewer.isOpen) && !isClosing

  useTitle(isViewerMounted ? currentPhoto?.title || 'Not Found' : null)

  useEffect(() => {
    if (isClosing) {
      isCloseActiveRef.current = false
      setIsClosing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoViewer.currentIndex])

  const handleClose = useCallback(() => {
    isCloseActiveRef.current = true
    setIsClosing(true)
  }, [])

  const handleExitComplete = useCallback(() => {
    if (isCloseActiveRef.current) {
      isCloseActiveRef.current = false
      closeViewerRef.current()
    } else {
      setIsClosing(false)
    }
  }, [])

  useEffect(() => {
    if (!currentPhoto) return

    let isCancelled = false

    ;(async () => {
      try {
        const color = await deriveAccentFromSources({
          thumbHash: currentPhoto.thumbHash,
          thumbnailUrl: currentPhoto.thumbnailUrl,
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
  }, [currentPhoto])

  if (!currentPhoto) {
    return null
  }

  return (
    <RootPortal>
      <RootPortalProvider value={rootPortalValue}>
        <RemoveScroll
          style={
            {
              ...(accentColor ? { '--color-accent': accentColor } : {}),
            } as React.CSSProperties
          }
          ref={setRef}
          className={clsx(isOpen ? 'fixed inset-0 z-9999' : 'pointer-events-none fixed inset-0 z-40')}
        >
          <PhotoViewer
            photos={photos}
            currentIndex={photoViewer.currentIndex}
            isOpen={isOpen}
            triggerElement={photoViewer.triggerElement}
            onClose={handleClose}
            onIndexChange={photoViewer.goToIndex}
            onExitComplete={handleExitComplete}
          />
        </RemoveScroll>
      </RootPortalProvider>
    </RootPortal>
  )
}
