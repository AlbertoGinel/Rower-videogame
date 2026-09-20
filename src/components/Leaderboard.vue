<template>
  <div class="leaderboard">
    <div class="tabs">
      <button
        v-for="c in categories"
        :key="c"
        class="tab"
        :class="{ active: c === selected }"
        @click="selected = c"
      >
        {{ c }}m
      </button>
    </div>
    <div class="panel">
      <div class="row header">
        <span>Position</span>
        <span>Date</span>
        <span>Time</span>
      </div>
      <div v-for="(entry, i) in rows" :key="entry.date" class="row">
        <span>{{ ordinal(i + 1) }}</span>
        <span>{{ formatDate(entry.date) }}</span>
        <span>{{ formatTime(entry.time) }}</span>
      </div>
      <div v-if="rows.length === 0" class="empty">No records yet for this category.</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { leaderboardFor } from '../lib/ghostEngine.js'
import { ordinal } from '../lib/format.js'

const props = defineProps({
  categories: { type: Array, required: true },
  records: { type: Array, required: true },
  limit: { type: Number, default: 10 }
})

const selected = ref(props.categories[0])
const rows = computed(() => leaderboardFor(props.records, selected.value, props.limit))

function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${y.slice(2)}/${m}/${d}`
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.leaderboard {
  display: flex;
  flex-direction: column;
}
.tabs {
  display: flex;
}
.tab {
  flex: 1;
  border-radius: 0;
  background: #0d9488;
  color: #ecfeff;
  padding: 8px 4px;
  font-size: 0.8rem;
  font-weight: 600;
}
.tab:first-child {
  border-radius: 10px 0 0 0;
}
.tab:last-child {
  border-radius: 0 10px 0 0;
}
.tab.active {
  background: #1d4ed8;
}
.panel {
  background: #7dd3dc;
  border-radius: 0 0 10px 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 40vh;
  overflow-y: auto;
}
.row {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 1fr;
  color: #083344;
  font-weight: 600;
  font-size: 0.95rem;
}
.row.header {
  font-weight: 700;
  opacity: 0.85;
}
.empty {
  color: #083344;
  font-size: 0.9rem;
  padding: 4px 0;
}
</style>
