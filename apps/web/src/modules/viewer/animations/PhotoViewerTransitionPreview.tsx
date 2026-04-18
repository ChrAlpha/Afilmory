import { Thumbhash } from '@afilmory/ui'
import { animate, m, useMotionValue } from 'motion/react'
import { useEffect, useRef } from 'react'

import type { PhotoViewerTransition } from './types'

const BASE_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
}

const ENTRY_HANDOFF_LEAD = 0.1

const ENTRY_FADE_OUT_TRANSITION = {
  duration: 0.1,
  ease: [0.32, 0.72, 0, 1] as const,
}

interface PhotoViewerTransitionPreviewProps {
  transition: PhotoViewerTransition
  onReady?: () => void
  onComplete: () => void
}

export const PhotoViewerTransitionPreview = ({
  transition,
  onReady,
  onComplete,
}: PhotoViewerTransitionPreviewProps) => {
  const thumbHash = typeof transition.thumbHash === 'string' ? transition.thumbHash : null
  const x = useMotionValue(transition.from.left)
  const y = useMotionValue(transition.from.top)
  const width = useMotionValue(transition.from.width)
  const height = useMotionValue(transition.from.height)
  const borderRadius = useMotionValue(transition.from.borderRadius)
  const rotate = useMotionValue(transition.from.rotate)
  const opacity = useMotionValue(1)
  const hasReadyRef = useRef(false)
  const hasCompletedRef = useRef(false)
  const transformOrigin =
    transition.variant === 'exit'
      ? (transition.from.transformOrigin ?? transition.to.transformOrigin ?? '50% 50%')
      : (transition.to.transformOrigin ?? transition.from.transformOrigin ?? '50% 50%')

  useEffect(() => {
    opacity.set(1)
    hasReadyRef.current = false
    hasCompletedRef.current = false
    let readyTimer: number | null = null

    const complete = () => {
      if (hasCompletedRef.current) return
      hasCompletedRef.current = true
      onComplete()
    }

    const ready = () => {
      if (hasReadyRef.current) return
      hasReadyRef.current = true

      if (transition.variant === 'entry') {
        onReady?.()
        const fadeAnimation = animate(opacity, 0, {
          ...ENTRY_FADE_OUT_TRANSITION,
          onComplete: complete,
        })
        animations.push(fadeAnimation)
        return
      }

      complete()
    }

    const animations = [
      animate(x, transition.to.left, BASE_TRANSITION),
      animate(y, transition.to.top, BASE_TRANSITION),
      animate(width, transition.to.width, {
        ...BASE_TRANSITION,
        onComplete: ready,
      }),
      animate(height, transition.to.height, BASE_TRANSITION),
      animate(borderRadius, transition.to.borderRadius, BASE_TRANSITION),
      animate(rotate, transition.to.rotate, BASE_TRANSITION),
    ]

    if (transition.variant === 'entry') {
      readyTimer = window.setTimeout(ready, Math.max(0, (BASE_TRANSITION.duration - ENTRY_HANDOFF_LEAD) * 1000))
    }

    return () => {
      if (readyTimer) {
        window.clearTimeout(readyTimer)
      }
      animations.forEach((animation) => animation.stop())
    }
  }, [
    borderRadius,
    height,
    onReady,
    onComplete,
    opacity,
    rotate,
    transition.to.borderRadius,
    transition.to.height,
    transition.to.left,
    transition.to.rotate,
    transition.to.top,
    transition.to.width,
    transition.variant,
    width,
    x,
    y,
  ])

  return (
    <m.div
      className="pointer-events-none fixed top-0 left-0 z-[60]"
      data-variant={`photo-viewer-transition-${transition.variant}`}
      style={{
        x,
        y,
        width,
        height,
        borderRadius,
        opacity,
        rotate,
        transformOrigin,
      }}
    >
      <div className="relative h-full w-full overflow-hidden bg-black">
        {thumbHash && (
          <Thumbhash thumbHash={thumbHash} className="pointer-events-none absolute inset-0 h-full w-full" />
        )}
        <img
          src={transition.imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </div>
    </m.div>
  )
}
