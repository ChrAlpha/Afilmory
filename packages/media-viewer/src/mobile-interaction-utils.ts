import type { MobileViewerDismissSnapshot } from './types'

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)
export const easeOutQuad = (value: number) => 1 - Math.pow(1 - value, 2)

export interface MobileViewerInteractionConfig {
  dismissThresholdFactor: number
  dismissThresholdMax: number
  dismissThresholdMin: number
  dismissTravelExtra: number
  inspectorRevealFactor: number
  inspectorRevealMax: number
  inspectorRevealMin: number
}

export const DEFAULT_MOBILE_VIEWER_INTERACTION_CONFIG: MobileViewerInteractionConfig = {
  inspectorRevealFactor: 0.34,
  inspectorRevealMin: 220,
  inspectorRevealMax: 320,
  dismissThresholdFactor: 0.18,
  dismissThresholdMin: 120,
  dismissThresholdMax: 180,
  dismissTravelExtra: 160,
}

export const resolveMobileViewerInteractionMetrics = (
  viewportHeight: number,
  config: Partial<MobileViewerInteractionConfig> = {},
) => {
  const resolved = { ...DEFAULT_MOBILE_VIEWER_INTERACTION_CONFIG, ...config }

  return {
    inspectorRevealDistance: clamp(
      viewportHeight * resolved.inspectorRevealFactor,
      resolved.inspectorRevealMin,
      resolved.inspectorRevealMax,
    ),
    dismissThreshold: clamp(
      viewportHeight * resolved.dismissThresholdFactor,
      resolved.dismissThresholdMin,
      resolved.dismissThresholdMax,
    ),
    dismissTravel: viewportHeight + resolved.dismissTravelExtra,
  }
}

interface CreateDismissPresentationSnapshotParams {
  dismissTravel: number
  translateX: number
  translateY: number
  viewportWidth: number
}

export const createDismissPresentationSnapshot = ({
  translateX,
  translateY,
  dismissTravel,
  viewportWidth,
}: CreateDismissPresentationSnapshotParams): MobileViewerDismissSnapshot => {
  const dismissRatio = clamp(translateY / Math.max(dismissTravel, 1), 0, 1)
  const dismissVisual = easeOutQuad(dismissRatio)

  return {
    translateX,
    translateY,
    scale: clamp(1 - dismissVisual * 0.13, 0.8, 1),
    rotate: (translateX / Math.max(viewportWidth, 1)) * (4.5 + dismissVisual * 2.5),
    borderRadius: dismissVisual * 22,
  }
}
