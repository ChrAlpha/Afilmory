import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { VIEWER_TRANSITION_TRIGGER_ATTRIBUTE } from './contracts'
import {
  computeViewerMediaFrame,
  escapeAttributeValue,
  getBorderRadius,
  resolveViewerTransitionImageSrc,
} from './frame-utils'
import type {
  AnimationFrameRect,
  UseViewerTransitionsParams,
  UseViewerTransitionsResult,
  ViewerTransition,
  ViewerTransitionState,
} from './types'

export const useViewerTransitions = <
  TItem extends { id: string; width?: number | null; height?: number | null } & {
    previewSrc?: string | null
    fullSrc?: string | null
    thumbHash?: string | null
  },
>({
  currentDisplaySrc = null,
  currentItem,
  exitOverrideFrame = null,
  isMobile,
  isOpen,
  onExitComplete,
  layout,
  triggerAttribute = VIEWER_TRANSITION_TRIGGER_ATTRIBUTE,
  triggerElement,
}: UseViewerTransitionsParams<TItem>): UseViewerTransitionsResult => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cachedTriggerRef = useRef<HTMLElement | null>(triggerElement)
  const wasOpenRef = useRef(isOpen)
  const viewerBoundsRef = useRef<DOMRect | null>(null)
  const hiddenTriggerRef = useRef<HTMLElement | null>(null)
  const hiddenTriggerPrevVisibilityRef = useRef<string | null>(null)
  const viewerImageFrameRef = useRef<AnimationFrameRect | null>(null)

  const [entryTransition, setEntryTransition] = useState<ViewerTransition | null>(null)
  const [exitTransition, setExitTransition] = useState<ViewerTransition | null>(null)
  const [isViewerContentVisible, setIsViewerContentVisible] = useState(false)

  const restoreTriggerElementVisibility = useCallback(() => {
    const trigger = hiddenTriggerRef.current
    if (trigger) {
      const prevVisibility = hiddenTriggerPrevVisibilityRef.current
      if (prevVisibility != null) {
        trigger.style.visibility = prevVisibility
      } else {
        trigger.style.removeProperty('visibility')
      }
    }
    hiddenTriggerRef.current = null
    hiddenTriggerPrevVisibilityRef.current = null
  }, [])

  const hideTriggerElement = useCallback((element: HTMLElement) => {
    hiddenTriggerRef.current = element
    hiddenTriggerPrevVisibilityRef.current = element.style.visibility || null
    element.style.visibility = 'hidden'
  }, [])

  const resolveTriggerElement = useCallback((): HTMLElement | null => {
    if (!currentItem) return null

    const isElementForCurrentItem = (element: HTMLElement) => {
      return element.getAttribute(triggerAttribute) === currentItem.id
    }

    if (triggerElement && triggerElement.isConnected && isElementForCurrentItem(triggerElement)) {
      cachedTriggerRef.current = triggerElement
      return triggerElement
    }

    const selector = `[${triggerAttribute}="${escapeAttributeValue(currentItem.id)}"]`
    const liveTriggerElement = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>(selector)

    if (liveTriggerElement && liveTriggerElement.isConnected) {
      cachedTriggerRef.current = liveTriggerElement
      return liveTriggerElement
    }

    if (
      cachedTriggerRef.current &&
      cachedTriggerRef.current.isConnected &&
      isElementForCurrentItem(cachedTriggerRef.current)
    ) {
      return cachedTriggerRef.current
    }

    return null
  }, [currentItem, triggerAttribute, triggerElement])

  useEffect(() => {
    if (triggerElement) {
      cachedTriggerRef.current = triggerElement
    }
  }, [triggerElement])

  useEffect(() => {
    return () => {
      restoreTriggerElementVisibility()
    }
  }, [restoreTriggerElementVisibility])

  useEffect(() => {
    if (!isOpen) {
      setEntryTransition(null)
      setIsViewerContentVisible(false)
      viewerImageFrameRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    resolveTriggerElement()
  }, [isOpen, resolveTriggerElement])

  useLayoutEffect(() => {
    if (!isOpen || !currentItem) return
    if (entryTransition || isViewerContentVisible) return

    const resolvedTriggerElement = resolveTriggerElement()

    if (!resolvedTriggerElement) {
      setIsViewerContentVisible(true)
      return
    }

    const fromRect = resolvedTriggerElement.getBoundingClientRect()
    const viewportRect = viewerBoundsRef.current ?? containerRef.current?.getBoundingClientRect() ?? null
    const targetFrame = computeViewerMediaFrame(currentItem, viewportRect, isMobile, layout)

    if (!fromRect.width || !fromRect.height || !targetFrame.width || !targetFrame.height) {
      setIsViewerContentVisible(true)
      return
    }

    const imageSrc = resolveViewerTransitionImageSrc(currentItem, currentDisplaySrc, 'entry')

    if (!imageSrc) {
      setIsViewerContentVisible(true)
      return
    }

    hideTriggerElement(resolvedTriggerElement)

    const triggerBorderRadius = getBorderRadius(
      resolvedTriggerElement instanceof HTMLImageElement && resolvedTriggerElement.parentElement
        ? resolvedTriggerElement.parentElement
        : resolvedTriggerElement,
    )

    viewerImageFrameRef.current = {
      left: targetFrame.left,
      top: targetFrame.top,
      width: targetFrame.width,
      height: targetFrame.height,
      borderRadius: targetFrame.borderRadius,
      rotate: targetFrame.rotate,
    }

    const frameForAnimation = viewerImageFrameRef.current ?? targetFrame

    const transitionState: ViewerTransitionState = {
      itemId: currentItem.id,
      imageSrc,
      thumbHash: currentItem.thumbHash,
      from: {
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
        borderRadius: triggerBorderRadius,
        rotate: 0,
      },
      to: {
        left: frameForAnimation.left,
        top: frameForAnimation.top,
        width: frameForAnimation.width,
        height: frameForAnimation.height,
        borderRadius: frameForAnimation.borderRadius,
        rotate: frameForAnimation.rotate,
      },
    }

    setEntryTransition({ ...transitionState, variant: 'entry' })
  }, [
    currentDisplaySrc,
    currentItem,
    entryTransition,
    hideTriggerElement,
    isMobile,
    isOpen,
    isViewerContentVisible,
    layout,
    resolveTriggerElement,
  ])

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      setExitTransition(null)
      return
    }

    if (!wasOpenRef.current || !currentItem) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      return
    }

    const resolvedTriggerElement = resolveTriggerElement()

    if (!resolvedTriggerElement || !resolvedTriggerElement.isConnected) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitTransition(null)
      onExitComplete?.()
      return
    }

    const targetRect = resolvedTriggerElement.getBoundingClientRect()
    if (!targetRect.width || !targetRect.height) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitTransition(null)
      onExitComplete?.()
      return
    }

    const viewportRect = viewerBoundsRef.current ?? containerRef.current?.getBoundingClientRect() ?? null
    const computedFrame = computeViewerMediaFrame(currentItem, viewportRect, isMobile, layout)
    const viewerFrame = exitOverrideFrame ?? viewerImageFrameRef.current ?? computedFrame

    if (!viewerFrame.width || !viewerFrame.height) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitTransition(null)
      onExitComplete?.()
      return
    }

    viewerImageFrameRef.current = viewerFrame

    const borderRadius = getBorderRadius(
      resolvedTriggerElement instanceof HTMLImageElement && resolvedTriggerElement.parentElement
        ? resolvedTriggerElement.parentElement
        : resolvedTriggerElement,
    )

    const imageSrc = resolveViewerTransitionImageSrc(currentItem, currentDisplaySrc, 'exit')

    if (!imageSrc) {
      wasOpenRef.current = false
      restoreTriggerElementVisibility()
      setExitTransition(null)
      onExitComplete?.()
      return
    }

    restoreTriggerElementVisibility()
    hideTriggerElement(resolvedTriggerElement)

    const transitionState: ViewerTransitionState = {
      itemId: currentItem.id,
      imageSrc,
      thumbHash: currentItem.thumbHash,
      from: {
        left: viewerFrame.left,
        top: viewerFrame.top,
        width: viewerFrame.width,
        height: viewerFrame.height,
        borderRadius: viewerFrame.borderRadius,
        rotate: viewerFrame.rotate,
      },
      to: {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius,
        rotate: 0,
      },
    }

    setExitTransition({ ...transitionState, variant: 'exit' })

    wasOpenRef.current = false
  }, [
    currentDisplaySrc,
    currentItem,
    exitOverrideFrame,
    hideTriggerElement,
    isMobile,
    isOpen,
    layout,
    onExitComplete,
    resolveTriggerElement,
    restoreTriggerElementVisibility,
  ])

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

  const handleEntryTransitionReady = useCallback(() => {
    setIsViewerContentVisible(true)
  }, [])

  const handleEntryTransitionComplete = useCallback(() => {
    setEntryTransition(null)
  }, [])

  const handleExitAnimationComplete = useCallback(() => {
    restoreTriggerElementVisibility()
    setExitTransition(null)
    onExitComplete?.()
  }, [onExitComplete, restoreTriggerElementVisibility])

  const isEntryAnimating = Boolean(entryTransition)
  const shouldRenderBackdrop = isOpen || Boolean(exitTransition) || Boolean(entryTransition)

  const thumbHash = typeof currentItem?.thumbHash === 'string' ? currentItem.thumbHash : null
  const shouldRenderThumbhash = shouldRenderBackdrop && Boolean(thumbHash)

  return {
    containerRef,
    entryTransition,
    exitTransition,
    handleEntryTransitionComplete,
    handleEntryTransitionReady,
    handleExitAnimationComplete,
    isEntryAnimating,
    isViewerContentVisible,
    shouldRenderBackdrop,
    shouldRenderThumbhash,
    thumbHash,
  }
}
