import './PhotoViewer.css'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'

import { AnimatePresence, m } from 'motion/react'
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { Swiper as SwiperType } from 'swiper'
import { Keyboard, Navigation, Virtual } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { injectConfig } from '~/config'
import { useMobile } from '~/hooks/useMobile'
import { Spring } from '~/lib/spring'
import type { PhotoManifest } from '~/types/photo'

import { Thumbhash } from '../thumbhash'
import { ExifPanel } from './ExifPanel'
import { GalleryThumbnail } from './GalleryThumbnail'
import type { LoadingIndicatorRef } from './LoadingIndicator'
import { LoadingIndicator } from './LoadingIndicator'
import { ProgressiveImage } from './ProgressiveImage'
import { ReactionButton } from './Reaction'
import { SharePanel } from './SharePanel'

const escapeAttributeValue = (value: string) => {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value)
  }

  return value.replaceAll(/['\\]/g, '\\$&')
}

interface PhotoViewerProps {
  photos: PhotoManifest[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onIndexChange: (index: number) => void
  triggerElement: HTMLElement | null
}

type AnimationFrameRect = {
  left: number
  top: number
  width: number
  height: number
  borderRadius: number
}

type ExitAnimationState = {
  photoId: string
  imageSrc: string
  thumbHash?: string | null
  from: AnimationFrameRect
  to: AnimationFrameRect
}

type EntryAnimationState = {
  photoId: string
  imageSrc: string
  thumbHash?: string | null
  from: AnimationFrameRect
  to: AnimationFrameRect
}

const getBorderRadius = (element: Element | null) => {
  if (typeof window === 'undefined' || !element) return 0

  const computedStyle = window.getComputedStyle(element)
  const radiusCandidates = [
    computedStyle.borderRadius,
    computedStyle.borderTopLeftRadius,
    computedStyle.borderTopRightRadius,
  ].filter((value) => value && value !== '0px')

  if (radiusCandidates.length === 0) return 0

  const parsed = Number.parseFloat(radiusCandidates[0] || '0')
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, parsed)
}

const DESKTOP_EXIF_PANEL_WIDTH_REM = 20
const THUMBNAIL_SIZE = {
  mobile: 48,
  desktop: 64,
} as const
const THUMBNAIL_PADDING = {
  mobile: 12,
  desktop: 16,
} as const

const getRootFontSize = () => {
  if (typeof window === 'undefined') return 16
  const value = window.getComputedStyle(document.documentElement).fontSize
  const parsed = Number.parseFloat(value || '16')
  return Number.isNaN(parsed) ? 16 : parsed
}

const computeViewerImageFrame = (
  photo: PhotoManifest,
  viewportRect: DOMRect | null,
  isMobile: boolean,
) => {
  const baseFontSize = getRootFontSize()
  const exifWidth = isMobile ? 0 : DESKTOP_EXIF_PANEL_WIDTH_REM * baseFontSize
  const thumbnailHeight = isMobile
    ? THUMBNAIL_SIZE.mobile + THUMBNAIL_PADDING.mobile * 2
    : THUMBNAIL_SIZE.desktop + THUMBNAIL_PADDING.desktop * 2

  const viewportWidth = viewportRect?.width ?? window.innerWidth
  const viewportHeight = viewportRect?.height ?? window.innerHeight
  const viewportLeft = viewportRect?.left ?? 0
  const viewportTop = viewportRect?.top ?? 0

  const contentWidth = Math.max(0, viewportWidth - exifWidth)
  const contentHeight = Math.max(0, viewportHeight - thumbnailHeight)

  const photoWidth = photo.width || contentWidth
  const photoHeight = photo.height || contentHeight || 1
  const photoAspect = photoWidth / photoHeight || 1

  let displayWidth = contentWidth
  let displayHeight = contentWidth / photoAspect

  if (displayHeight > contentHeight) {
    displayHeight = contentHeight
    displayWidth = contentHeight * photoAspect
  }

  const left = viewportLeft + (contentWidth - displayWidth) / 2
  const top = viewportTop + (contentHeight - displayHeight) / 2

  return {
    left,
    top,
    width: displayWidth,
    height: displayHeight,
  }
}

export const PhotoViewer = ({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  triggerElement,
}: PhotoViewerProps) => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const swiperRef = useRef<SwiperType | null>(null)
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  const [showExifPanel, setShowExifPanel] = useState(false)
  const [currentBlobSrc, setCurrentBlobSrc] = useState<string | null>(null)
  const [entryAnimation, setEntryAnimation] =
    useState<EntryAnimationState | null>(null)
  const [exitAnimation, setExitAnimation] = useState<ExitAnimationState | null>(
    null,
  )
  const [isViewerContentVisible, setIsViewerContentVisible] = useState(false)
  const cachedTriggerRef = useRef<HTMLElement | null>(triggerElement)
  const wasOpenRef = useRef(isOpen)
  const viewerBoundsRef = useRef<DOMRect | null>(null)
  const hiddenTriggerRef = useRef<HTMLElement | null>(null)
  const hiddenTriggerPrevVisibilityRef = useRef<string | null>(null)
  const isEntryAnimating = Boolean(entryAnimation)

  const restoreTriggerElementVisibility = useCallback(() => {
    const trigger = hiddenTriggerRef.current
    if (trigger) {
      const prevVisibility = hiddenTriggerPrevVisibilityRef.current
      if (prevVisibility !== null && prevVisibility !== undefined) {
        trigger.style.visibility = prevVisibility
      } else {
        trigger.style.removeProperty('visibility')
      }
    }
    hiddenTriggerRef.current = null
    hiddenTriggerPrevVisibilityRef.current = null
  }, [])

  const handleEntryAnimationComplete = useCallback(() => {
    setIsViewerContentVisible(true)
    setEntryAnimation(null)
  }, [])

  const handleExitAnimationComplete = useCallback(() => {
    restoreTriggerElementVisibility()
    setExitAnimation(null)
  }, [restoreTriggerElementVisibility])
  const isMobile = useMobile()

  const currentPhoto = photos[currentIndex]

  useEffect(() => {
    if (triggerElement) {
      cachedTriggerRef.current = triggerElement
    }
  }, [triggerElement])

  useEffect(() => {
    if (!isOpen) {
      setEntryAnimation(null)
      setIsViewerContentVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !currentPhoto) return
    if (typeof document === 'undefined') return

    const selector = `[data-photo-id='${escapeAttributeValue(currentPhoto.id)}']`
    const liveTriggerEl = document.querySelector<HTMLElement>(selector)
    if (liveTriggerEl) {
      cachedTriggerRef.current = liveTriggerEl
    }
  }, [isOpen, currentPhoto])

  useLayoutEffect(() => {
    if (!isOpen || !currentPhoto) return
    if (entryAnimation || isViewerContentVisible) return

    if (typeof window === 'undefined') {
      setIsViewerContentVisible(true)
      return
    }

    const selector = `[data-photo-id='${escapeAttributeValue(currentPhoto.id)}']`
    const liveTriggerEl = document.querySelector<HTMLElement>(selector)

    let triggerEl: HTMLElement | null = null
    if (triggerElement && triggerElement.isConnected) {
      triggerEl = triggerElement
    } else if (liveTriggerEl) {
      triggerEl = liveTriggerEl
    } else if (cachedTriggerRef.current?.isConnected) {
      triggerEl = cachedTriggerRef.current
    }

    if (!triggerEl) {
      setIsViewerContentVisible(true)
      return
    }

    const fromRect = triggerEl.getBoundingClientRect()
    const viewportRect =
      viewerBoundsRef.current ??
      containerRef.current?.getBoundingClientRect() ??
      null
    const targetFrame = computeViewerImageFrame(
      currentPhoto,
      viewportRect,
      isMobile,
    )

    if (
      !fromRect.width ||
      !fromRect.height ||
      !targetFrame.width ||
      !targetFrame.height
    ) {
      setIsViewerContentVisible(true)
      return
    }

    const imageSrc =
      currentBlobSrc ||
      currentPhoto.thumbnailUrl ||
      currentPhoto.originalUrl ||
      null

    if (!imageSrc) {
      setIsViewerContentVisible(true)
      return
    }

    cachedTriggerRef.current = triggerEl
    hiddenTriggerRef.current = triggerEl
    hiddenTriggerPrevVisibilityRef.current = triggerEl.style.visibility || null
    triggerEl.style.visibility = 'hidden'

    const triggerBorderRadius = getBorderRadius(
      triggerEl instanceof HTMLImageElement && triggerEl.parentElement
        ? triggerEl.parentElement
        : triggerEl,
    )
    const targetBorderRadius = 0

    setIsViewerContentVisible(true)
    setEntryAnimation({
      photoId: currentPhoto.id,
      imageSrc,
      thumbHash: currentPhoto.thumbHash,
      from: {
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
        borderRadius: triggerBorderRadius,
      },
      to: {
        left: targetFrame.left,
        top: targetFrame.top,
        width: targetFrame.width,
        height: targetFrame.height,
        borderRadius: targetBorderRadius,
      },
    })
  }, [
    isOpen,
    currentPhoto,
    triggerElement,
    entryAnimation,
    isViewerContentVisible,
    currentBlobSrc,
    isMobile,
  ])

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      setExitAnimation(null)
      return
    }

    if (!wasOpenRef.current || !currentPhoto) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      return
    }

    if (typeof window === 'undefined') {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      return
    }

    const selector = `[data-photo-id='${escapeAttributeValue(currentPhoto.id)}']`
    const liveTriggerEl =
      typeof document === 'undefined'
        ? null
        : document.querySelector<HTMLElement>(selector)

    const triggerEl = liveTriggerEl ?? cachedTriggerRef.current

    if (liveTriggerEl && liveTriggerEl !== cachedTriggerRef.current) {
      cachedTriggerRef.current = liveTriggerEl
    }

    if (!triggerEl || !triggerEl.isConnected) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitAnimation(null)
      return
    }

    const targetRect = triggerEl.getBoundingClientRect()
    if (!targetRect.width || !targetRect.height) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitAnimation(null)
      return
    }

    const viewportRect =
      viewerBoundsRef.current ??
      containerRef.current?.getBoundingClientRect() ??
      null
    const viewerFrame = computeViewerImageFrame(
      currentPhoto,
      viewportRect,
      isMobile,
    )

    if (!viewerFrame.width || !viewerFrame.height) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitAnimation(null)
      return
    }

    const borderRadius = getBorderRadius(
      triggerEl instanceof HTMLImageElement && triggerEl.parentElement
        ? triggerEl.parentElement
        : triggerEl,
    )

    const imageSrc =
      currentBlobSrc ||
      currentPhoto.thumbnailUrl ||
      currentPhoto.originalUrl ||
      null

    if (!imageSrc) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitAnimation(null)
      return
    }

    restoreTriggerElementVisibility()
    hiddenTriggerRef.current = triggerEl
    hiddenTriggerPrevVisibilityRef.current = triggerEl.style.visibility || null
    triggerEl.style.visibility = 'hidden'

    setExitAnimation({
      photoId: currentPhoto.id,
      imageSrc,
      thumbHash: currentPhoto.thumbHash,
      from: {
        left: viewerFrame.left,
        top: viewerFrame.top,
        width: viewerFrame.width,
        height: viewerFrame.height,
        borderRadius: 0,
      },
      to: {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius,
      },
    })

    wasOpenRef.current = false
  }, [
    isOpen,
    currentPhoto,
    currentBlobSrc,
    restoreTriggerElementVisibility,
    entryAnimation,
    isMobile,
  ])

  useEffect(() => {
    return () => {
      restoreTriggerElementVisibility()
    }
  }, [restoreTriggerElementVisibility])

  // 当 PhotoViewer 关闭时重置缩放状态和面板状态
  useLayoutEffect(() => {
    if (!isOpen) {
      setIsImageZoomed(false)
      setShowExifPanel(false)
      setCurrentBlobSrc(null)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return

    const updateBounds = () => {
      if (containerRef.current) {
        viewerBoundsRef.current = containerRef.current.getBoundingClientRect()
      }
    }

    updateBounds()
    window.addEventListener('resize', updateBounds)

    return () => {
      window.removeEventListener('resize', updateBounds)
    }
  }, [isOpen])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1)
      swiperRef.current?.slidePrev()
    }
  }, [currentIndex, onIndexChange])

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onIndexChange(currentIndex + 1)
      swiperRef.current?.slideNext()
    }
  }, [currentIndex, photos.length, onIndexChange])

  // 同步 Swiper 的索引
  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== currentIndex) {
      swiperRef.current.slideTo(currentIndex, 300)
    }
    // 切换图片时重置缩放状态
    setIsImageZoomed(false)
  }, [currentIndex])

  // 当图片缩放状态改变时，控制 Swiper 的触摸行为
  useEffect(() => {
    if (swiperRef.current) {
      if (isImageZoomed) {
        // 图片被缩放时，禁用 Swiper 的触摸滑动
        swiperRef.current.allowTouchMove = false
      } else {
        // 图片未缩放时，启用 Swiper 的触摸滑动
        swiperRef.current.allowTouchMove = true
      }
    }
  }, [isImageZoomed])

  const loadingIndicatorRef = useRef<LoadingIndicatorRef>(null)
  // 处理图片缩放状态变化
  const handleZoomChange = useCallback((isZoomed: boolean) => {
    setIsImageZoomed(isZoomed)
  }, [])

  // 处理 blobSrc 变化
  const handleBlobSrcChange = useCallback((blobSrc: string | null) => {
    setCurrentBlobSrc(blobSrc)
  }, [])

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
          onClose()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handlePrevious, handleNext, onClose, showExifPanel])

  if (!currentPhoto) return null

  const shouldRenderBackdrop =
    isOpen || Boolean(exitAnimation) || Boolean(entryAnimation)
  const currentThumbHash =
    typeof currentPhoto.thumbHash === 'string' ? currentPhoto.thumbHash : null
  const shouldRenderThumbhash =
    shouldRenderBackdrop && Boolean(currentThumbHash)

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
            className="bg-material-opaque fixed inset-0"
          />
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
            className="fixed inset-0"
          >
            {currentThumbHash && (
              <Thumbhash
                thumbHash={currentThumbHash}
                className="size-fill scale-110"
              />
            )}
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
              pointerEvents:
                !isViewerContentVisible || isEntryAnimating ? 'none' : 'auto',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isViewerContentVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={Spring.presets.snappy}
          >
            <div
              className={`flex size-full ${isMobile ? 'flex-col' : 'flex-row'}`}
            >
              <div className="z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
                <m.div
                  className="group relative flex min-h-0 min-w-0 flex-1"
                  animate={{ opacity: isViewerContentVisible ? 1 : 0 }}
                  transition={Spring.presets.snappy}
                >
                  {/* 顶部工具栏 */}
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isViewerContentVisible ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={Spring.presets.snappy}
                    className={`pointer-events-none absolute ${isMobile ? 'top-2 right-2 left-2' : 'top-4 right-4 left-4'} z-30 flex items-center justify-between`}
                  >
                    {/* 左侧工具按钮 */}
                    <div className="flex items-center gap-2">
                      {/* 信息按钮 - 在移动设备上显示 */}
                      {isMobile && (
                        <button
                          type="button"
                          className={`bg-material-ultra-thick pointer-events-auto flex size-8 items-center justify-center rounded-full text-white backdrop-blur-2xl duration-200 hover:bg-black/40 ${showExifPanel ? 'bg-accent' : ''}`}
                          onClick={() => setShowExifPanel(!showExifPanel)}
                        >
                          <i className="i-mingcute-information-line" />
                        </button>
                      )}
                    </div>

                    {/* 右侧按钮组 */}
                    <div className="flex items-center gap-2">
                      {/* 分享按钮 */}
                      <SharePanel
                        photo={currentPhoto}
                        blobSrc={currentBlobSrc || undefined}
                        trigger={
                          <button
                            type="button"
                            className="bg-material-ultra-thick pointer-events-auto flex size-8 items-center justify-center rounded-full text-white backdrop-blur-2xl duration-200 hover:bg-black/40"
                            title={t('photo.share.title')}
                          >
                            <i className="i-mingcute-share-2-line" />
                          </button>
                        }
                      />

                      {/* 关闭按钮 */}
                      <button
                        type="button"
                        className="bg-material-ultra-thick pointer-events-auto flex size-8 items-center justify-center rounded-full text-white backdrop-blur-2xl duration-200 hover:bg-black/40"
                        onClick={onClose}
                      >
                        <i className="i-mingcute-close-line" />
                      </button>
                    </div>
                  </m.div>

                  {!isMobile && injectConfig.useApi && (
                    <ReactionButton
                      photoId={currentPhoto.id}
                      className="absolute right-4 bottom-4"
                      style={{
                        opacity: isViewerContentVisible ? 1 : 0,
                        transition: 'opacity 180ms ease',
                        pointerEvents:
                          !isViewerContentVisible || isEntryAnimating
                            ? 'none'
                            : 'auto',
                      }}
                    />
                  )}

                  {/* 加载指示器 */}
                  <LoadingIndicator ref={loadingIndicatorRef} />
                  {/* Swiper 容器 */}
                  <Swiper
                    modules={[Navigation, Keyboard, Virtual]}
                    spaceBetween={0}
                    slidesPerView={1}
                    initialSlide={currentIndex}
                    virtual
                    keyboard={{
                      enabled: true,
                      onlyInViewport: true,
                    }}
                    onSwiper={(swiper) => {
                      swiperRef.current = swiper
                      // 初始化时确保触摸滑动是启用的
                      swiper.allowTouchMove = !isImageZoomed
                    }}
                    onSlideChange={(swiper) => {
                      onIndexChange(swiper.activeIndex)
                    }}
                    className="h-full w-full"
                    style={{ touchAction: isMobile ? 'pan-x' : 'pan-y' }}
                  >
                    {photos.map((photo, index) => {
                      const isCurrentImage = index === currentIndex
                      return (
                        <SwiperSlide
                          key={photo.id}
                          className="flex items-center justify-center"
                          virtualIndex={index}
                        >
                          <m.div
                            initial={{ opacity: 0.5, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={Spring.presets.smooth}
                            className="relative flex h-full w-full items-center justify-center"
                          >
                            <ProgressiveImage
                              loadingIndicatorRef={loadingIndicatorRef}
                              isCurrentImage={isCurrentImage}
                              src={photo.originalUrl}
                              thumbnailSrc={photo.thumbnailUrl}
                              alt={photo.title}
                              width={
                                isCurrentImage ? currentPhoto.width : undefined
                              }
                              height={
                                isCurrentImage ? currentPhoto.height : undefined
                              }
                              className="h-full w-full object-contain"
                              enablePan={
                                isCurrentImage
                                  ? !isMobile || isImageZoomed
                                  : true
                              }
                              enableZoom={true}
                              onZoomChange={
                                isCurrentImage ? handleZoomChange : undefined
                              }
                              onBlobSrcChange={
                                isCurrentImage ? handleBlobSrcChange : undefined
                              }
                              // Live Photo props
                              isLivePhoto={photo.isLivePhoto}
                              livePhotoVideoUrl={photo.livePhotoVideoUrl}
                              shouldAutoPlayLivePhotoOnce={isCurrentImage}
                              // HDR props
                              isHDR={photo.isHDR}
                            />
                          </m.div>
                        </SwiperSlide>
                      )
                    })}
                  </Swiper>

                  {/* 自定义导航按钮 */}

                  {!isMobile && (
                    <Fragment>
                      {currentIndex > 0 && (
                        <button
                          type="button"
                          className={`bg-material-medium absolute top-1/2 left-4 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 backdrop-blur-sm duration-200 group-hover:opacity-100 hover:bg-black/40`}
                          onClick={handlePrevious}
                        >
                          <i className={`i-mingcute-left-line text-xl`} />
                        </button>
                      )}

                      {currentIndex < photos.length - 1 && (
                        <button
                          type="button"
                          className={`bg-material-medium absolute top-1/2 right-4 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 backdrop-blur-sm duration-200 group-hover:opacity-100 hover:bg-black/40`}
                          onClick={handleNext}
                        >
                          <i className={`i-mingcute-right-line text-xl`} />
                        </button>
                      )}
                    </Fragment>
                  )}
                </m.div>

                <Suspense>
                  <GalleryThumbnail
                    currentIndex={currentIndex}
                    photos={photos}
                    onIndexChange={onIndexChange}
                    visible={isViewerContentVisible}
                  />
                </Suspense>
              </div>

              {/* ExifPanel - 在桌面端始终显示，在移动端根据状态显示 */}

              <Suspense>
                <AnimatePresenceOnlyMobile>
                  {(!isMobile || showExifPanel) && (
                    <ExifPanel
                      currentPhoto={currentPhoto}
                      exifData={currentPhoto.exif}
                      visible={isViewerContentVisible}
                      onClose={
                        isMobile ? () => setShowExifPanel(false) : undefined
                      }
                    />
                  )}
                </AnimatePresenceOnlyMobile>
              </Suspense>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {entryAnimation && (
        <EntryAnimationPreview
          key={entryAnimation.photoId}
          data={entryAnimation}
          onComplete={handleEntryAnimationComplete}
        />
      )}
      {exitAnimation && (
        <ExitAnimationPreview
          key={exitAnimation.photoId}
          data={exitAnimation}
          onComplete={handleExitAnimationComplete}
        />
      )}
    </>
  )
}

