package com.example.mlplatform.dto.request;

import jakarta.validation.constraints.Min;

public class RunTrainingRequest {

    @Min(value = 1, message = "targetSteps 最少为 1")
    private int targetSteps = 10;

    @Min(value = 1, message = "pushInterval 最少为 1")
    private int pushInterval = 1;

    private boolean async = true;

    public int getTargetSteps() {
        return targetSteps;
    }

    public void setTargetSteps(int targetSteps) {
        this.targetSteps = targetSteps;
    }

    public int getPushInterval() {
        return pushInterval;
    }

    public void setPushInterval(int pushInterval) {
        this.pushInterval = pushInterval;
    }

    public boolean isAsync() {
        return async;
    }

    public void setAsync(boolean async) {
        this.async = async;
    }
}
