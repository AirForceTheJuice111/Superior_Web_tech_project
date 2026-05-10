<template>
  <el-card shadow="never" class="config-card">
    <template #header>
      <div class="card-header">1. 学习类型</div>
    </template>

    <el-radio-group :model-value="modelValue" @change="handleChange" class="type-group">
      <el-radio-button
        v-for="item in options"
        :key="item.value"
        :label="item.value"
      >
        {{ item.label }}
      </el-radio-button>
    </el-radio-group>
  </el-card>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const handleChange = (value) => {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.config-card {
  border-radius: 16px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}

.type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
