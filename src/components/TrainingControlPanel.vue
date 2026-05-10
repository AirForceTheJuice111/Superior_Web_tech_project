<template>
  <div class="training-panel">
    <div class="panel-header">
      <div>
        <h2>训练控制模块</h2>
        <p>使用前端 `setInterval` 控制逐步训练，每一步调用后端接口并实时刷新图表、loss 曲线和 accuracy。</p>
      </div>
      <el-tag :type="statusTagType" size="large">{{ trainingState.status || 'idle' }}</el-tag>
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

        <el-form-item label="运行间隔(ms)">
          <el-input-number v-model="form.intervalMs" :min="200" :max="5000" :step="100" />
        </el-form-item>

        <el-form-item label="学习率" v-if="form.algorithm !== 'kmeans'">
          <el-input-number v-model="form.learningRate" :min="0.001" :max="1" :step="0.001" :precision="3" />
        </el-form-item>

        <el-form-item label="聚类数" v-else>
          <el-input-number v-model="form.kValue" :min="2" :max="6" />
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button type="primary" :loading="loading.init" @click="handleInit">初始化</el-button>
        <el-button :disabled="!sessionId || loading.step || isRunning" @click="handleStep">单步执行</el-button>
        <el-button type="success" :disabled="!sessionId || isRunning" @click="startAutoRun">自动训练</el-button>
        <el-button type="warning" :disabled="!sessionId || !isRunning" @click="handlePause">暂停</el-button>
        <el-button :disabled="!sessionId" :loading="loading.status" @click="fetchStatus">刷新状态</el-button>
      </div>

      <el-descriptions :column="4" border class="summary-panel">
        <el-descriptions-item label="Session ID">{{ sessionId || '未初始化' }}</el-descriptions-item>
        <el-descriptions-item label="当前步数">{{ trainingState.currentStep }}</el-descriptions-item>
        <el-descriptions-item label="Loss">{{ formatMetric(trainingState.loss) }}</el-descriptions-item>
        <el-descriptions-item label="Accuracy">{{ formatMetric(trainingState.metrics.accuracy) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <TwoDimensionalVisualizer
      :mode="viewMode"
      :chart-data="trainingState.visualization"
      title="训练过程二维可视化"
      x-name="特征 X"
      y-name="特征 Y"
    />

    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <MetricTrendChart
          title="Loss 曲线"
          subtitle="每次 step 后追加一个 loss 点"
          series-name="Loss"
          color="#F56C6C"
          :data-points="lossHistory"
        />
      </el-col>

      <el-col :xs="24" :lg="12">
        <MetricTrendChart
          title="Accuracy 曲线"
          subtitle="分类显示 accuracy，其他算法显示质量分数"
          series-name="Accuracy"
          color="#67C23A"
          :data-points="accuracyHistory"
        />
      </el-col>
    </el-row>

    <el-card shadow="never" class="payload-card">
      <template #header>
        <div class="payload-header">
          <span>当前训练状态 JSON</span>
          <el-tag size="small" type="info">实时</el-tag>
        </div>
      </template>
      <pre class="payload-preview">{{ statePreview }}</pre>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getTrainingStatus, initTraining, pauseTraining, stepTraining } from '../api/training'
import MetricTrendChart from './MetricTrendChart.vue'
import TwoDimensionalVisualizer from './TwoDimensionalVisualizer.vue'

const form = reactive({
  algorithm: 'linear_regression',
  maxSteps: 50,
  intervalMs: 800,
  learningRate: 0.01,
  kValue: 3
})

const sessionId = ref('')
const timerRef = ref(null)
const isRunning = ref(false)
const isStepPending = ref(false)
const loading = reactive({
  init: false,
  step: false,
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

const lossHistory = ref([])
const accuracyHistory = ref([])

const viewMode = computed(() => {
  if (form.algorithm === 'kmeans') {
    return 'clustering'
  }
  if (form.algorithm === 'svm') {
    return 'classification'
  }
  return 'regression'
})

const statePreview = computed(() => JSON.stringify(trainingState, null, 2))
const statusTagType = computed(() => {
  const map = {
    initialized: 'info',
    running: 'success',
    paused: 'warning',
    completed: 'success',
    stopped: 'danger',
    failed: 'danger',
    idle: 'info'
  }
  return map[trainingState.status] || 'info'
})

function formatMetric(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }
  return Number(value).toFixed(4)
}

function buildInitPayload() {
  const payload = {
    algorithm: form.algorithm,
    datasetId: 'frontend_training_dataset',
    featureColumns: ['x1', 'x2'],
    labelColumn: form.algorithm === 'kmeans' ? null : 'label',
    hyperParams: {},
    trainConfig: {
      maxSteps: form.maxSteps
    }
  }

  if (form.algorithm === 'linear_regression') {
    payload.hyperParams = {
      learningRate: form.learningRate,
      epochs: form.maxSteps,
      fitIntercept: true
    }
  } else if (form.algorithm === 'svm') {
    payload.hyperParams = {
      learningRate: form.learningRate,
      kernel: 'linear',
      cValue: 1.0,
      gamma: 0.1
    }
  } else {
    payload.hyperParams = {
      kValue: form.kValue,
      maxIter: form.maxSteps,
      initMethod: 'k-means++'
    }
  }

  return payload
}

function resetHistory() {
  lossHistory.value = []
  accuracyHistory.value = []
}

function appendMetric(historyRef, step, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return
  }

  const numericValue = Number(value)
  const existingIndex = historyRef.value.findIndex((item) => item.step === step)
  if (existingIndex >= 0) {
    historyRef.value.splice(existingIndex, 1, { step, value: numericValue })
  } else {
    historyRef.value.push({ step, value: numericValue })
  }
}

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

  appendMetric(lossHistory, trainingState.currentStep, trainingState.loss)
  appendMetric(accuracyHistory, trainingState.currentStep, trainingState.metrics.accuracy)
}

