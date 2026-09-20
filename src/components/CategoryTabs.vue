<template>
  <div class="tabs">
    <button
      v-for="c in categories"
      :key="c"
      class="tab"
      :class="{ active: c === active, done: finishedSet.has(c) }"
      @click="$emit('select', c)"
    >
      {{ c }}m
      <span v-if="finishedSet.has(c)" class="check">✓</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  categories: { type: Array, required: true },
  active: { type: Number, required: true },
  finished: { type: Array, default: () => [] }
})
defineEmits(['select'])

const finishedSet = computed(() => new Set(props.finished))
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 2px;
  overflow: hidden;
}
.tab {
  flex: 1;
  min-width: 0;
  background: #1e293b;
  color: #94a3b8;
  padding: 7px 0;
  border-radius: 999px;
  font-weight: 600;
  font-size: clamp(0.56rem, 2.7vw, 0.75rem);
  white-space: nowrap;
  text-align: center;
  overflow: hidden;
}
.tab.active {
  background: #38bdf8;
  color: #0f172a;
}
.tab.done:not(.active) {
  color: #a3e635;
}
.check {
  margin-left: 4px;
}
</style>
