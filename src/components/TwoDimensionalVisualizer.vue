<template>
  <el-card shadow="never" class="visualizer-card">
    <template #header>
      <div class="card-header">
        <div>
          <div class="title">{{ title }}</div>
          <div class="subtitle">{{ modeText }}</div>
        </div>
        <el-tag size="small" type="info">动态刷新</el-tag>
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
    default: '二维数据可视化'
  },
  mode: {
    type: String,
    default: 'classification'
  },
  chartData: {
    type: Object,
    default: () => ({
      points: [],
      boundary: [],
      centers: []
    })
  },
  xName: {
    type: String,
    default: 'X'
  },
  yName: {
    type: String,
    default: 'Y'
  }
})

const colorPalette = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9B59B6']
const chartRef = ref(null)
let chartInstance = null

const modeText = computed(() => {
  const textMap = {
    classification: '分类视图：散点 + 决策边界',
    regression: '回归视图：散点 + 回归线',
    clustering: '聚类视图：散点 + 聚类中心'
  }

  return textMap[props.mode] || '通用二维视图'
})

const labelGroups = computed(() => {
  const groupMap = new Map()

  for (const point of props.chartData.points || []) {
    const label = point.label ?? '未分类'
    if (!groupMap.has(label)) {
      groupMap.set(label, [])
    }
    groupMap.get(label).push([point.x, point.y])
  }

  return Array.from(groupMap.entries())
})

const buildBoundarySeries = () => {
  const boundary = props.chartData.boundary || []
  if (!boundary.length) {
    return []
  }

  // 支持单条线 [[x,y], [x,y]] 或多条线 [[[x,y], ...], [[x,y], ...]]
  const lines = Array.isArray(boundary[0]?.[0]) ? boundary : [boundary]
  const lineName = props.mode === 'regression' ? '回归线' : '决策边界'

  return lines.map((line, index) => ({
    name: `${lineName}${lines.length > 1 ? ` ${index + 1}` : ''}`,
    type: 'line',
    data: line.map((item) => [item.x ?? item[0], item.y ?? item[1]]),
    showSymbol: false,
    smooth: props.mode === 'regression',
    symbolSize: 6,
    lineStyle: {
      width: 2,
      type: props.mode === 'classification' ? 'dashed' : 'solid',
      color: props.mode === 'regression' ? '#F56C6C' : '#7E57C2'
    },
    emphasis: {
      focus: 'series'
    }
  }))
}

const buildCenterSeries = () => {
  const centers = props.chartData.centers || []
  if (!centers.length) {
    return []
  }

  return [
    {
      name: '聚类中心',
      type: 'scatter',
      data: centers.map((item) => [item.x, item.y]),
      symbol: 'diamond',
      symbolSize: 18,
      itemStyle: {
        color: '#111827',
        borderColor: '#F59E0B',
        borderWidth: 2
      },
      emphasis: {
        scale: true
      }
    }
  ]
}

const buildPointSeries = () => {
  return labelGroups.value.map(([label, points], index) => ({
    name: `类别 ${label}`,
    type: 'scatter',
    data: points,
    symbolSize: 10,
    itemStyle: {
      color: colorPalette[index % colorPalette.length]
    },
    emphasis: {
      scale: true
    }
  }))
}

const getChartOption = () => {
  return {
    animationDuration: 400,
    color: colorPalette,
    tooltip: {
      trigger: 'item'
    },
    legend: {
      top: 0
    },
    grid: {
      left: 40,
      right: 24,
      top: 48,
      bottom: 36
    },
    xAxis: {
      type: 'value',
      name: props.xName,
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: props.yName,
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      ...buildPointSeries(),
      ...buildBoundarySeries(),
      ...buildCenterSeries()
    ]
  }
}

const renderChart = () => {
  if (!chartRef.value) {
    return
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  chartInstance.setOption(getChartOption(), true)
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

watch(
  () => props.chartData,
  () => {
    renderChart()
  },
  { deep: true }
)

watch(
  () => props.mode,
  () => {
    renderChart()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.visualizer-card {
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
  height: 440px;
}
</style>
