<template>
  <div class="experiment-panel">
    <div class="hero">
      <div>
        <h1>机器学习实验配置面板</h1>
        <p>支持监督学习、无监督学习、强化学习的统一实验配置。</p>
      </div>
      <el-tag type="success" size="large">Vue3 + Element Plus</el-tag>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <div class="panel-stack">
          <LearningTypeSelector
            v-model="form.learningType"
            :options="learningTypeOptions"
          />

          <AlgorithmSelector
            v-model="form.algorithm"
            :options="currentAlgorithms"
            :disabled="!form.learningType"
          />

          <DatasetSelector
            v-model="form.dataset"
            :options="datasetOptions"
            :show-upload="isCsvUpload"
            @file-change="handleFileChange"
          />
        </div>
      </el-col>

      <el-col :xs="24" :lg="12">
        <DynamicParamForm
          v-model="form.params"
          :params="currentParams"
        />
      </el-col>
    </el-row>

    <el-card shadow="never" class="config-card preview-card">
      <template #header>
        <div class="card-header">5. 实验配置预览</div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="学习类型">
          {{ learningTypeLabel || '未选择' }}
        </el-descriptions-item>
        <el-descriptions-item label="算法">
          {{ algorithmLabel || '未选择' }}
        </el-descriptions-item>
        <el-descriptions-item label="数据集">
          {{ datasetLabel || '未选择' }}
        </el-descriptions-item>
        <el-descriptions-item label="上传文件">
          {{ form.uploadFileName || '未上传' }}
        </el-descriptions-item>
      </el-descriptions>

      <pre class="json-preview">{{ formattedPayload }}</pre>
    </el-card>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import AlgorithmSelector from './AlgorithmSelector.vue'
import DatasetSelector from './DatasetSelector.vue'
import DynamicParamForm from './DynamicParamForm.vue'
import LearningTypeSelector from './LearningTypeSelector.vue'
import {
  algorithmOptionsByType,
  datasetOptions,
  learningTypeOptions
} from '../data/experimentSchemas'

const form = reactive({
  learningType: 'supervised',
  algorithm: '',
  dataset: 'iris',
  params: {},
  uploadFileName: ''
})

const currentAlgorithms = computed(() => {
  return algorithmOptionsByType[form.learningType] || []
})

const currentAlgorithmConfig = computed(() => {
  return currentAlgorithms.value.find((item) => item.value === form.algorithm) || null
})

const currentParams = computed(() => {
  return currentAlgorithmConfig.value?.params || []
})

const isCsvUpload = computed(() => form.dataset === 'csv_upload')

const learningTypeLabel = computed(() => {
  return learningTypeOptions.find((item) => item.value === form.learningType)?.label || ''
})

const algorithmLabel = computed(() => {
  return currentAlgorithmConfig.value?.label || ''
})

const datasetLabel = computed(() => {
  return datasetOptions.find((item) => item.value === form.dataset)?.label || ''
})

const buildDefaultParams = (params = []) => {
  return params.reduce((result, item) => {
    result[item.key] = item.default
    return result
  }, {})
}

watch(
  () => form.learningType,
  (value) => {
    const nextAlgorithms = algorithmOptionsByType[value] || []
    form.algorithm = nextAlgorithms[0]?.value || ''
  },
  { immediate: true }
)

watch(
  () => form.algorithm,
  () => {
    form.params = buildDefaultParams(currentParams.value)
  },
  { immediate: true }
)

watch(
  () => form.dataset,
  (value) => {
    if (value !== 'csv_upload') {
      form.uploadFileName = ''
    }
  }
)

const handleFileChange = (file) => {
  form.uploadFileName = file?.name || ''
}

const formattedPayload = computed(() => {
  return JSON.stringify(
    {
      learningType: form.learningType,
      algorithm: form.algorithm,
      dataset: form.dataset,
      uploadFileName: form.uploadFileName || null,
      params: form.params
    },
    null,
    2
  )
})
</script>

<style scoped>
.experiment-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  color: #fff;
  border-radius: 20px;
  background: linear-gradient(135deg, #409eff, #67c23a);
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

.hero p {
  margin: 0;
  opacity: 0.9;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-card {
  border-radius: 16px;
}

.preview-card {
  margin-top: 4px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}

.json-preview {
  margin: 20px 0 0;
  padding: 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  color: #dcdfe6;
  border-radius: 12px;
  background: #1f2937;
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
