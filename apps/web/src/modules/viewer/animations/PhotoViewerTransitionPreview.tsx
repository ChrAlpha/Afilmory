import { Thumbhash } from '@afilmory/ui'
import { animate, m, useMotionValue } from 'motion/react'
import { useEffect, useRef } from 'react'

import type { PhotoViewerTransition } from './types'

interface PhotoViewerTransitionPreviewProps {
  transition: PhotoViewerTransition
  onComplete: () => void
}

export const PhotoViewerTransitionPreview = ({ transition, onComplete }: PhotoViewerTransitionPreviewProps) => {
  const baseTransition = {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1] as const,
  }
  const thumbHash = typeof transition.thumbHash === 'string' ? transition.thumbHash : null
  const x = useMotionValue(transition.from.left)
  const y = useMotionValue(transition.from.top)
  const width = useMotionValue(transition.from.width)
  const height = useMotionValue(transition.from.height)
  const borderRadius = useMotionValue(transition.from.borderRadius)
  const rotate = useMotionValue(transition.from.rotate)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    hasCompletedRef.current = false

    const complete = () => {
      if (hasCompletedRef.current) return
      hasCompletedRef.current = true
      onComplete()
    }

    const animations = [
      animate(x, transition.to.left, baseTransition),
      animate(y, transition.to.top, baseTransition),
      animate(width, transition.to.width, {
        ...baseTransition,
        onComplete: complete,
      }),
      animate(height, transition.to.height, baseTransition),
      animate(borderRadius, transition.to.borderRadius, baseTransition),
      animate(rotate, transition.to.rotate, baseTransition),
    ]

    return () => {
      animations.forEach((animation) => animation.stop())
    }
  }, [
    borderRadius,
    height,
    onComplete,
    rotate,
    transition.to.borderRadius,
    transition.to.height,
    transition.to.left,
    transition.to.rotate,
    transition.to.top,
    transition.to.width,
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
        rotate,
        transformOrigin: '50% 50%',
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