function clearRunTimer() {
  if (timerRef.value) {
    clearInterval(timerRef.value)
    timerRef.value = null
  }
  isRunning.value = false
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
  clearRunTimer()
  loading.init = true
  try {
    resetHistory()
    const data = await initTraining(buildInitPayload())
    sessionId.value = data.sessionId
    trainingState.sessionId = data.sessionId
    trainingState.status = data.status
    trainingState.currentStep = data.currentStep
    trainingState.maxSteps = data.maxSteps
    await fetchStatus()
    ElMessage.success('训练初始化成功')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.init = false
  }
}

async function runSingleStep({ silent = false } = {}) {
  if (!sessionId.value || isStepPending.value) {
    return
  }

  isStepPending.value = true
  if (!silent) {
    loading.step = true
  }

  try {
    const data = await stepTraining(sessionId.value, 1)
    applyStatus(data)
    if (!silent) {
      ElMessage.success('单步执行完成')
    }

    if (['completed', 'stopped', 'failed'].includes(trainingState.status)) {
      clearRunTimer()
    }
  } catch (error) {
    clearRunTimer()
    ElMessage.error(error.message)
  } finally {
    isStepPending.value = false
    loading.step = false
  }
}

function handleStep() {
  if (!sessionId.value) {
    ElMessage.warning('请先初始化训练会话')
    return
  }
  runSingleStep()
}

function startAutoRun() {
  if (!sessionId.value) {
    ElMessage.warning('请先初始化训练会话')
    return
  }

  clearRunTimer()
  isRunning.value = true
  trainingState.status = 'running'
  timerRef.value = setInterval(() => {
    if (isStepPending.value) {
      return
    }
    runSingleStep({ silent: true })
  }, form.intervalMs)
}

async function handlePause() {
  if (!sessionId.value) {
    return
  }

  clearRunTimer()
  try {
    const data = await pauseTraining(sessionId.value)
    trainingState.status = data.status
    await fetchStatus()
    ElMessage.success('自动训练已暂停')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function resetStateForAlgorithm() {
  clearRunTimer()
  sessionId.value = ''
  resetHistory()
  Object.assign(trainingState, {
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

watch(
  () => form.algorithm,
  () => {
    resetStateForAlgorithm()
  }
)

onBeforeUnmount(() => {
  clearRunTimer()
})
</script>

<style scoped>
.training-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.panel-header p {
  margin: 0;
  color: #606266;
}

.control-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 16px;
}

.control-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.summary-panel {
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
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
