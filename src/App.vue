<template>
  <header>
    <h1>🚣 Rower Ghost Race</h1>
  </header>

  <section v-if="state === 'home'" class="home">
    <div class="pm5-panel">
      <div class="pm5-status">
        <span class="dot" :class="pm5Status"></span>
        <span v-if="pm5Status === 'connected'">Connected to {{ pm5DeviceName }}</span>
        <span v-else-if="pm5Status === 'connecting'">Connecting…</span>
        <span v-else>Not connected</span>
      </div>

      <button v-if="pm5Status !== 'connected'" class="secondary" :disabled="pm5Status === 'connecting' || !bluetoothSupported" @click="connectPM5(false)">
        Connect to PM5
      </button>
      <button v-else class="secondary" @click="disconnectPM5">Disconnect</button>

      <button
        v-if="pm5Status === 'idle' && bluetoothSupported"
        class="link"
        @click="connectPM5(true)"
      >
        PM5 not in the list? Show all Bluetooth devices
      </button>

      <p v-if="pm5Error" class="error">{{ pm5Error }}</p>

      <div v-if="pm5Data" class="pm5-readout">
        <div>Distance: <strong>{{ pm5Data.distanceMeters.toFixed(1) }} m</strong></div>
        <div>Elapsed: <strong>{{ formatTime(pm5Data.elapsedSeconds) }}</strong></div>
        <div class="raw">raw: {{ pm5Data.raw.join(' ') }}</div>
      </div>

      <p v-if="!bluetoothSupported" class="hint">
        Web Bluetooth isn't available in this browser — open this page in Chrome on Android.
      </p>
      <p v-else-if="pm5Status === 'idle'" class="hint">
        On the PM5: More Options → Turn Wireless On → Bluetooth Smart → select your PM5, then tap Connect here. Phone
        Bluetooth and Location must be on, and ErgData or any other app must not be connected to the PM5.
      </p>
    </div>

    <h2>Pick a category</h2>
    <CategoryTabs :categories="CATEGORIES" :active="activeCategory" @select="activeCategory = $event" />

    <button :disabled="!canStart" @click="startRace">Start {{ activeCategory }} meters</button>
    <p v-if="!canStart" class="hint">Nothing to race against yet — live PM5 racing is the next step.</p>

    <Leaderboard :categories="CATEGORIES" :records="records" />
  </section>

  <section v-else-if="state === 'countdown'">
    <Countdown @done="onCountdownDone" />
  </section>

  <section v-else-if="state === 'racing'" class="racing">
    <div class="big-distance">{{ Math.round(liveDistance) }}m<small>/{{ activeCategory }}m</small></div>
    <div class="big-time">
      {{ formatTime(elapsed) }}
      <span class="position">{{ ordinal(activeFrame.rank) }}<small>/{{ activeFrame.total }}</small></span>
    </div>
    <RaceTrack :frame="activeFrame" :category="activeCategory" />
    <button class="danger" @click="handleFinish">Stop</button>
  </section>

  <section v-else-if="state === 'results'" class="results">
    <h1>Row complete</h1>
    <p v-if="resultPosition === 1" class="congrats">🎉 Congratulations — 1st in the {{ activeCategory }}m category!</p>
    <p>Time: {{ formatTime(resultTime) }}</p>
    <p>Position in category: {{ ordinal(resultPosition) }}</p>
    <p class="hint">
      (Dev placeholder: today's row was stood in for by replaying {{ replayedDate }}'s {{ activeCategory }}m record,
      until the PM5 is connected via Bluetooth.)
    </p>
    <button @click="goHome">Back</button>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Countdown from './components/Countdown.vue'
import CategoryTabs from './components/CategoryTabs.vue'
import Leaderboard from './components/Leaderboard.vue'
import RaceTrack from './components/RaceTrack.vue'
import { CATEGORIES } from './lib/categories.js'
import { ordinal } from './lib/format.js'
import { computeRaceFrame, cropSamplesToCategory, finishTime, ghostsForCategory, rankInCategory } from './lib/ghostEngine.js'
import { createInterpolatedReplay } from './lib/liveFeed.js'
import { connectPM5 as connectPM5Device, isBluetoothSupported } from './lib/pm5.js'
import { loadRecords, saveRecordIfBetter, saveRecords, todayKey } from './lib/storage.js'

const isDev = import.meta.env.DEV

const records = ref([])
const state = ref('home')
const activeCategory = ref(CATEGORIES[0])
const replayedDate = ref('')

// Real PM5 connection test (separate from the Phase 0 replay placeholder
// below): just proves the link works and shows live raw distance/elapsed,
// so rowing a bit and watching the number move confirms connectivity.
const bluetoothSupported = isBluetoothSupported()
const pm5Status = ref('idle') // idle | connecting | connected
const pm5DeviceName = ref('')
const pm5Data = ref(null)
const pm5Error = ref('')
let pm5Connection = null

async function connectPM5(showAllDevices = false) {
  pm5Status.value = 'connecting'
  pm5Error.value = ''
  try {
    pm5Connection = await connectPM5Device({
      showAllDevices,
      onStatus: (data) => {
        pm5Data.value = data
      },
      onDisconnect: () => {
        pm5Status.value = 'idle'
        pm5DeviceName.value = ''
        pm5Data.value = null
        pm5Connection = null
      }
    })
    pm5DeviceName.value = pm5Connection.deviceName
    pm5Status.value = 'connected'
  } catch (error) {
    pm5Status.value = 'idle'
    const reason = error?.message || String(error)
    // Shown on screen so a failure at the gym can be diagnosed from a photo.
    pm5Error.value = /cancel/i.test(reason)
      ? 'No device was chosen. If the PM5 wasn’t in the list, try “Show all Bluetooth devices”.'
      : `Couldn’t connect: ${error?.name ? error.name + ' — ' : ''}${reason}`
  }
}

