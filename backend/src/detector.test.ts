import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DETECTOR_DRILL_MS, DETECTOR_MAX_CHARGES, DETECTOR_RECHARGE_MS,
  detectorDepthForInvestment, detectorDepthGain, detectorEmptyChance, detectorJackpotChance, detectorRewardScale,
  rechargeDetectorCharges,
} from './detector.ts'

test('detector timing and charge limits match the game rules', () => {
  assert.equal(DETECTOR_MAX_CHARGES, 10)
  assert.equal(DETECTOR_RECHARGE_MS, 10 * 60 * 1000)
  assert.equal(DETECTOR_DRILL_MS, 10 * 1000)
})

test('charges restore every ten minutes and cap at ten', () => {
  const start = 1_000
  assert.deepEqual(rechargeDetectorCharges(9, start, start + DETECTOR_RECHARGE_MS - 1), { charges: 9, chargeUpdatedAt: start })
  assert.deepEqual(rechargeDetectorCharges(8, start, start + DETECTOR_RECHARGE_MS), { charges: 9, chargeUpdatedAt: start + DETECTOR_RECHARGE_MS })
  assert.deepEqual(rechargeDetectorCharges(3, start, start + DETECTOR_RECHARGE_MS * 20), { charges: 10, chargeUpdatedAt: start + DETECTOR_RECHARGE_MS * 20 })
})

test('depth depends on total investment and cannot be improved by splitting gold', () => {
  assert.equal(detectorDepthForInvestment(0), 0)
  assert.equal(detectorDepthForInvestment(100), 10)
  assert.equal(detectorDepthGain(100, 0), 10)
  assert.equal(detectorDepthGain(36, 64), 2)
  assert.equal(detectorDepthGain(1, 100), 0)
})

test('deeper sites reduce empty ground and improve jackpots and reward scale', () => {
  assert.equal(detectorEmptyChance(0), .78)
  assert.ok(detectorEmptyChance(100) < detectorEmptyChance(0))
  assert.ok(Math.abs(detectorEmptyChance(10_000) - .35) < Number.EPSILON)
  assert.ok(detectorJackpotChance(100) > detectorJackpotChance(0))
  assert.equal(detectorJackpotChance(10_000), .06)
  assert.ok(detectorRewardScale(100) > detectorRewardScale(0))
})

test('invalid detector inputs fall back safely', () => {
  assert.equal(detectorDepthForInvestment(Number.NaN), 0)
  assert.equal(detectorDepthGain(-10, -20), 0)
  assert.equal(detectorEmptyChance(Number.NaN), .78)
  assert.equal(detectorRewardScale(-100), 1)
})
