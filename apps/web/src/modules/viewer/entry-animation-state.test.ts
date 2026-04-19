import assert from 'node:assert/strict'
import test from 'node:test'

import { getProgressiveImageVisualReady, resolvePhotoViewerEntryState } from './entry-animation-state'

test('resolvePhotoViewerEntryState mounts the heavy image stage immediately when there is no trigger element', () => {
  const state = resolvePhotoViewerEntryState({
    hasTriggerElement: false,
    isCurrentImageVisualReady: false,
    isEntryTransitionActive: false,
    isOpen: true,
    isViewerContentVisible: false,
  })

  assert.deepEqual(state, {
    shouldMountImageStage: true,
    shouldShowEntryImageCatchup: false,
  })
})

test('resolvePhotoViewerEntryState keeps the lightweight catch-up layer visible during entry handoff until the image becomes visually ready', () => {
  const state = resolvePhotoViewerEntryState({
    hasTriggerElement: true,
    isCurrentImageVisualReady: false,
    isEntryTransitionActive: true,
    isOpen: true,
    isViewerContentVisible: false,
  })

  assert.deepEqual(state, {
    shouldMountImageStage: false,
    shouldShowEntryImageCatchup: true,
  })
})

test('resolvePhotoViewerEntryState drops the catch-up layer once the stage is visible and the current image is ready', () => {
  const state = resolvePhotoViewerEntryState({
    hasTriggerElement: true,
    isCurrentImageVisualReady: true,
    isEntryTransitionActive: false,
    isOpen: true,
    isViewerContentVisible: true,
  })

  assert.deepEqual(state, {
    shouldMountImageStage: true,
    shouldShowEntryImageCatchup: false,
  })
})

test('getProgressiveImageVisualReady treats a loaded thumbnail as enough to complete the entry handoff before the high-res layer renders', () => {
  assert.equal(
    getProgressiveImageVisualReady({
      isHighResImageRendered: false,
      isThumbnailLoaded: true,
      thumbnailSrc: '/thumb.jpg',
    }),
    true,
  )
})

test('getProgressiveImageVisualReady falls back to the high-res render state when there is no thumbnail', () => {
  assert.equal(
    getProgressiveImageVisualReady({
      isHighResImageRendered: true,
      isThumbnailLoaded: false,
      thumbnailSrc: undefined,
    }),
    true,
  )
  assert.equal(
    getProgressiveImageVisualReady({
      isHighResImageRendered: false,
      isThumbnailLoaded: false,
      thumbnailSrc: undefined,
    }),
    false,
  )
})
