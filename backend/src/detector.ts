export const DETECTOR_MAX_CHARGES = 10
export const DETECTOR_RECHARGE_MS = 10 * 60 * 1000
export const DETECTOR_DRILL_MS = 10 * 1000

export function rechargeDetectorCharges(charges: number, chargeUpdatedAt: number, now: number) {
  const current = Math.min(DETECTOR_MAX_CHARGES, Math.max(0, Math.floor(Number.isFinite(charges) ? charges : 0)))
  const updatedAt = Number.isFinite(chargeUpdatedAt) ? chargeUpdatedAt : now
  if (current >= DETECTOR_MAX_CHARGES) return { charges: DETECTOR_MAX_CHARGES, chargeUpdatedAt: now }
  const restored = Math.floor(Math.max(0, now - updatedAt) / DETECTOR_RECHARGE_MS)
  const nextCharges = Math.min(DETECTOR_MAX_CHARGES, current + restored)
  return {
    charges: nextCharges,
    chargeUpdatedAt: nextCharges === DETECTOR_MAX_CHARGES ? now : updatedAt + restored * DETECTOR_RECHARGE_MS,
  }
}

export function detectorDepthForInvestment(gold: number) {
  const investment = Number.isFinite(gold) ? Math.max(0, Math.floor(gold)) : 0
  return Math.floor(Math.sqrt(investment))
}

export function detectorDepthGain(gold: number, previousInvestment = 0) {
  const investment = Number.isFinite(gold) ? Math.max(0, Math.floor(gold)) : 0
  const previous = Number.isFinite(previousInvestment) ? Math.max(0, Math.floor(previousInvestment)) : 0
  return detectorDepthForInvestment(previous + investment) - detectorDepthForInvestment(previous)
}

export function detectorEmptyChance(depth: number) {
  const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0
  return Math.max(.35, .78 - Math.min(215, safeDepth) * .002)
}

export function detectorJackpotChance(depth: number) {
  const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0
  return Math.min(.06, .015 + safeDepth * .00015)
}

export function detectorRewardScale(depth: number) {
  const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0
  return 1 + safeDepth / 30
}
