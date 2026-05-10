package com.example.mlplatform.service;

import com.example.mlplatform.dto.response.TrainingStatusResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface TrainingStreamService {

    SseEmitter subscribe(String sessionId, TrainingStatusResponse initialPayload);

    void publish(String sessionId, TrainingStatusResponse payload);
}
