package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.InitTrainingRequest;
import com.example.mlplatform.dto.request.RunTrainingRequest;
import com.example.mlplatform.dto.request.StepTrainingRequest;
import com.example.mlplatform.dto.response.TrainingSessionResponse;
import com.example.mlplatform.dto.response.TrainingStatusResponse;

public interface TrainingService {

    TrainingSessionResponse createTraining(InitTrainingRequest request);

    TrainingStatusResponse stepTraining(String sessionId, StepTrainingRequest request);

    TrainingSessionResponse runTraining(String sessionId, RunTrainingRequest request);

    TrainingSessionResponse pauseTraining(String sessionId);

    TrainingSessionResponse stopTraining(String sessionId);

    TrainingStatusResponse getTrainingStatus(String sessionId);

    TrainingSessionResponse getTrainingSession(String sessionId);
}
