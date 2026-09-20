import { distanceAtTime } from './ghostEngine.js'

// Phase 0 stand-in for the real PM5 connection (Phase 1, via Web Bluetooth).
// The full samples table is already known (it's a past recording), so
// playback interpolates it against wall-clock time at tickHz — smooth
// on-screen motion regardless of how sparse the original samples were.
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