const AnimatePresenceOnlyMobile = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const isMobile = useMobile()
  if (!isMobile) return children
  return <AnimatePresence>{children}</AnimatePresence>
}

function EntryAnimationPreview({
  data,
  onComplete,
}: {
  data: EntryAnimationState
  onComplete: () => void
}) {
  const baseTransition = Spring.snappy(0.5)
  const thumbHash = typeof data.thumbHash === 'string' ? data.thumbHash : null

  return (
    <m.div
      className="pointer-events-none fixed top-0 left-0 z-[80]"
      initial={{
        x: data.from.left,
        y: data.from.top,
        width: data.from.width,
        height: data.from.height,
        borderRadius: data.from.borderRadius,
        opacity: 1,
      }}
      animate={{
        x: data.to.left,
        y: data.to.top,
        width: data.to.width,
        height: data.to.height,
        borderRadius: data.to.borderRadius,
        opacity: 1,
      }}
      transition={baseTransition}
      onAnimationComplete={onComplete}
    >
      <div className="relative h-full w-full overflow-hidden bg-black">
        {thumbHash && (
          <Thumbhash
            thumbHash={thumbHash}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}
        <img
          src={data.imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </div>
    </m.div>
  )
}

function ExitAnimationPreview({
  data,
  onComplete,
}: {
  data: ExitAnimationState
  onComplete: () => void
}) {
  const baseTransition = Spring.snappy(0.45)
  const thumbHash = typeof data.thumbHash === 'string' ? data.thumbHash : null

  return (
    <m.div
      className="pointer-events-none fixed top-0 left-0 z-[80]"
      initial={{
        x: data.from.left,
        y: data.from.top,
        width: data.from.width,
        height: data.from.height,
        borderRadius: data.from.borderRadius,
        opacity: 1,
      }}
      animate={{
        x: data.to.left,
        y: data.to.top,
        width: data.to.width,
        height: data.to.height,
        borderRadius: data.to.borderRadius,
        opacity: 1,
      }}
      transition={baseTransition}
      onAnimationComplete={onComplete}
    >
      <div className="relative h-full w-full overflow-hidden bg-black">
        {thumbHash && (
          <Thumbhash
            thumbHash={thumbHash}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}
        <img
          src={data.imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </div>
    </m.div>
  )
}
