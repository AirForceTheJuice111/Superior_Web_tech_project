package com.example.mlplatform.model;

public class PredictionResult {

    private double x;
    private double y;
    private String label;
    private String predicted;

    public PredictionResult() {
    }

    public PredictionResult(double x, double y, String label, String predicted) {
        this.x = x;
        this.y = y;
        this.label = label;
        this.predicted = predicted;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getPredicted() {
        return predicted;
    }

    public void setPredicted(String predicted) {
        this.predicted = predicted;
    }
}
