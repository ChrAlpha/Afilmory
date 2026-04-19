import assert from 'node:assert/strict'
import test from 'node:test'

import { createDismissPresentationSnapshot } from './mobile-interaction-utils'

test('createDismissPresentationSnapshot matches the mobile dismiss projection used by the viewer shell', () => {
  const snapshot = createDismissPresentationSnapshot({
    translateX: 50,
    translateY: 200,
    dismissTravel: 900,
    viewportWidth: 390,
  })

  assert.equal(snapshot.translateX, 50)
  assert.equal(snapshot.translateY, 200)
  assert.equal(Number(snapshot.scale.toFixed(4)), 0.9486)
  assert.equal(Number(snapshot.rotate.toFixed(4)), 0.7035)
  assert.equal(Number(snapshot.borderRadius.toFixed(4)), 8.6914)
})
