<template>
  <el-card shadow="never" class="config-card">
    <template #header>
      <div class="card-header">4. 参数配置</div>
    </template>

    <el-empty
      v-if="!params.length"
      description="请选择算法后查看可配置参数"
    />

    <el-form v-else label-width="140px">
      <el-form-item
        v-for="param in params"
        :key="param.key"
        :label="param.label"
      >
        <el-input-number
          v-if="param.type === 'number'"
          :model-value="modelValue[param.key]"
          :min="param.min"
          :max="param.max"
          :step="param.step || 1"
          style="width: 100%"
          @update:model-value="updateField(param.key, $event)"
        />

        <el-select
          v-else-if="param.type === 'select'"
          :model-value="modelValue[param.key]"
          style="width: 100%"
          @change="updateField(param.key, $event)"
        >
          <el-option
            v-for="option in param.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-switch
          v-else-if="param.type === 'switch'"
          :model-value="modelValue[param.key]"
          @update:model-value="updateField(param.key, $event)"
        />

        <el-input
          v-else
          :model-value="modelValue[param.key]"
          @input="updateField(param.key, $event)"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
const props = defineProps({
  params: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const updateField = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}
</script>

<style scoped>
.config-card {
  min-height: 320px;
  border-radius: 16px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}
</style>
