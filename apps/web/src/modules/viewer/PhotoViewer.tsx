import './PhotoViewer.css'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'

import { Thumbhash } from '@afilmory/ui'
import { Spring } from '@afilmory/utils'
import { AnimatePresence, m } from 'motion/react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { Swiper as SwiperType } from 'swiper'

import { useMobile } from '~/hooks/useMobile'
import type { LoadingIndicatorRef } from '~/modules/inspector/LoadingIndicator'
import { LoadingIndicator } from '~/modules/inspector/LoadingIndicator'
import { PhotoInspector } from '~/modules/inspector/PhotoInspector'
import type { PhotoManifest } from '~/types/photo'

import { PhotoViewerTransitionPreview } from './animations/PhotoViewerTransitionPreview'
import type { AnimationFrameRect } from './animations/types'
import { viewerUiOffsets, viewerUiTransition } from './animations/uiTransitions'
import { usePhotoViewerTransitions } from './animations/usePhotoViewerTransitions'
import { computeViewerImageFrame, projectViewerImageFrame } from './animations/utils'
import { GalleryThumbnail } from './GalleryThumbnail'
import { MobilePhotoInspectorSheet } from './MobilePhotoInspectorSheet'
import { PhotoViewerChrome } from './PhotoViewerChrome'
import { PhotoViewerSlides } from './PhotoViewerSlides'
import type { MobilePhotoViewerDismissSnapshot } from './usePhotoViewerMobileInteractions'
import { usePhotoViewerMobileInteractions } from './usePhotoViewerMobileInteractions'

