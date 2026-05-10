const API_BASE = '/api'

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const result = await response.json()
  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

export function initTraining(payload) {
  return request('/trainings', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function stepTraining(sessionId, stepCount = 1) {
  return request(`/trainings/${sessionId}/step`, {
    method: 'POST',
    body: JSON.stringify({ stepCount })
  })
}

export function runTraining(sessionId, payload) {
  return request(`/trainings/${sessionId}/run`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function pauseTraining(sessionId) {
  return request(`/trainings/${sessionId}/pause`, {
    method: 'POST'
  })
}

export function stopTraining(sessionId) {
  return request(`/trainings/${sessionId}/stop`, {
    method: 'POST'
  })
}

export function getTrainingStatus(sessionId) {
  return request(`/trainings/${sessionId}/status`)
}

export function createTrainingStream(sessionId) {
  return new EventSource(`${API_BASE}/trainings/${sessionId}/stream`)
}
