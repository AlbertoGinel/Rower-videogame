<template>
  <div class="countdown">
    <div class="number">{{ remaining }}</div>
    <div class="label">get ready</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const emit = defineEmits(['done'])
const remaining = ref(10)
let timer

onMounted(() => {
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      clearInterval(timer)
      emit('done')
    }
  }, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 0;
}
.number {
  font-size: 5rem;
  font-weight: 700;
  color: #38bdf8;
}
.label {
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
