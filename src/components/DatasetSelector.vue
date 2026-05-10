<template>
  <el-card shadow="never" class="config-card">
    <template #header>
      <div class="card-header">3. 数据集选择</div>
    </template>

    <el-form label-width="100px">
      <el-form-item label="数据集">
        <el-select
          :model-value="modelValue"
          placeholder="请选择数据集"
          style="width: 100%"
          @change="handleDatasetChange"
        >
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item v-if="showUpload" label="CSV 文件">
        <el-upload
          action="#"
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :show-file-list="true"
        >
          <el-button type="primary">选择 CSV 文件</el-button>
        </el-upload>
      </el-form-item>
    </el-form>
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
  showUpload: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'file-change'])

const handleDatasetChange = (value) => {
  emit('update:modelValue', value)
}

const handleFileChange = (file) => {
  emit('file-change', file.raw || null)
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
</style>
