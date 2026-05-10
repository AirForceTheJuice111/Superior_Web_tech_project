<template>
  <div class="app-shell">
    <div class="app-content">
      <ExperimentConfigPanel />
      <TrainingControlPanel />
    </div>
  </div>
</template>

<script setup>
import ExperimentConfigPanel from './components/ExperimentConfigPanel.vue'
import TrainingControlPanel from './components/TrainingControlPanel.vue'
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 32px;
  background:
    radial-gradient(circle at top left, rgba(64, 158, 255, 0.18), transparent 26%),
    radial-gradient(circle at top right, rgba(103, 194, 58, 0.18), transparent 24%),
    #f5f7fa;
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

@media (max-width: 768px) {
  .app-shell {
    padding: 16px;
  }
}
</style>
