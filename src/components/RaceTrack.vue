<template>
  <div class="track">
    <div v-if="frame.total < 3" class="empty-message">Keep rowing, we're recording!</div>

    <template v-else>
      <div class="line"></div>

      <div class="ball" :class="{ me: slots.top.entity.isMe }" :style="{ top: TOP_Y + '%' }"></div>
      <div class="row" :style="{ top: TOP_Y + '%' }">
        <span class="date" :class="{ you: slots.top.entity.isMe }">{{ label(slots.top.entity) }}</span>
        <span class="rank">{{ ordinal(slots.top.rank) }}<small>/{{ frame.total }}</small></span>
        <span class="cat">({{ category }}m)</span>
      </div>

      <div class="ball" :class="{ me: slots.mid.entity.isMe }" :style="{ top: midY + '%' }"></div>
      <div class="row" :style="{ top: midY + '%' }">
        <span class="date" :class="{ you: slots.mid.entity.isMe }">{{ label(slots.mid.entity) }}</span>
        <span class="rank">{{ ordinal(slots.mid.rank) }}<small>/{{ frame.total }}</small></span>
        <span class="cat">({{ category }}m)</span>
      </div>

      <div class="ball" :class="{ me: slots.bottom.entity.isMe }" :style="{ top: BOTTOM_Y + '%' }"></div>
      <div class="row" :style="{ top: BOTTOM_Y + '%' }">
        <span class="date" :class="{ you: slots.bottom.entity.isMe }">{{ label(slots.bottom.entity) }}</span>
        <span class="rank">{{ ordinal(slots.bottom.rank) }}<small>/{{ frame.total }}</small></span>
        <span class="cat">({{ category }}m)</span>
      </div>
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
// Percent-of-track-height clearance kept between the moving ball and each
// anchor, so it can get right up to the others but never overlap them.
const MIN_GAP = 7

// The track always shows three slots: a fixed anchor at the top, a fixed
// anchor at the bottom, and a middle ball that moves between them in
// proportion to the gaps. Who fills each slot depends on your rank:
//  - with a racer both ahead and behind, that's the normal case: ahead is
//    the top anchor, you're the mover, behind is the bottom anchor.
//  - in 1st place there's no one ahead, so the window extends the other
//    way: you take the top anchor yourself, and the next two racers behind
//    you become the mover and the bottom anchor.
//  - last place mirrors that: you're the bottom anchor, and the window
//    extends upward to the two racers ahead of you.
// (frame.total >= 3 whenever this renders, so ahead2/behind2 are always
// there when needed — computeRaceFrame guarantees two racers on whichever
// side the window extends into.)
const slots = computed(() => {
  const { ahead, ahead2, behind, behind2, me, rank } = props.frame
  if (ahead && behind) {
    return {
      top: { entity: ahead, rank: rank - 1 },
      mid: { entity: me, rank },
      bottom: { entity: behind, rank: rank + 1 }
    }
  }
  if (!ahead) {
    return {
      top: { entity: me, rank },
      mid: { entity: behind, rank: rank + 1 },
      bottom: { entity: behind2, rank: rank + 2 }
    }
  }
  return {
    top: { entity: ahead2, rank: rank - 2 },
    mid: { entity: ahead, rank: rank - 1 },
    bottom: { entity: me, rank }
  }
})

const midY = computed(() => {
  const { top, mid, bottom } = slots.value
  const span = top.entity.distance - bottom.entity.distance
  const ratio = span > 0 ? (mid.entity.distance - bottom.entity.distance) / span : 0.5
  const raw = BOTTOM_Y - ratio * (BOTTOM_Y - TOP_Y)
  return Math.min(BOTTOM_Y - MIN_GAP, Math.max(TOP_Y + MIN_GAP, raw))
})

function label(entity) {
  return entity.isMe ? 'YOU' : formatDate(entity.date)
}
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
