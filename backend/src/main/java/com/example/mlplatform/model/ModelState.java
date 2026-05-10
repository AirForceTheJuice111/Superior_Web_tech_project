package com.example.mlplatform.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ModelState {

    private Double loss;
    private Map<String, Object> metrics = new HashMap<>();
    private Map<String, Object> parameters = new HashMap<>();
    private List<PredictionResult> predictions = new ArrayList<>();
    private VisualizationData visualization = new VisualizationData();

    public Double getLoss() {
        return loss;
    }

    public void setLoss(Double loss) {
        this.loss = loss;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public void setMetrics(Map<String, Object> metrics) {
        this.metrics = metrics;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }

    public List<PredictionResult> getPredictions() {
        return predictions;
    }

    public void setPredictions(List<PredictionResult> predictions) {
        this.predictions = predictions;
    }

    public VisualizationData getVisualization() {
        return visualization;
    }

    public void setVisualization(VisualizationData visualization) {
        this.visualization = visualization;
    }
}
