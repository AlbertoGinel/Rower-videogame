import { CATEGORIES } from './categories.js'
import { cropSamplesToCategory, finishTime } from './ghostEngine.js'

// Dev-only: generates a plausible history so the ghost-race mechanic can be
// tried out before the PM5 is actually wired up (Phase 1). Every fake day
// rows the full top-category distance, then gets split into one
// self-contained record per category (date, category, time, samples),
// matching how the app actually stores real rows.
function dateDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

// A per-racer pace profile: a base speed plus a slow surge/fade wave and
// per-second noise, so the field doesn't move in lockstep.
function makePaceProfile() {
  const base = 1.9 + Math.random() * 1.3 // ~1.9-3.2 m/s
  const amplitude = Math.random() * 0.6
  const frequency = 0.015 + Math.random() * 0.05
  const phase = Math.random() * Math.PI * 2
  const noise = 0.3 + Math.random() * 0.5
  return (t) => Math.max(0.3, base + amplitude * Math.sin(t * frequency + phase) + (Math.random() - 0.5) * noise)
}

function buildFullSamples(paceAt, target, maxSeconds = 4000) {
  const samples = {}
  let distance = 0
  let t = 0
  while (distance < target && t < maxSeconds) {
    t += 1
    distance += paceAt(t)
    samples[t] = Math.round(distance * 10) / 10
  }
  return samples
}

export function generateFakeHistory(days = 100) {
  const topTarget = CATEGORIES[CATEGORIES.length - 1]
  const records = []
  for (let i = days; i >= 1; i--) {
    const date = dateDaysAgo(i)
    const fullSamples = buildFullSamples(makePaceProfile(), topTarget)
    for (const category of CATEGORIES) {
      const time = finishTime(fullSamples, category)
      if (time === null) continue
      records.push({
        date,
        category,
        time: Math.round(time),
        samples: cropSamplesToCategory(fullSamples, category)
      })
    }
  }
  return records
}
