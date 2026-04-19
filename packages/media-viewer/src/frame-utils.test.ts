import assert from 'node:assert/strict'
import test from 'node:test'

import { computeViewerMediaFrame, projectViewerMediaFrame } from './frame-utils'

test('computeViewerMediaFrame reserves desktop chrome and fits landscape media', () => {
  const frame = computeViewerMediaFrame(
    { width: 4000, height: 3000 },
    { left: 10, top: 20, width: 1000, height: 800 },
    false,
  )

  assert.deepEqual(frame, {
    left: 10,
    top: 133,
    width: 680,
    height: 510,
    borderRadius: 0,
    rotate: 0,
  })
})

test('computeViewerMediaFrame fits portrait media inside the available height', () => {
  const frame = computeViewerMediaFrame(
    { width: 3000, height: 4000 },
    { left: 0, top: 0, width: 1000, height: 800 },
    false,
  )

  assert.deepEqual(frame, {
    left: 64,
    top: 0,
    width: 552,
    height: 736,
    borderRadius: 0,
    rotate: 0,
  })
})

test('projectViewerMediaFrame applies scale, translation, radius, and rotation around the mobile origin', () => {
  const frame = projectViewerMediaFrame(
    {
      left: 100,
      top: 120,
      width: 300,
      height: 200,
      borderRadius: 0,
      rotate: 0,
    },
    { left: 0, top: 0, width: 1000, height: 800 },
    {
      scale: 0.9,
      translateX: 40,
      translateY: 80,
      borderRadius: 14,
      rotate: 3,
    },
  )

  assert.equal(frame.left, 180)
  assert.equal(frame.top, 202.4)
  assert.equal(frame.width, 270)
  assert.equal(frame.height, 180)
  assert.equal(frame.borderRadius, 14)
  assert.equal(frame.rotate, 3)
})
