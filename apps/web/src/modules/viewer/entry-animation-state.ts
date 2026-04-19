interface ResolvePhotoViewerEntryStateParams {
  hasTriggerElement: boolean
  isCurrentImageVisualReady: boolean
  isEntryTransitionActive: boolean
  isOpen: boolean
  isViewerContentVisible: boolean
}

interface ResolvePhotoViewerEntryStateResult {
  shouldMountImageStage: boolean
  shouldShowEntryImageCatchup: boolean
}

interface ProgressiveImageVisualReadyParams {
  isHighResImageRendered: boolean
  isThumbnailLoaded: boolean
  thumbnailSrc?: string
}

export const resolvePhotoViewerEntryState = ({
  hasTriggerElement,
  isCurrentImageVisualReady,
  isEntryTransitionActive,
  isOpen,
  isViewerContentVisible,
}: ResolvePhotoViewerEntryStateParams): ResolvePhotoViewerEntryStateResult => {
  const shouldMountImageStage = isOpen && (isViewerContentVisible || !hasTriggerElement)
  const shouldShowEntryImageCatchup = Boolean(
    isOpen && hasTriggerElement && (isEntryTransitionActive || !isCurrentImageVisualReady),
  )

  return {
    shouldMountImageStage,
    shouldShowEntryImageCatchup,
  }
}

export const getProgressiveImageVisualReady = ({
  isHighResImageRendered,
  isThumbnailLoaded,
  thumbnailSrc,
}: ProgressiveImageVisualReadyParams) => {
  return Boolean((thumbnailSrc && isThumbnailLoaded) || isHighResImageRendered)
}
