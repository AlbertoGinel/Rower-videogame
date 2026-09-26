// Pure functions: given a samples table (elapsed-seconds -> cumulative meters)
// and a point in time, figure out where a racer is and how the race stands.

export function sortedTimes(samples) {
  return Object.keys(samples)
    .map(Number)
    .sort((a, b) => a - b)
}

export function distanceAtTime(samples, t) {
  const times = sortedTimes(samples)
  if (times.length === 0) return 0
  if (t <= times[0]) return samples[times[0]]
  if (t >= times[times.length - 1]) return samples[times[times.length - 1]]
  for (let i = 0; i < times.length - 1; i++) {
    const t0 = times[i]
    const t1 = times[i + 1]
    if (t >= t0 && t <= t1) {
      const d0 = samples[t0]
      const d1 = samples[t1]
      const ratio = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
      return d0 + (d1 - d0) * ratio
    }
  }
  return samples[times[times.length - 1]]
}

export function maxDistance(samples) {
  const times = sortedTimes(samples)
  if (times.length === 0) return 0
  return samples[times[times.length - 1]]
}

// Returns elapsed seconds at which `samples` first reaches targetDistance,
// or null if that row never got that far.
export function finishTime(samples, targetDistance) {
  const times = sortedTimes(samples)
  let prevT = null
  let prevD = null
  for (const t of times) {
    const d = samples[t]
    if (d >= targetDistance) {
      if (prevT === null) return t
      const ratio = d === prevD ? 0 : (targetDistance - prevD) / (d - prevD)
      return prevT + (t - prevT) * ratio
    }
    prevT = t
    prevD = d
  }
  return null
}

// Crops a continuous samples table down to just one category: everything up
// to and including the sample that first reaches targetDistance. Used to
// turn one continuous row into the self-contained per-category records the
// app actually stores (one record per (date, category)).
export function cropSamplesToCategory(samples, targetDistance) {
  const times = sortedTimes(samples)
  const cropped = {}
  for (const t of times) {
    cropped[t] = samples[t]
    if (samples[t] >= targetDistance) break
  }
  return cropped
}

// A live row arrives ~10 times a second; storing every reading would bloat the
// phone's storage for no gain, since interpolation fills the gaps. Keeps about
// one sample per minGap seconds, always including the first and last (the last
// is the one that crosses the finish line).
export function thinSamples(samples, minGap = 0.5) {
  const times = sortedTimes(samples)
  const thinned = {}
  let lastKept = -Infinity
  times.forEach((t, i) => {
    if (t - lastKept >= minGap || i === times.length - 1) {
      thinned[t] = samples[t]
      lastKept = t
    }
  })
  return thinned
}

// Records are already one-per-category, so this is just a straight filter.
export function ghostsForCategory(records, category, excludeDate) {
  return records.filter((r) => r.category === category && r.date !== excludeDate)
}

// Position/Date/Time leaderboard for a category, fastest first.
export function leaderboardFor(records, category, limit = 10) {
  return records
    .filter((r) => r.category === category)
    .slice()
    .sort((a, b) => a.time - b.time)
    .slice(0, limit)
}

// Where a finish time would rank among a category's stored records
// (1 = fastest ever). Used right after a run to say "you're 3rd" etc.
export function rankInCategory(records, category, time) {
  const faster = records.filter((r) => r.category === category && r.time < time).length
  return faster + 1
}

// currentTime: elapsed seconds into the row.
// ghosts: pre-filtered array of { date, samples }.
export function computeRaceFrame({ liveDistance, ghosts, targetDistance, currentTime }) {
  const meDistance = Math.min(liveDistance, targetDistance)
  const meFinished = liveDistance >= targetDistance

  const racers = [{ id: 'me', date: 'You', distance: meDistance, isMe: true, finished: meFinished }]

  for (const g of ghosts) {
    // Capped at the target rather than dropped once finished, so the field
    // (and everyone's rank) stays stable instead of shrinking mid-race.
    const gd = Math.min(distanceAtTime(g.samples, currentTime), targetDistance)
    racers.push({ id: g.date, date: g.date, distance: gd, isMe: false, finished: gd >= targetDistance })
  }

  racers.sort((a, b) => b.distance - a.distance)
  const meIndex = racers.findIndex((r) => r.isMe)
  const me = racers[meIndex]
  const ahead = meIndex > 0 ? racers[meIndex - 1] : null
  const behind = meIndex < racers.length - 1 ? racers[meIndex + 1] : null

  return {
    rank: meIndex + 1,
    total: racers.length,
    me,
    ahead,
    behind,
    meFinished
  }
}
