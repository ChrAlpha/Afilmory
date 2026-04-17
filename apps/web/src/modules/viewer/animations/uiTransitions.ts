import { Spring } from '@afilmory/utils'

export const viewerUiTransition = Spring.smooth(0.34)

export const viewerUiOffsets = {
  chromeY: -28,
  inspectorX: 360,
  inspectorMobileY: 112,
  railDesktopY: 120,
  railMobileY: 92,
} as const

export const getViewerUiSlideMotion = ({
  axis,
  offset,
  visible,
}: {
  axis: 'x' | 'y'
  offset: number
  visible: boolean
}) => {
  const hidden = axis === 'x' ? { x: offset } : { y: offset }
  const shown = axis === 'x' ? { x: 0 } : { y: 0 }

  return {
    initial: {
      opacity: 0,
      ...hidden,
    },
    animate: visible
      ? {
          opacity: 1,
          ...shown,
        }
      : {
          opacity: 0,
          ...hidden,
        },
    exit: {
      opacity: 0,
      ...hidden,
    },
    transition: viewerUiTransition,
  }
}
