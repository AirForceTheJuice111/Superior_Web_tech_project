package com.example.mlplatform.dto.request;

import jakarta.validation.constraints.Min;

public class StepTrainingRequest {

    @Min(value = 1, message = "stepCount 最少为 1")
    private int stepCount = 1;

    public int getStepCount() {
        return stepCount;
    }

    public void setStepCount(int stepCount) {
        this.stepCount = stepCount;
    }
}