interface PhotoViewerProps {
  photos: PhotoManifest[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onDragDismiss?: (frame: AnimationFrameRect) => void
  onIndexChange: (index: number) => void
  triggerElement: HTMLElement | null
  onExitComplete?: () => void
}

export const PhotoViewer = ({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onDragDismiss,
  onIndexChange,
  triggerElement,
  onExitComplete,
}: PhotoViewerProps) => {
  const isMobile = useMobile()
  const swiperRef = useRef<SwiperType | null>(null)
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  const [isDesktopInspectorVisible, setIsDesktopInspectorVisible] = useState(!isMobile)
  const [currentBlobSrc, setCurrentBlobSrc] = useState<string | null>(null)
  const [dragDismissExitFrame, setDragDismissExitFrame] = useState<AnimationFrameRect | null>(null)
  const [isCurrentImageVisualReady, setIsCurrentImageVisualReady] = useState(false)

  const currentPhoto = photos[currentIndex]
  const {
    containerRef,
    entryTransition,
    exitTransition,
    isViewerContentVisible,
    isEntryAnimating,
    shouldRenderBackdrop,
    thumbHash: transitionThumbHash,
    shouldRenderThumbhash,
    handleEntryTransitionReady,
    handleEntryTransitionComplete,
    handleExitAnimationComplete,
  } = usePhotoViewerTransitions({
    exitOverrideFrame: dragDismissExitFrame,
    isOpen,
    triggerElement,
    currentPhoto,
    currentBlobSrc,
    isMobile,
    onExitComplete,
  })

  const handleCloseRequest = useCallback(() => {
    setDragDismissExitFrame(null)
    onClose()
  }, [onClose])

  const handleDragDismiss = useCallback(
    (snapshot: MobilePhotoViewerDismissSnapshot) => {
      if (!currentPhoto) {
        handleCloseRequest()
        return
      }

      const viewportRect =
        containerRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      const baseFrame = computeViewerImageFrame(currentPhoto, viewportRect, true)
      const projectedFrame = projectViewerImageFrame(baseFrame, viewportRect, snapshot)

      setDragDismissExitFrame(projectedFrame)
      onDragDismiss?.(projectedFrame)
      onClose()
    },
    [containerRef, currentPhoto, handleCloseRequest, onClose, onDragDismiss],
  )

  const {
    bindStage,
    closeInspector,
    dismissX,
    inspectorProgress,
    isInspectorVisible: isMobileInspectorVisible,
    isVerticalGestureActive,
    reset: resetMobileInteractions,
    stageHintOpacity,
    stageHintY,
    thumbnailsOpacity,
    thumbnailsY,
    toggleInspector,
    viewerBorderRadius,
    viewerLiftY,
    viewerRotate,
    viewerScale,
    backdropOpacity,
    chromeOpacity,
    chromeY,
  } = usePhotoViewerMobileInteractions({
    enabled: isMobile && isOpen,
    isImageZoomed,
    onDismiss: handleDragDismiss,
  })
  const isInspectorVisible = isMobile ? isMobileInspectorVisible : isDesktopInspectorVisible
  const isMobileChromeInteractive = !isMobile || !isMobileInspectorVisible
  const isViewerChromeVisible = isMobile ? isViewerContentVisible : isOpen
  const isThumbnailRailVisible = isMobile ? isViewerContentVisible : isOpen
  const isDesktopInspectorAnimatedVisible = isMobile ? isViewerContentVisible : isOpen

  useEffect(() => {
    if (isOpen) {
      setDragDismissExitFrame(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setIsCurrentImageVisualReady(false)
      return
    }

    if (!triggerElement) {
      setIsCurrentImageVisualReady(true)
    }
  }, [isOpen, triggerElement])

  useEffect(() => {
    if (entryTransition?.variant === 'entry') {
      setIsCurrentImageVisualReady(false)
    }
  }, [entryTransition])

  useEffect(() => {
    if (!isOpen) {
      setIsImageZoomed(false)
      setIsDesktopInspectorVisible(!isMobile)
      setCurrentBlobSrc(null)
      if (!dragDismissExitFrame) {
        resetMobileInteractions()
      }
    }
  }, [dragDismissExitFrame, isMobile, isOpen, resetMobileInteractions])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      // Only trigger swiper movement - onSlideChange will call onIndexChange
      swiperRef.current?.slidePrev()
    }
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      // Only trigger swiper movement - onSlideChange will call onIndexChange
      swiperRef.current?.slideNext()
    }
  }, [currentIndex, photos.length])

  // 同步 Swiper 的索引
  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== currentIndex) {
      swiperRef.current.slideTo(currentIndex, 300)
    }
    // 切换图片时重置缩放状态
    setDragDismissExitFrame(null)
    setIsImageZoomed(false)
    if (isMobile) {
      resetMobileInteractions()
    }
  }, [currentIndex, isMobile, resetMobileInteractions])

  // 当图片缩放状态改变时，控制 Swiper 的触摸行为
  useEffect(() => {
    if (swiperRef.current) {
      if (isImageZoomed || (isMobile && (isVerticalGestureActive || isInspectorVisible))) {
        // 图片被缩放时，禁用 Swiper 的触摸滑动
        swiperRef.current.allowTouchMove = false
      } else {
        // 图片未缩放时，启用 Swiper 的触摸滑动
        swiperRef.current.allowTouchMove = true
      }
    }
  }, [isImageZoomed, isInspectorVisible, isMobile, isVerticalGestureActive])

  const loadingIndicatorRef = useRef<LoadingIndicatorRef>(null)
  // 处理图片缩放状态变化
  const handleZoomChange = useCallback((isZoomed: boolean) => {
    setIsImageZoomed(isZoomed)
  }, [])

  const handleOpenDesktopInspector = useCallback(() => {
    setIsDesktopInspectorVisible(true)
  }, [])

  const handleCloseDesktopInspector = useCallback(() => {
    setIsDesktopInspectorVisible(false)
  }, [])

  // 处理 blobSrc 变化
  const handleBlobSrcChange = useCallback((blobSrc: string | null) => {
    setCurrentBlobSrc(blobSrc)
  }, [])

  useEffect(() => {
    if (isMobile && isImageZoomed && isInspectorVisible) {
      closeInspector()
    }
  }, [closeInspector, isImageZoomed, isInspectorVisible, isMobile])

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft': {
          event.preventDefault()
          handlePrevious()
          break
        }
        case 'ArrowRight': {
          event.preventDefault()
          handleNext()
          break
        }
        case 'Escape': {
          event.preventDefault()
          handleCloseRequest()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleCloseRequest, handlePrevious, handleNext])

  if (!currentPhoto) return null

  const currentThumbHash = transitionThumbHash
  const shouldMountImageStage = isViewerContentVisible || !triggerElement
  const shouldShowEntryImageCatchup = Boolean(
    isOpen && triggerElement && (Boolean(entryTransition?.variant === 'entry') || !isCurrentImageVisualReady),
  )

  return (
    <>
      <AnimatePresence>
        {shouldRenderBackdrop && (
          <m.div
            key="photo-viewer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={Spring.presets.snappy}
            className="pointer-events-none fixed inset-0"
          >
            <m.div
              className="bg-material-opaque absolute inset-0"
              style={isMobile ? { opacity: backdropOpacity } : undefined}
            />
          </m.div>
        )}
      </AnimatePresence>
      {/* 固定背景层防止透出 */}
      {/* 交叉溶解的 Blurhash 背景 */}
      <AnimatePresence mode="sync">
        {shouldRenderThumbhash && (
          <m.div
            key={`${currentPhoto.id}-thumbhash`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={Spring.presets.snappy}
            className="pointer-events-none fixed inset-0"
          >
            {currentThumbHash && <Thumbhash thumbHash={currentThumbHash} className="size-fill scale-110" />}
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <m.div
            ref={containerRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              touchAction: isMobile ? 'manipulation' : 'none',
              pointerEvents: !isViewerContentVisible || isEntryAnimating ? 'none' : 'auto',
            }}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={Spring.presets.snappy}
          >
            <div className={`flex size-full ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <div className="z-1 flex min-h-0 min-w-0 flex-1 flex-col" {...(isMobile ? bindStage() : {})}>
                <m.div
                  className={`flex min-h-0 min-w-0 flex-1 flex-col ${isMobile ? 'overflow-hidden' : ''}`}
                  style={
                    isMobile
                      ? {
                          x: dismissX,
                          y: viewerLiftY,
                          scale: viewerScale,
                          rotate: viewerRotate,
                          borderRadius: viewerBorderRadius,
                          transformOrigin: '50% 18%',
                          touchAction: 'none',
                        }
                      : undefined
                  }
                >
                  <m.div
                    className="group/photo-viewer relative flex min-h-0 min-w-0 flex-1"
                    initial={false}
                    animate={{ opacity: 1 }}
                  >
                    {/* 顶部工具栏 */}
                    <PhotoViewerChrome
                      currentBlobSrc={currentBlobSrc}
                      currentPhoto={currentPhoto}
                      isInspectorVisible={isInspectorVisible}
                      isMobile={isMobile}
                      isMobileChromeInteractive={isMobileChromeInteractive}
                      isViewerChromeVisible={isViewerChromeVisible}
                      chromeOpacity={chromeOpacity}
                      chromeY={chromeY}
                      onClose={handleCloseRequest}
                      onOpenDesktopInspector={handleOpenDesktopInspector}
                      onToggleInspector={toggleInspector}
                    />

                    {/* 加载指示器 */}
                    <LoadingIndicator ref={loadingIndicatorRef} />
                    <div
                      className="relative flex h-full w-full items-center justify-center"
                      style={{
                        touchAction: isMobile ? 'pan-x pinch-zoom' : 'pan-y',
                      }}
                    >
                      {shouldShowEntryImageCatchup && (
                        <div
                          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-150"
                          data-entry-image-catchup="true"
                        >
                          <div className="relative h-full w-full">
                            {currentThumbHash && (
                              <Thumbhash
                                thumbHash={currentThumbHash}
                                className="pointer-events-none absolute inset-0"
                              />
                            )}
                            <img
                              src={currentPhoto.thumbnailUrl || currentPhoto.originalUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-contain"
                              draggable={false}
                            />
                          </div>
                        </div>
                      )}

                      {shouldMountImageStage ? (
                        <PhotoViewerSlides
                          photos={photos}
                          currentIndex={currentIndex}
                          isEntryAnimating={isEntryAnimating}
                          isEntryTransitionActive={entryTransition?.variant === 'entry'}
                          isImageZoomed={isImageZoomed}
                          isInspectorVisible={isInspectorVisible}
                          isMobile={isMobile}
                          isOpen={isOpen}
                          isVerticalGestureActive={isVerticalGestureActive}
                          isViewerContentVisible={isViewerContentVisible}
                          loadingIndicatorRef={loadingIndicatorRef}
                          onBlobSrcChange={handleBlobSrcChange}
                          onIndexChange={onIndexChange}
                          onVisualReadyChange={setIsCurrentImageVisualReady}
                          onZoomChange={handleZoomChange}
                          swiperRef={swiperRef}
                        />
                      ) : (
                        <div className="h-full w-full" />
                      )}

                      {isMobile && (
                        <m.div
                          className="bg-material-ultra-thick pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1 text-xs text-white/70 backdrop-blur-xl"
                          style={{ opacity: stageHintOpacity, y: stageHintY }}
                        >
                          <i className="i-mingcute-arrow-up-line text-sm" />
                          <i className="i-mingcute-information-line text-sm" />
                          <span className="h-3 w-px bg-white/10" />
                          <i className="i-mingcute-arrow-down-line text-sm" />
                          <i className="i-mingcute-close-line text-sm" />
                        </m.div>
                      )}

                      {/* 自定义导航按钮 */}
                      {!isMobile && (
                        <>
                          {currentIndex > 0 && (
                            <button
                              type="button"
                              className={`bg-material-medium absolute top-1/2 left-4 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 backdrop-blur-sm duration-200 group-hover/photo-viewer:opacity-100 hover:bg-black/40`}
                              onClick={handlePrevious}
                            >
                              <i className={`i-mingcute-left-line text-xl`} />
                            </button>
                          )}

                          {currentIndex < photos.length - 1 && (
                            <button
                              type="button"
                              className={`bg-material-medium absolute top-1/2 right-4 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 backdrop-blur-sm duration-200 group-hover/photo-viewer:opacity-100 hover:bg-black/40`}
                              onClick={handleNext}
                            >
                              <i className={`i-mingcute-right-line text-xl`} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </m.div>

                  <m.div
                    style={isMobile ? { opacity: thumbnailsOpacity, y: thumbnailsY } : undefined}
                    className={isMobile && isInspectorVisible ? 'pointer-events-none' : undefined}
                  >
                    <Suspense>
                      <GalleryThumbnail
                        currentIndex={currentIndex}
                        photos={photos}
                        onIndexChange={onIndexChange}
                        visible={isThumbnailRailVisible}
                      />
                    </Suspense>
                  </m.div>
                </m.div>
              </div>

              {/* PhotoInspector - 根据设备与折叠状态展示 */}
              {isMobile ? (
                <Suspense>
                  <MobilePhotoInspectorSheet
                    currentPhoto={currentPhoto}
                    exifData={currentPhoto.exif}
                    progress={inspectorProgress}
                    onClose={closeInspector}
                  />
                </Suspense>
              ) : (
                (isInspectorVisible || isDesktopInspectorAnimatedVisible) && (
                  <m.div
                    data-viewer-region="inspector"
                    className="z-10 shrink-0 overflow-hidden"
                    initial={{
                      width: isInspectorVisible ? 320 : 0,
                      opacity: 0,
                      x: viewerUiOffsets.inspectorX,
                    }}
                    animate={{
                      width: isInspectorVisible ? 320 : 0,
                      opacity: isInspectorVisible && isDesktopInspectorAnimatedVisible ? 1 : 0,
                      x: isInspectorVisible && isDesktopInspectorAnimatedVisible ? 0 : viewerUiOffsets.inspectorX,
                    }}
                    exit={{
                      width: isInspectorVisible ? 320 : 0,
                      opacity: 0,
                      x: viewerUiOffsets.inspectorX,
                    }}
                    transition={viewerUiTransition}
                    style={{
                      pointerEvents: isInspectorVisible && isDesktopInspectorAnimatedVisible ? 'auto' : 'none',
                    }}
                  >
                    {isInspectorVisible && (
                      <Suspense>
                        <div className="w-80">
                          <PhotoInspector
                            currentPhoto={currentPhoto}
                            exifData={currentPhoto.exif}
                            onClose={handleCloseDesktopInspector}
                            animated={false}
                          />
                        </div>
                      </Suspense>
                    )}
                  </m.div>
                )
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {entryTransition && (
        <PhotoViewerTransitionPreview
          key={`${entryTransition.variant}-${entryTransition.photoId}`}
          transition={entryTransition}
          onReady={handleEntryTransitionReady}
          onComplete={handleEntryTransitionComplete}
        />
      )}
      {exitTransition && (
        <PhotoViewerTransitionPreview
          key={`${exitTransition.variant}-${exitTransition.photoId}`}
          transition={exitTransition}
          onComplete={handleExitAnimationComplete}
        />
      )}
    </>
  )
}
