import { distanceAtTime } from './ghostEngine.js'

// Live race clock for a real PM5. The PM5 reports cumulative distance since
// its own workout began, but a race is measured from GO, so the reading at GO
// (or the first reading, if none has arrived yet) is the zero point.
//   start()        — GO: starts the clock
//   push(meters)   — call with every raw PM5 distance reading
//   onSample(t, m) — fires per reading: seconds since GO, meters since GO
//   onTick(t)      — fires tickHz times a second so the clock stays smooth
//                    between readings
export function createLiveFeed({ zeroDistance = null, onSample, onTick, tickHz = 10 }) {
  let zero = zeroDistance
  let startedAt = null
  let timer = null

  const elapsed = () => (performance.now() - startedAt) / 1000

  return {
    start() {
      startedAt = performance.now()
      timer = setInterval(() => onTick(elapsed()), 1000 / tickHz)
    },
    push(rawDistance) {
      if (startedAt === null) return
      // A reading below the zero point means the PM5 reset its workout mid-race.
      if (zero === null || rawDistance < zero) zero = rawDistance
      onSample(Math.round(elapsed() * 100) / 100, Math.round((rawDistance - zero) * 10) / 10)
    },
    stop() {
      clearInterval(timer)
      startedAt = null
    }
  }
}

// Dev-only stand-in for a rower: replays a stored record as if it were
// happening live. The full samples table is already known, so playback
// interpolates it against wall-clock time at tickHz.
// onFrame(elapsedSeconds, cumulativeMeters) fires every tick.
export function createInterpolatedReplay({ samples, onFrame, onDone, tickHz = 10 }) {
  const times = Object.keys(samples).map(Number)
  const maxT = times.length ? Math.max(...times) : 0
  let timer = null
  let startedAt = null

  function tick() {
    const t = (performance.now() - startedAt) / 1000
    if (t >= maxT) {
      onFrame(maxT, distanceAtTime(samples, maxT))
      clearInterval(timer)
      onDone?.()
      return
    }
    onFrame(t, distanceAtTime(samples, t))
  }

  return {
    start() {
      startedAt = performance.now()
      timer = setInterval(tick, 1000 / tickHz)
    },
    stop() {
      clearInterval(timer)
    }
  }
}
