import { Spring } from '@afilmory/utils'
import { m } from 'motion/react'
import { memo, type RefObject } from 'react'
import type { Swiper as SwiperType } from 'swiper'
import { Navigation, Virtual } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import type { LoadingIndicatorRef } from '~/modules/inspector/LoadingIndicator'
import type { PhotoManifest } from '~/types/photo'

import { ReactionRail } from '../social'
import { ProgressiveImage } from './ProgressiveImage'
import type { VideoSource } from './types'

const SWIPER_MODULES = [Navigation, Virtual]

interface PhotoViewerSlidesProps {
  photos: PhotoManifest[]
  currentIndex: number
  isEntryAnimating: boolean
  isEntryTransitionActive: boolean
  isImageZoomed: boolean
  isInspectorVisible: boolean
  isMobile: boolean
  isOpen: boolean
  isVerticalGestureActive: boolean
  isViewerContentVisible: boolean
  loadingIndicatorRef: RefObject<LoadingIndicatorRef | null>
  onBlobSrcChange: (blobSrc: string | null) => void
  onIndexChange: (index: number) => void
  onVisualReadyChange: (ready: boolean) => void
  onZoomChange: (isZoomed: boolean) => void
  swiperRef: RefObject<SwiperType | null>
}

interface PhotoViewerSlideProps {
  photo: PhotoManifest
  isCurrentImage: boolean
  hideImage: boolean
  disableThumbnailTransition: boolean
  enablePan: boolean
  shouldRenderHighRes: boolean
  loadingIndicatorRef: RefObject<LoadingIndicatorRef | null>
  onBlobSrcChange: (blobSrc: string | null) => void
  onVisualReadyChange: (ready: boolean) => void
  onZoomChange: (isZoomed: boolean) => void
}

const resolveVideoSource = (photo: PhotoManifest): VideoSource => {
  if (photo.video?.type === 'motion-photo') {
    return {
      type: 'motion-photo',
      imageUrl: photo.originalUrl,
      offset: photo.video.offset,
      size: photo.video.size,
      presentationTimestamp: photo.video.presentationTimestamp,
    }
  }

  if (photo.video?.type === 'live-photo') {
    return {
      type: 'live-photo',
      videoUrl: photo.video.videoUrl,
    }
  }

  return { type: 'none' }
}

const PhotoViewerSlide = memo(
  ({
    photo,
    isCurrentImage,
    hideImage,
    disableThumbnailTransition,
    enablePan,
    shouldRenderHighRes,
    loadingIndicatorRef,
    onBlobSrcChange,
    onVisualReadyChange,
    onZoomChange,
  }: PhotoViewerSlideProps) => {
    return (
      <>
        <ReactionRail photoId={photo.id} />
        <m.div
          initial={disableThumbnailTransition ? false : { opacity: 0.5, scale: 0.95 }}
          animate={disableThumbnailTransition ? undefined : { opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={disableThumbnailTransition ? undefined : Spring.presets.smooth}
          className="relative flex h-full w-full items-center justify-center"
          style={{
            visibility: hideImage ? 'hidden' : 'visible',
          }}
        >
          <ProgressiveImage
            loadingIndicatorRef={loadingIndicatorRef}
            isCurrentImage={isCurrentImage}
            src={photo.originalUrl}
            thumbnailSrc={photo.thumbnailUrl}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            className="h-full w-full object-contain"
            enablePan={enablePan}
            enableZoom={true}
            shouldRenderHighRes={shouldRenderHighRes}
            onZoomChange={isCurrentImage ? onZoomChange : undefined}
            onBlobSrcChange={isCurrentImage ? onBlobSrcChange : undefined}
            onVisualReadyChange={isCurrentImage ? onVisualReadyChange : undefined}
            disableThumbnailTransition={disableThumbnailTransition}
            videoSource={resolveVideoSource(photo)}
            shouldAutoPlayVideoOnce={isCurrentImage}
            isHDR={photo.isHDR}
          />
        </m.div>
      </>
    )
  },
)

PhotoViewerSlide.displayName = 'PhotoViewerSlide'

export const PhotoViewerSlides = ({
  photos,
  currentIndex,
  isEntryAnimating,
  isEntryTransitionActive,
  isImageZoomed,
  isInspectorVisible,
  isMobile,
  isOpen,
  isVerticalGestureActive,
  isViewerContentVisible,
  loadingIndicatorRef,
  onBlobSrcChange,
  onIndexChange,
  onVisualReadyChange,
  onZoomChange,
  swiperRef,
}: PhotoViewerSlidesProps) => {
  const allowTouchMove = !isImageZoomed && !(isMobile && (isVerticalGestureActive || isInspectorVisible))

  return (
    <Swiper
      modules={SWIPER_MODULES}
      spaceBetween={0}
      slidesPerView={1}
      initialSlide={currentIndex}
      virtual
      onSwiper={(swiper) => {
        swiperRef.current = swiper
        swiper.allowTouchMove = allowTouchMove
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
          <SwiperSlide key={photo.id} className="flex items-center justify-center" virtualIndex={index}>
            <PhotoViewerSlide
              photo={photo}
              isCurrentImage={isCurrentImage}
              hideImage={isCurrentImage && isEntryAnimating && !isViewerContentVisible}
              disableThumbnailTransition={isCurrentImage && isEntryTransitionActive}
              enablePan={!isCurrentImage || !isMobile || isImageZoomed}
              shouldRenderHighRes={isCurrentImage && isOpen && isViewerContentVisible}
              loadingIndicatorRef={loadingIndicatorRef}
              onBlobSrcChange={onBlobSrcChange}
              onVisualReadyChange={onVisualReadyChange}
              onZoomChange={onZoomChange}
            />
          </SwiperSlide>
        )
      })}
    </Swiper>
  )
}
