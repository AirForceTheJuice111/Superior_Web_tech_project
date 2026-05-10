<template>
  <div class="demo-panel">
    <div class="demo-header">
      <div>
        <h2>训练可视化联调面板</h2>
        <p>通过 Spring Boot 训练接口驱动 ECharts 图表，支持 init、step、run、status 和 SSE 实时更新。</p>
      </div>
      <el-tag type="success" size="large">{{ statusText }}</el-tag>
    </div>

    <el-card shadow="never" class="control-card">
      <el-form label-width="110px" class="control-form">
        <el-form-item label="算法">
          <el-select v-model="form.algorithm" style="width: 220px">
            <el-option label="线性回归" value="linear_regression" />
            <el-option label="SVM" value="svm" />
            <el-option label="KMeans" value="kmeans" />
          </el-select>
        </el-form-item>

        <el-form-item label="最大步数">
          <el-input-number v-model="form.maxSteps" :min="1" :max="500" />
        </el-form-item>

        <el-form-item label="运行步数">
          <el-input-number v-model="form.targetSteps" :min="1" :max="200" />
        </el-form-item>

        <el-form-item label="推送间隔">
          <el-input-number v-model="form.pushInterval" :min="1" :max="20" />
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button type="primary" :loading="loading.init" @click="handleInit">初始化</el-button>
        <el-button :disabled="!sessionId" :loading="loading.step" @click="handleStep">单步训练</el-button>
        <el-button type="success" :disabled="!sessionId" :loading="loading.run" @click="handleRun">连续训练</el-button>
        <el-button :disabled="!sessionId" :loading="loading.status" @click="fetchStatus">刷新状态</el-button>
        <el-button type="warning" :disabled="!sessionId" @click="handlePause">暂停</el-button>
        <el-button type="danger" :disabled="!sessionId" @click="handleStop">停止</el-button>
      </div>

      <el-descriptions :column="3" border class="meta-panel">
        <el-descriptions-item label="Session ID">{{ sessionId || '未初始化' }}</el-descriptions-item>
        <el-descriptions-item label="当前步数">{{ trainingState.currentStep }}</el-descriptions-item>
        <el-descriptions-item label="Loss">{{ trainingState.loss ?? '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <TwoDimensionalVisualizer
      :mode="viewMode"
      :chart-data="chartData"
      title="训练可视化面板"
      x-name="特征 X"
      y-name="特征 Y"
    />

    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="payload-card">
          <template #header>
            <div class="payload-header">
              <span>训练状态</span>
              <el-tag size="small" type="info">实时返回</el-tag>
            </div>
          </template>
          <pre class="payload-preview">{{ statePreview }}</pre>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="payload-card">
          <template #header>
            <div class="payload-header">
              <span>可视化数据</span>
              <el-tag size="small" type="success">驱动图表</el-tag>
            </div>
          </template>
          <pre class="payload-preview">{{ payloadPreview }}</pre>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createTrainingStream,
  getTrainingStatus,
  initTraining,
  pauseTraining,
  runTraining,
  stepTraining,
  stopTraining
} from '../api/training'
import TwoDimensionalVisualizer from './TwoDimensionalVisualizer.vue'

const form = reactive({
  algorithm: 'linear_regression',
  maxSteps: 50,
  targetSteps: 12,
  pushInterval: 1
})

const sessionId = ref('')
const streamRef = ref(null)
const loading = reactive({
  init: false,
  step: false,
  run: false,
  status: false
})

const trainingState = reactive({
  sessionId: '',
  algorithm: 'linear_regression',
  status: 'idle',
  currentStep: 0,
  maxSteps: 0,
  progress: 0,
  loss: null,
  metrics: {},
  parameters: {},
  predictions: [],
  visualization: {
    points: [],
    boundary: [],
    centers: []
  },
  updatedAt: null
})

const viewMode = computed(() => {
  if (form.algorithm === 'kmeans') {
    return 'clustering'
  }
  if (form.algorithm === 'svm') {
    return 'classification'
  }
  return 'regression'
})

const chartData = computed(() => trainingState.visualization)

const payloadPreview = computed(() => JSON.stringify(trainingState.visualization, null, 2))
const statePreview = computed(() => JSON.stringify(trainingState, null, 2))
const statusText = computed(() => trainingState.status || 'idle')

function applyStatus(payload) {
  trainingState.sessionId = payload.sessionId || sessionId.value
  trainingState.algorithm = payload.algorithm || form.algorithm
  trainingState.status = payload.status || trainingState.status
  trainingState.currentStep = payload.currentStep ?? trainingState.currentStep
  trainingState.maxSteps = payload.maxSteps ?? trainingState.maxSteps
  trainingState.progress = payload.progress ?? trainingState.progress
  trainingState.loss = payload.loss ?? trainingState.loss
  trainingState.metrics = payload.metrics || {}
  trainingState.parameters = payload.parameters || {}
  trainingState.predictions = payload.predictions || []
  trainingState.visualization = payload.visualization || {
    points: [],
    boundary: [],
    centers: []
  }
  trainingState.updatedAt = payload.updatedAt || null
}

function buildInitPayload() {
  const base = {
    algorithm: form.algorithm,
    datasetId: 'frontend_demo_dataset',
    featureColumns: ['x1', 'x2'],
    labelColumn: form.algorithm === 'kmeans' ? null : 'label',
    hyperParams: {},
    trainConfig: {
      maxSteps: form.maxSteps
    }
  }

  if (form.algorithm === 'linear_regression') {
    base.hyperParams = { learningRate: 0.01, epochs: form.maxSteps, fitIntercept: true }
  } else if (form.algorithm === 'svm') {
    base.hyperParams = { kernel: 'rbf', cValue: 1.0, gamma: 0.1 }
  } else {
    base.hyperParams = { kValue: 3, maxIter: form.maxSteps, initMethod: 'k-means++' }
  }

  return base
}

function closeStream() {
  if (streamRef.value) {
    streamRef.value.close()
    streamRef.value = null
  }
}

function openStream() {
  if (!sessionId.value) {
    return
  }

  closeStream()
  const source = createTrainingStream(sessionId.value)
  const handleMessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      if (payload?.data) {
        applyStatus(payload.data)
      }
    } catch (error) {
      console.error('SSE 数据解析失败', error)
    }
  }
  source.addEventListener('training-status', handleMessage)
  source.onmessage = handleMessage
  source.onerror = () => {
    closeStream()
  }
  streamRef.value = source
}

