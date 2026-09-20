<template>
  <div class="track">
    <div v-if="frame.total < 3" class="empty-message">Keep rowing, we're recording!</div>

    <template v-else>
      <div class="line"></div>

      <template v-if="frame.ahead">
        <div class="ball ghost" :style="{ top: TOP_Y + '%' }"></div>
        <div class="row" :style="{ top: TOP_Y + '%' }">
          <span class="date">{{ formatDate(frame.ahead.date) }}</span>
          <span class="rank">{{ ordinal(frame.rank - 1) }}<small>/{{ frame.total }}</small></span>
          <span class="cat">({{ category }}m)</span>
        </div>
      </template>

      <div class="ball me" :style="{ top: meY + '%' }"></div>
      <div class="row me" :style="{ top: meY + '%' }">
        <span class="date you">YOU</span>
        <span class="rank">{{ ordinal(frame.rank) }}<small>/{{ frame.total }}</small></span>
        <span class="cat">({{ category }}m)</span>
      </div>

      <template v-if="frame.behind">
        <div class="ball ghost" :style="{ top: BOTTOM_Y + '%' }"></div>
        <div class="row" :style="{ top: BOTTOM_Y + '%' }">
          <span class="date">{{ formatDate(frame.behind.date) }}</span>
          <span class="rank">{{ ordinal(frame.rank + 1) }}<small>/{{ frame.total }}</small></span>
          <span class="cat">({{ category }}m)</span>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate, ordinal } from '../lib/format.js'

const props = defineProps({
  frame: { type: Object, required: true },
  category: { type: Number, required: true }
})

const TOP_Y = 8
const BOTTOM_Y = 92
// Percent-of-track-height clearance kept between "you" and each anchor, so
// the middle ball can get right up to the others but never overlap them.
const MIN_GAP = 7

// Ahead and behind are fixed anchors at the top/bottom of the line; "you" is
// the only ball that moves, sliding between them in proportion to how close
// you are to each — a straight (distance - behind) / (ahead - behind) ratio,
// clamped so it can only ever touch an anchor, never sit on top of it.
const meY = computed(() => {
  const { ahead, behind, me } = props.frame
  if (!ahead && !behind) return (TOP_Y + BOTTOM_Y) / 2
  if (!ahead) return TOP_Y
  if (!behind) return BOTTOM_Y
  const span = ahead.distance - behind.distance
  const ratio = span > 0 ? (me.distance - behind.distance) / span : 0.5
  const raw = BOTTOM_Y - ratio * (BOTTOM_Y - TOP_Y)
  return Math.min(BOTTOM_Y - MIN_GAP, Math.max(TOP_Y + MIN_GAP, raw))
})
</script>

<style scoped>
.track {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #111827;
  border-radius: 16px;
  overflow: hidden;
}
.line {
  position: absolute;
  left: 26px;
  top: 8%;
  bottom: 8%;
  width: 2px;
  background: #334155;
  transform: translateX(-50%);
}
.ball {
  position: absolute;
  left: 26px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #facc15;
}
.ball.me {
  width: 22px;
  height: 22px;
  background: #22d3ee;
}
.row {
  position: absolute;
  left: 50px;
  width: calc((100% - 62px) * 1.3);
  transform: translateY(-50%);
  display: flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}
.date {
  color: #cbd5e1;
  font-size: 1.25rem;
  font-weight: 600;
  min-width: 62px;
}
.date.you {
  color: #22d3ee;
}
.rank {
  font-size: 2.1rem;
  font-weight: 700;
  color: #f1f5f9;
}
.rank small {
  font-size: 1.3rem;
  font-weight: 500;
  color: #94a3b8;
}
.cat {
  font-size: 1rem;
  color: #64748b;
}
.empty-message {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 32px;
  color: #94a3b8;
  font-size: 1.3rem;
  font-weight: 600;
}
</style>