function disconnectPM5() {
  pm5Connection?.disconnect()
}

const liveSamples = reactive({})
const elapsed = ref(0)
const liveDistance = ref(0)
const resultPosition = ref(null)
let feed = null
let finishing = false

onMounted(async () => {
  records.value = await loadRecords()
  if (isDev && records.value.length === 0) {
    await seedFakeData()
  }
  // Ask the browser not to evict IndexedDB under storage pressure — best
  // effort, some browsers grant it silently once the site is installed/used.
  navigator.storage?.persist?.()
})

// Dev-only (`npm run dev`) seeding from a local, git-ignored fixture generated
// by `npm run generate:fake-data`. The glob is a no-op if the file doesn't
// exist, and the whole block is stripped from production builds, so a deployed
// app can never contain or load fake data.
async function seedFakeData() {
  if (!isDev) return
  const fixtures = import.meta.glob('./data/fake-history.json')
  const load = fixtures['./data/fake-history.json']
  if (!load) {
    console.info('No dev fixture found — run `npm run generate:fake-data` to create one.')
    return
  }
  const { default: history } = await load()
  records.value = await saveRecords(history)
}

const activeFrame = computed(() => {
  // Exclude both the ghost being replayed and any earlier attempt already
  // saved for today — today's live row races the field, it isn't part of it.
  const ghosts = ghostsForCategory(records.value, activeCategory.value, replayedDate.value).filter(
    (r) => r.date !== todayKey()
  )
  return computeRaceFrame({
    liveDistance: liveDistance.value,
    ghosts,
    targetDistance: activeCategory.value,
    currentTime: elapsed.value
  })
})

const resultTime = computed(() => finishTime(liveSamples, activeCategory.value))

// Until live PM5 racing is wired in, a race replays a stored record, so it
// can only start when this category has one.
const canStart = computed(() => records.value.some((r) => r.category === activeCategory.value))

function startRace() {
  state.value = 'countdown'
}

function onCountdownDone() {
  elapsed.value = 0
  liveDistance.value = 0
  finishing = false
  for (const key of Object.keys(liveSamples)) delete liveSamples[key]

  // Phase 0 placeholder: no PM5 connected yet, so "today" is a random past
  // record for this category replayed live. Phase 1 swaps this block for a
  // real Web Bluetooth feed (which will also need to crop the continuous
  // live row into one record per category crossed, via cropSamplesToCategory).
  const candidates = records.value.filter((r) => r.category === activeCategory.value)
  const chosen = candidates[Math.floor(Math.random() * candidates.length)]
  replayedDate.value = chosen.date

  state.value = 'racing'
  feed = createInterpolatedReplay({ samples: chosen.samples, onFrame: handleSample, onDone: handleFinish })
  feed.start()
}

function handleSample(t, distance) {
  liveSamples[t] = distance
  elapsed.value = t
  liveDistance.value = distance
}

watch(liveDistance, (d) => {
  if (d >= activeCategory.value) handleFinish()
})

// Only a completed row (reached the category distance) gets recorded and
// gets a results screen; stopping early just discards the attempt.
async function handleFinish() {
  if (finishing) return
  finishing = true
  feed?.stop()

  const completed = liveDistance.value >= activeCategory.value
  if (!completed) {
    state.value = 'home'
    return
  }

  const time = Math.round(finishTime(liveSamples, activeCategory.value))
  const record = {
    date: todayKey(),
    category: activeCategory.value,
    time,
    samples: cropSamplesToCategory(liveSamples, activeCategory.value)
  }
  records.value = await saveRecordIfBetter(record)
  resultPosition.value = rankInCategory(records.value, activeCategory.value, time)
  state.value = 'results'
}

function goHome() {
  state.value = 'home'
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
</script>

<style scoped>
header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.home,
.results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.racing {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hint {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0;
}
button.link {
  background: none;
  color: #38bdf8;
  padding: 4px 0;
  font-weight: 500;
  font-size: 0.85rem;
  text-align: left;
  text-decoration: underline;
}
.error {
  margin: 0;
  color: #fca5a5;
  font-size: 0.85rem;
  word-break: break-word;
}
.pm5-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #1e293b;
  padding: 12px;
  border-radius: 12px;
}
.pm5-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #64748b;
}
.dot.connecting {
  background: #facc15;
}
.dot.connected {
  background: #4ade80;
}
.pm5-readout {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.95rem;
}
.pm5-readout .raw {
  color: #64748b;
  font-size: 0.75rem;
  font-family: monospace;
  word-break: break-all;
}
.congrats {
  color: #facc15;
  font-weight: 700;
  font-size: 1.1rem;
}
.big-distance {
  font-size: 4.2rem;
  font-weight: 700;
  text-align: center;
  line-height: 1;
}
.big-distance small {
  font-size: 1.9rem;
  font-weight: 400;
  color: #94a3b8;
}
.big-time {
  font-size: 3.4rem;
  font-weight: 700;
  text-align: center;
  color: #38bdf8;
}
.position {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
}
.position small {
  font-size: 1rem;
  font-weight: 500;
  color: #94a3b8;
}
</style>
