<template>
  <el-card shadow="never" class="config-card">
    <template #header>
      <div class="card-header">2. 算法选择</div>
    </template>

    <el-select
      :model-value="modelValue"
      :disabled="disabled"
      placeholder="请先选择学习类型，再选择算法"
      style="width: 100%"
      @change="handleChange"
    >
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div class="algorithm-option">
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </div>
      </el-option>
    </el-select>
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
  },
  disabled: {
    type: Boolean,
    default: false
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

.algorithm-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.algorithm-option small {
  color: #909399;
}
</style>
