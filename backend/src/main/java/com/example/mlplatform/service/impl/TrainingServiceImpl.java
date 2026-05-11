package com.example.mlplatform.service.impl;

import com.example.mlplatform.client.python.PythonTrainingClient;
import com.example.mlplatform.common.enums.AlgorithmType;
import com.example.mlplatform.common.enums.TrainingStatus;
import com.example.mlplatform.dto.request.InitTrainingRequest;
import com.example.mlplatform.dto.request.RunTrainingRequest;
import com.example.mlplatform.dto.request.StepTrainingRequest;
import com.example.mlplatform.dto.response.TrainingSessionResponse;
import com.example.mlplatform.dto.response.TrainingStatusResponse;
import com.example.mlplatform.model.ModelState;
import com.example.mlplatform.model.PointData;
import com.example.mlplatform.model.PredictionResult;
import com.example.mlplatform.model.TrainingSession;
import com.example.mlplatform.model.VisualizationData;
import com.example.mlplatform.persistence.entity.TrainingSessionEntity;
import com.example.mlplatform.persistence.mapper.TrainingSessionMapper;
import com.example.mlplatform.service.TrainingService;
import com.example.mlplatform.service.TrainingStreamService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TrainingServiceImpl implements TrainingService {

    private final Map<String, TrainingSession> sessionCache = new ConcurrentHashMap<>();
    private final PythonTrainingClient pythonTrainingClient;
    private final TaskExecutor taskExecutor;
    private final TrainingStreamService trainingStreamService;
    private final TrainingSessionMapper trainingSessionMapper;
    private final ObjectMapper objectMapper;

    public TrainingServiceImpl(PythonTrainingClient pythonTrainingClient,
                               TaskExecutor taskExecutor,
                               TrainingStreamService trainingStreamService,
                               TrainingSessionMapper trainingSessionMapper,
                               ObjectMapper objectMapper) {
        this.pythonTrainingClient = pythonTrainingClient;
        this.taskExecutor = taskExecutor;
        this.trainingStreamService = trainingStreamService;
        this.trainingSessionMapper = trainingSessionMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public TrainingSessionResponse createTraining(InitTrainingRequest request) {
        AlgorithmType type = AlgorithmType.fromCode(request.getAlgorithm());
        TrainingSession session = buildBaseSession(type, request);
        Map<String, Object> payload = pythonTrainingClient.initTraining(request);
        session.setSessionId(readString(payload, "sessionId", "train_" + UUID.randomUUID().toString().replace("-", "")));
        applyPythonPayload(session, payload);
        saveSession(session);
        publishSession(session);
        return toSessionResponse(session);
    }

    @Override
    public TrainingStatusResponse stepTraining(String sessionId, StepTrainingRequest request) {
        TrainingSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            validateTrainable(session);
            Map<String, Object> payload = pythonTrainingClient.stepTraining(sessionId, request);
            applyPythonPayload(session, payload);
            saveSession(session);
            publishSession(session);
            return toStatusResponse(session);
        }
    }

    @Override
    public TrainingSessionResponse runTraining(String sessionId, RunTrainingRequest request) {
        TrainingSession session = getSessionOrThrow(sessionId);
        validateTrainable(session);

        synchronized (session) {
            Map<String, Object> payload = pythonTrainingClient.runTraining(sessionId, request);
            applyPythonPayload(session, payload);
            saveSession(session);
            publishSession(session);
        }
        if (request.isAsync()) {
            taskExecutor.execute(() -> monitorPythonSession(sessionId));
        }
        return toSessionResponse(session);
    }

    @Override
    public TrainingSessionResponse pauseTraining(String sessionId) {
        TrainingSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            applyPythonPayload(session, pythonTrainingClient.pauseTraining(sessionId));
            saveSession(session);
            publishSession(session);
            return toSessionResponse(session);
        }
    }

    @Override
    public TrainingSessionResponse stopTraining(String sessionId) {
        TrainingSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            applyPythonPayload(session, pythonTrainingClient.stopTraining(sessionId));
            saveSession(session);
            publishSession(session);
            return toSessionResponse(session);
        }
    }

    @Override
    public TrainingStatusResponse getTrainingStatus(String sessionId) {
        TrainingSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            applyPythonPayload(session, pythonTrainingClient.getStatus(sessionId));
            saveSession(session);
        }
        return toStatusResponse(session);
    }

    @Override
    public TrainingSessionResponse getTrainingSession(String sessionId) {
        return toSessionResponse(getSessionOrThrow(sessionId));
    }

    private void monitorPythonSession(String sessionId) {
        while (true) {
            TrainingSession session = getSessionOrThrow(sessionId);
            synchronized (session) {
                applyPythonPayload(session, pythonTrainingClient.getStatus(sessionId));
                saveSession(session);
                publishSession(session);
                if (session.getStatus() != TrainingStatus.RUNNING) {
                    return;
                }
            }

            try {
                Thread.sleep(300L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private void validateTrainable(TrainingSession session) {
        if (session.getStatus() == TrainingStatus.STOPPED) {
            throw new IllegalArgumentException("训练已停止，不能继续执行");
        }
        if (session.getStatus() == TrainingStatus.COMPLETED) {
            throw new IllegalArgumentException("训练已完成，不能继续执行");
        }
        if (session.getStatus() == TrainingStatus.FAILED) {
            throw new IllegalArgumentException("训练处于失败状态，不能继续执行");
        }
    }

    private TrainingSession getSessionOrThrow(String sessionId) {
        TrainingSession cached = sessionCache.get(sessionId);
        if (cached != null) {
            return cached;
        }

        TrainingSessionEntity entity = trainingSessionMapper.findBySessionId(sessionId);
        if (entity == null) {
            throw new IllegalArgumentException("未找到训练会话: " + sessionId);
        }

        TrainingSession session = fromEntity(entity);
        sessionCache.put(sessionId, session);
        return session;
    }

    private void saveSession(TrainingSession session) {
        sessionCache.put(session.getSessionId(), session);
        TrainingSessionEntity existing = trainingSessionMapper.findBySessionId(session.getSessionId());
        TrainingSessionEntity entity = toEntity(session);
        if (existing == null) {
            trainingSessionMapper.insert(entity);
        } else {
            trainingSessionMapper.update(entity);
        }
    }

    private int readInt(Map<String, Object> source, String key, int defaultValue) {
        Object value = source.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return defaultValue;
    }

    private TrainingSession buildBaseSession(AlgorithmType type, InitTrainingRequest request) {
        TrainingSession session = new TrainingSession();
        session.setAlgorithmType(type);
        session.setDatasetId(request.getDatasetId());
        session.setFeatureColumns(request.getFeatureColumns());
        session.setLabelColumn(request.getLabelColumn());
        session.setHyperParams(new HashMap<>(request.getHyperParams()));
        session.setTrainConfig(new HashMap<>(request.getTrainConfig()));
        session.setStatus(TrainingStatus.INITIALIZED);
        session.setCurrentStep(0);
        session.setMaxSteps(readInt(request.getTrainConfig(), "maxSteps", 100));
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return session;
    }

    private void applyPythonPayload(TrainingSession session, Map<String, Object> payload) {
        session.setSessionId(readString(payload, "sessionId", session.getSessionId()));
        session.setStatus(parseStatus(readString(payload, "status", session.getStatus().name().toLowerCase())));
        session.setCurrentStep(readInt(payload, "currentStep", session.getCurrentStep()));
        session.setMaxSteps(readInt(payload, "maxSteps", session.getMaxSteps()));
        session.setUpdatedAt(LocalDateTime.now());
        session.setModelState(convertModelState(payload));
    }

    private ModelState convertModelState(Map<String, Object> payload) {
        ModelState modelState = new ModelState();
        modelState.setLoss(readDoubleObject(payload, "loss"));
        modelState.setMetrics(readMap(payload, "metrics"));
        modelState.setParameters(readMap(payload, "parameters"));
        modelState.setPredictions(readPredictions(payload));
        modelState.setVisualization(readVisualization(payload));
        return modelState;
    }

    private VisualizationData readVisualization(Map<String, Object> payload) {
        Map<String, Object> visualizationMap = readMap(payload, "visualization");
        VisualizationData visualization = new VisualizationData();
        visualization.setPoints(readPointList(visualizationMap.get("points")));
        visualization.setBoundary(readBoundaryList(visualizationMap.get("boundary")));
        visualization.setCenters(readPointList(visualizationMap.get("centers")));
        return visualization;
    }

    private List<PredictionResult> readPredictions(Map<String, Object> payload) {
        Object rawPredictions = payload.get("predictions");
        if (!(rawPredictions instanceof List<?> predictionList)) {
            return List.of();
        }

        List<PredictionResult> predictions = new ArrayList<>();
        for (Object item : predictionList) {
            if (item instanceof Map<?, ?> map) {
                PredictionResult prediction = new PredictionResult();
                prediction.setX(readDouble(map, "x", 0.0));
                prediction.setY(readDouble(map, "y", 0.0));
                prediction.setLabel(readString(map, "label", null));
                prediction.setPredicted(readString(map, "predicted", null));
                predictions.add(prediction);
            }
        }
        return predictions;
    }

    private List<List<PointData>> readBoundaryList(Object rawBoundary) {
        if (!(rawBoundary instanceof List<?> boundaryList)) {
            return List.of();
        }

        List<List<PointData>> boundaries = new ArrayList<>();
        for (Object item : boundaryList) {
            if (item instanceof List<?> innerList) {
                boundaries.add(readPointList(innerList));
            }
        }
        return boundaries;
    }

    private List<PointData> readPointList(Object rawPoints) {
        if (!(rawPoints instanceof List<?> pointList)) {
            return List.of();
        }

        List<PointData> points = new ArrayList<>();
        for (Object item : pointList) {
            if (item instanceof Map<?, ?> map) {
                PointData point = new PointData();
                point.setX(readDouble(map, "x", 0.0));
                point.setY(readDouble(map, "y", 0.0));
                point.setLabel(readString(map, "label", null));
                points.add(point);
            }
        }
        return points;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readMap(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof Map<?, ?> map) {
            return new HashMap<>((Map<String, Object>) map);
        }
        return new HashMap<>();
    }

    private Double readDoubleObject(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return null;
    }

    private double readDouble(Map<?, ?> source, String key, double defaultValue) {
        Object value = source.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return defaultValue;
    }

    private String readString(Map<?, ?> source, String key, String defaultValue) {
        Object value = source.get(key);
        return value instanceof String text ? text : defaultValue;
    }

    private TrainingStatus parseStatus(String status) {
        return TrainingStatus.valueOf(status.toUpperCase());
    }

    private TrainingSessionResponse toSessionResponse(TrainingSession session) {
        TrainingSessionResponse response = new TrainingSessionResponse();
        response.setSessionId(session.getSessionId());
        response.setAlgorithm(session.getAlgorithmType().toCode());
        response.setStatus(session.getStatus().name().toLowerCase());
        response.setCurrentStep(session.getCurrentStep());
        response.setMaxSteps(session.getMaxSteps());
        response.setCreatedAt(session.getCreatedAt());
        return response;
    }

    private TrainingStatusResponse toStatusResponse(TrainingSession session) {
        TrainingStatusResponse response = new TrainingStatusResponse();
        response.setSessionId(session.getSessionId());
        response.setAlgorithm(session.getAlgorithmType().toCode());
        response.setStatus(session.getStatus().name().toLowerCase());
        response.setCurrentStep(session.getCurrentStep());
        response.setMaxSteps(session.getMaxSteps());
        response.setProgress(session.getMaxSteps() == 0 ? 0.0 : (double) session.getCurrentStep() / session.getMaxSteps());
        response.setLoss(session.getModelState().getLoss());
        response.setMetrics(session.getModelState().getMetrics());
        response.setParameters(session.getModelState().getParameters());
        response.setPredictions(session.getModelState().getPredictions());
        response.setVisualization(session.getModelState().getVisualization());
        response.setUpdatedAt(session.getUpdatedAt());
        return response;
    }

    private void publishSession(TrainingSession session) {
        trainingStreamService.publish(session.getSessionId(), toStatusResponse(session));
    }

    private TrainingSessionEntity toEntity(TrainingSession session) {
        TrainingSessionEntity entity = new TrainingSessionEntity();
        entity.setSessionId(session.getSessionId());
        entity.setAlgorithmCode(session.getAlgorithmType().toCode());
        entity.setDatasetId(session.getDatasetId());
        entity.setFeatureColumnsJson(writeJson(session.getFeatureColumns()));
        entity.setLabelColumn(session.getLabelColumn());
        entity.setHyperParamsJson(writeJson(session.getHyperParams()));
        entity.setTrainConfigJson(writeJson(session.getTrainConfig()));
        entity.setStatus(session.getStatus().name());
        entity.setCurrentStep(session.getCurrentStep());
        entity.setMaxSteps(session.getMaxSteps());
        entity.setLoss(session.getModelState().getLoss());
        entity.setMetricsJson(writeJson(session.getModelState().getMetrics()));
        entity.setParametersJson(writeJson(session.getModelState().getParameters()));
        entity.setPredictionsJson(writeJson(session.getModelState().getPredictions()));
        entity.setVisualizationJson(writeJson(session.getModelState().getVisualization()));
        entity.setCreatedAt(session.getCreatedAt());
        entity.setUpdatedAt(session.getUpdatedAt());
        return entity;
    }

    private TrainingSession fromEntity(TrainingSessionEntity entity) {
        TrainingSession session = new TrainingSession();
        session.setSessionId(entity.getSessionId());
        session.setAlgorithmType(AlgorithmType.fromCode(entity.getAlgorithmCode()));
        session.setDatasetId(entity.getDatasetId());
        session.setFeatureColumns(readJson(entity.getFeatureColumnsJson(), new TypeReference<List<String>>() {}, List.of()));
        session.setLabelColumn(entity.getLabelColumn());
        session.setHyperParams(readJson(entity.getHyperParamsJson(), new TypeReference<Map<String, Object>>() {}, new HashMap<>()));
        session.setTrainConfig(readJson(entity.getTrainConfigJson(), new TypeReference<Map<String, Object>>() {}, new HashMap<>()));
        session.setStatus(TrainingStatus.valueOf(entity.getStatus()));
        session.setCurrentStep(entity.getCurrentStep());
        session.setMaxSteps(entity.getMaxSteps());
        session.setCreatedAt(entity.getCreatedAt());
        session.setUpdatedAt(entity.getUpdatedAt());

        ModelState modelState = new ModelState();
        modelState.setLoss(entity.getLoss());
        modelState.setMetrics(readJson(entity.getMetricsJson(), new TypeReference<Map<String, Object>>() {}, new HashMap<>()));
        modelState.setParameters(readJson(entity.getParametersJson(), new TypeReference<Map<String, Object>>() {}, new HashMap<>()));
        modelState.setPredictions(readJson(entity.getPredictionsJson(), new TypeReference<List<PredictionResult>>() {}, List.of()));
        modelState.setVisualization(readJson(entity.getVisualizationJson(), new TypeReference<VisualizationData>() {}, new VisualizationData()));
        session.setModelState(modelState);
        return session;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("序列化训练会话失败", exception);
        }
    }

    private <T> T readJson(String value, TypeReference<T> typeReference, T defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        try {
            return objectMapper.readValue(value, typeReference);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("反序列化训练会话失败", exception);
        }
    }
}
