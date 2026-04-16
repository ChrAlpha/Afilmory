import { Spring } from '@afilmory/utils'
import { useDrag } from '@use-gesture/react'
import { animate, useMotionValue, useTransform } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useViewport } from '~/hooks/useViewport'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

interface MobilePhotoViewerInteractionsOptions {
  enabled: boolean
  isImageZoomed: boolean
  onDismiss: () => void
}

export const usePhotoViewerMobileInteractions = ({
  enabled,
  isImageZoomed,
  onDismiss,
}: MobilePhotoViewerInteractionsOptions) => {
  const viewport = useViewport((value) => ({ width: value.w, height: value.h }))
  const viewportWidth = viewport.width || (typeof window !== 'undefined' ? window.innerWidth : 390)
  const viewportHeight = viewport.height || (typeof window !== 'undefined' ? window.innerHeight : 844)

  const inspectorRevealDistance = useMemo(() => clamp(viewportHeight * 0.34, 220, 320), [viewportHeight])
  const dismissThreshold = useMemo(() => clamp(viewportHeight * 0.18, 120, 180), [viewportHeight])
  const dismissTravel = useMemo(() => viewportHeight + 160, [viewportHeight])

  const inspectorProgress = useMotionValue(0)
  const dismissX = useMotionValue(0)
  const dismissY = useMotionValue(0)
  const [isInspectorVisible, setIsInspectorVisible] = useState(false)
  const [isVerticalGestureActive, setIsVerticalGestureActive] = useState(false)

  const animationControlsRef = useRef<ReturnType<typeof animate>[]>([])
  const isClosingRef = useRef(false)

  const registerAnimation = useCallback((animation: ReturnType<typeof animate>) => {
    animationControlsRef.current.push(animation)
    return animation
  }, [])

  const stopAnimations = useCallback(() => {
    animationControlsRef.current.forEach((animation) => animation.stop())
    animationControlsRef.current = []
  }, [])

  const reset = useCallback(() => {
    stopAnimations()
    isClosingRef.current = false
    setIsInspectorVisible(false)
    setIsVerticalGestureActive(false)
    inspectorProgress.set(0)
    dismissX.set(0)
    dismissY.set(0)
  }, [dismissX, dismissY, inspectorProgress, stopAnimations])

  useEffect(() => {
    const unsubscribe = inspectorProgress.on('change', (latest) => {
      setIsInspectorVisible(latest > 0.02)
    })

    return () => {
      unsubscribe()
    }
  }, [inspectorProgress])

  useEffect(() => {
    if (!enabled) {
      reset()
    }
  }, [enabled, reset])

  const springValue = useCallback(
    (value: typeof inspectorProgress | typeof dismissX | typeof dismissY, to: number, velocity = 0) => {
      return registerAnimation(
        animate(value, to, {
          ...Spring.presets.smooth,
          velocity,
        }),
      )
    },
    [registerAnimation],
  )

  const settleInspector = useCallback(
    (open: boolean, velocity = 0) => {
      stopAnimations()
      if (isClosingRef.current) return
      setIsInspectorVisible(open)
      springValue(inspectorProgress, open ? 1 : 0, velocity * inspectorRevealDistance * 0.35)
      springValue(dismissX, 0)
      springValue(dismissY, 0, velocity * 120)
    },
    [dismissX, dismissY, inspectorProgress, inspectorRevealDistance, springValue, stopAnimations],
  )

  const dismissWithThrow = useCallback(
    (velocityX: number, velocityY: number) => {
      if (isClosingRef.current) return

      isClosingRef.current = true
      setIsInspectorVisible(false)
      setIsVerticalGestureActive(false)
      stopAnimations()
      inspectorProgress.set(0)

      const targetX = dismissX.get() + velocityX * 200
      const targetY = Math.max(dismissTravel, dismissY.get() + velocityY * 340)

      registerAnimation(
        animate(dismissX, targetX, {
          ...Spring.presets.smooth,
          velocity: velocityX * 180,
        }),
      )

      registerAnimation(
        animate(dismissY, targetY, {
          ...Spring.presets.snappy,
          velocity: Math.max(velocityY * 260, 220),
          onComplete: () => {
            onDismiss()
          },
        }),
      )
    },
    [dismissTravel, dismissX, dismissY, inspectorProgress, onDismiss, registerAnimation, stopAnimations],
  )

  const openInspector = useCallback(() => {
    settleInspector(true)
  }, [settleInspector])

  const closeInspector = useCallback(() => {
    settleInspector(false)
  }, [settleInspector])

  const toggleInspector = useCallback(() => {
    settleInspector(!isInspectorVisible)
  }, [isInspectorVisible, settleInspector])

  const bindStage = useDrag(
    ({ active, axis, event, first, last, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], memo }) => {
      if (!enabled || isImageZoomed || isClosingRef.current) {
        if (last) {
          setIsVerticalGestureActive(false)
        }
        return memo
      }

      const start =
        memo ??
        ({
          inspectorPixels: inspectorProgress.get() * inspectorRevealDistance,
          startedWithInspectorOpen: isInspectorVisible,
          ignore: false,
        } as const)

      if (first && event.target instanceof HTMLElement) {
        const isInteractiveTarget = Boolean(
          event.target.closest('button, a, [role="button"], [data-viewer-interactive]'),
        )
        if (isInteractiveTarget) {
          return {
            ...start,
            ignore: true,
          }
        }
      }

      if (start.ignore) {
        if (last) {
          setIsVerticalGestureActive(false)
        }
        return start
      }

      if (axis && axis !== 'y') {
        if (last) {
          setIsVerticalGestureActive(false)
        }
        return start
      }

      if (active) {
        stopAnimations()
        setIsVerticalGestureActive(true)

        const nextInspectorPixels = start.inspectorPixels - my
        const startedWithInspectorOpen = start.startedWithInspectorOpen || start.inspectorPixels > 0

        if (startedWithInspectorOpen) {
          inspectorProgress.set(clamp(nextInspectorPixels / inspectorRevealDistance, 0, 1))
          dismissX.set(0)
          dismissY.set(0)
        } else if (nextInspectorPixels > 0) {
          inspectorProgress.set(clamp(nextInspectorPixels / inspectorRevealDistance, 0, 1))
          dismissX.set(0)
          dismissY.set(0)
        } else {
          inspectorProgress.set(0)
          dismissY.set(clamp(-nextInspectorPixels, 0, dismissTravel))
          dismissX.set(mx * 0.24)
        }
      }

      if (last) {
        setIsVerticalGestureActive(false)
        const startedWithInspectorOpen =
          start.startedWithInspectorOpen || start.inspectorPixels > 0 || isInspectorVisible

        if (startedWithInspectorOpen) {
          springValue(dismissX, 0)
          springValue(dismissY, 0)

          const currentProgress = inspectorProgress.get()
          const shouldOpen = currentProgress > 0.42 || (dy < 0 && vy > 0.2)
          settleInspector(shouldOpen, dy < 0 ? -vy : vy)
          return start
        }

        const dismissDistance = dismissY.get()

        if (dismissDistance > dismissThreshold || (dy > 0 && vy > 0.65 && my > 36)) {
          dismissWithThrow(vx * (dx === 0 ? 1 : dx), Math.max(vy, 0.72))
          return start
        }

        springValue(dismissX, 0)
        springValue(dismissY, 0)

        const currentProgress = inspectorProgress.get()
        const shouldOpen = currentProgress > 0.42 || (dy < 0 && vy > 0.2)
        settleInspector(shouldOpen, dy < 0 ? -vy : vy)
      }

      return start
    },
    {
      axis: 'lock',
      filterTaps: true,
      threshold: 10,
      pointer: { touch: true, capture: false },
      rubberband: 0.12,
    },
  )

  const dismissProgress = useTransform(dismissY, [0, dismissTravel], [0, 1])
  const viewerScale = useTransform(() => clamp(1 - dismissProgress.get() * 0.12, 0.82, 1))
  const viewerRotate = useTransform(() => (dismissX.get() / Math.max(viewportWidth, 1)) * 6)
  const viewerLiftY = useTransform(() => dismissY.get())
  const viewerBorderRadius = useTransform(() => dismissProgress.get() * 18)
  const backdropOpacity = useTransform(() => clamp(1 - dismissProgress.get() * 0.82, 0.12, 1))
  const chromeOpacity = useTransform(() =>
    clamp(1 - inspectorProgress.get() * 0.72 - dismissProgress.get() * 0.48, 0, 1),
  )
  const chromeY = useTransform(() => dismissY.get() * 0.08)
  const thumbnailsOpacity = useTransform(() => {
    const inspectorOpacity =
      inspectorProgress.get() <= 0.08 ? 1 : clamp(1 - (inspectorProgress.get() - 0.08) / 0.18, 0, 1)

    return clamp(inspectorOpacity - dismissProgress.get() * 0.55, 0, 1)
  })
  const stageHintOpacity = useTransform(() =>
    clamp(0.24 + inspectorProgress.get() * 0.36 - dismissProgress.get() * 0.5, 0, 0.8),
  )

  return {
    bindStage,
    closeInspector,
    dismissX,
    dismissY,
    inspectorProgress,
    isInspectorVisible,
    isVerticalGestureActive,
    openInspector,
    reset,
    settleInspector,
    stageHintOpacity,
    thumbnailsOpacity,
    toggleInspector,
    viewerBorderRadius,
    viewerLiftY,
    viewerRotate,
    viewerScale,
    backdropOpacity,
    chromeOpacity,
    chromeY,
  }
}
