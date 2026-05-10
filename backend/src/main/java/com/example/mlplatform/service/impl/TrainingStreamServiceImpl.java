package com.example.mlplatform.service.impl;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.response.TrainingStatusResponse;
import com.example.mlplatform.service.TrainingStreamService;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class TrainingStreamServiceImpl implements TrainingStreamService {

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribe(String sessionId, TrainingStatusResponse initialPayload) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(sessionId, key -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(sessionId, emitter));
        emitter.onTimeout(() -> removeEmitter(sessionId, emitter));
        emitter.onError(exception -> removeEmitter(sessionId, emitter));

        sendEvent(emitter, "training-status", ApiResponse.success("训练状态更新", initialPayload));
        return emitter;
    }

    @Override
    public void publish(String sessionId, TrainingStatusResponse payload) {
        List<SseEmitter> sessionEmitters = emitters.get(sessionId);
        if (sessionEmitters == null || sessionEmitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : sessionEmitters) {
            sendEvent(emitter, "training-status", ApiResponse.success("训练状态更新", payload));
        }
    }

    private void sendEvent(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException exception) {
            emitter.completeWithError(exception);
        }
    }

    private void removeEmitter(String sessionId, SseEmitter emitter) {
        List<SseEmitter> sessionEmitters = emitters.get(sessionId);
        if (sessionEmitters == null) {
            return;
        }
        sessionEmitters.remove(emitter);
        if (sessionEmitters.isEmpty()) {
            emitters.remove(sessionId);
        }
    }
}
