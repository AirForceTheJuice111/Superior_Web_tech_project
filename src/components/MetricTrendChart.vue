<template>
  <el-card shadow="never" class="metric-card">
    <template #header>
      <div class="card-header">
        <div>
          <div class="title">{{ title }}</div>
          <div class="subtitle">{{ subtitle }}</div>
        </div>
        <el-tag size="small" type="info">{{ pointCount }} 个点</el-tag>
      </div>
    </template>

    <div ref="chartRef" class="chart-container"></div>
  </el-card>
</template>

<script setup>
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '指标曲线'
  },
  subtitle: {
    type: String,
    default: '训练过程中动态更新'
  },
  seriesName: {
    type: String,
    default: 'Metric'
  },
  color: {
    type: String,
    default: '#409EFF'
  },
  dataPoints: {
    type: Array,
    default: () => []
  }
})

const chartRef = ref(null)
const pointCount = computed(() => props.dataPoints.length)
let chartInstance = null

function getChartOption() {
  return {
    animationDuration: 300,
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: 48,
      right: 20,
      top: 20,
      bottom: 40
    },
    xAxis: {
      type: 'category',
      name: 'Step',
      data: props.dataPoints.map((item) => item.step)
    },
    yAxis: {
      type: 'value',
      name: props.seriesName,
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: props.seriesName,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: props.dataPoints.map((item) => item.value),
        lineStyle: {
          width: 3,
          color: props.color
        },
        itemStyle: {
          color: props.color
        },
        areaStyle: {
          color: props.color,
          opacity: 0.12
        }
      }
    ]
  }
}

function renderChart() {
  if (!chartRef.value) {
    return
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  chartInstance.setOption(getChartOption(), true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

watch(
  () => props.dataPoints,
  () => {
    renderChart()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.metric-card {
  border-radius: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.chart-container {
  width: 100%;
  height: 280px;
}
</style>