async function fetchStatus() {
  if (!sessionId.value) {
    return
  }
  loading.status = true
  try {
    const data = await getTrainingStatus(sessionId.value)
    applyStatus(data)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.status = false
  }
}

async function handleInit() {
  loading.init = true
  try {
    const data = await initTraining(buildInitPayload())
    sessionId.value = data.sessionId
    trainingState.sessionId = data.sessionId
    trainingState.status = data.status
    trainingState.currentStep = data.currentStep
    trainingState.maxSteps = data.maxSteps
    openStream()
    await fetchStatus()
    ElMessage.success('训练会话初始化成功')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.init = false
  }
}

async function handleStep() {
  if (!sessionId.value) {
    ElMessage.warning('请先初始化训练会话')
    return
  }
  loading.step = true
  try {
    const data = await stepTraining(sessionId.value, 1)
    applyStatus(data)
    ElMessage.success('单步训练完成')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.step = false
  }
}

async function handleRun() {
  if (!sessionId.value) {
    ElMessage.warning('请先初始化训练会话')
    return
  }
  loading.run = true
  try {
    openStream()
    const data = await runTraining(sessionId.value, {
      targetSteps: form.targetSteps,
      async: true,
      pushInterval: form.pushInterval
    })
    trainingState.status = data.status
    trainingState.currentStep = data.currentStep
    trainingState.maxSteps = data.maxSteps
    ElMessage.success('连续训练已启动')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.run = false
  }
}

async function handlePause() {
  if (!sessionId.value) {
    return
  }
  try {
    const data = await pauseTraining(sessionId.value)
    trainingState.status = data.status
    await fetchStatus()
    ElMessage.success('训练已暂停')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function handleStop() {
  if (!sessionId.value) {
    return
  }
  try {
    const data = await stopTraining(sessionId.value)
    trainingState.status = data.status
    closeStream()
    await fetchStatus()
    ElMessage.success('训练已停止')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

watch(
  () => form.algorithm,
  () => {
    sessionId.value = ''
    closeStream()
    applyStatus({
      sessionId: '',
      algorithm: form.algorithm,
      status: 'idle',
      currentStep: 0,
      maxSteps: 0,
      progress: 0,
      loss: null,
      metrics: {},
      parameters: {},
      predictions: [],
      visualization: {
        points: [],
        boundary: [],
        centers: []
      },
      updatedAt: null
    })
  }
)

onBeforeUnmount(() => {
  closeStream()
})
</script>

<style scoped>
.demo-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.demo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.demo-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.demo-header p {
  margin: 0;
  color: #606266;
}

.control-card,
.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.actions {
  flex-direction: row;
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-panel {
  margin-top: 4px;
}

.payload-card {
  border-radius: 16px;
}

.payload-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.payload-preview {
  margin: 0;
  padding: 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  color: #dcdfe6;
  border-radius: 12px;
  background: #111827;
}

@media (max-width: 960px) {
  .demo-header,
  .actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
