// A 10+ minute row outlasts the phone's screen timeout, and a sleeping screen
// throttles the page and can drop the Bluetooth stream mid-race.
let sentinel = null

export async function keepScreenOn() {
  try {
    if (!sentinel || sentinel.released) sentinel = await navigator.wakeLock?.request('screen')
  } catch {
    // unsupported or denied: the race still works, the screen just may dim
  }
}

export async function releaseScreen() {
  try {
    await sentinel?.release()
  } catch {
    // already released
  }
  sentinel = null
}
