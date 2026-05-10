package com.example.mlplatform.model;

import java.util.ArrayList;
import java.util.List;

public class VisualizationData {

    private List<PointData> points = new ArrayList<>();
    private List<List<PointData>> boundary = new ArrayList<>();
    private List<PointData> centers = new ArrayList<>();

    public List<PointData> getPoints() {
        return points;
    }

    public void setPoints(List<PointData> points) {
        this.points = points;
    }

    public List<List<PointData>> getBoundary() {
        return boundary;
    }

    public void setBoundary(List<List<PointData>> boundary) {
        this.boundary = boundary;
    }

    public List<PointData> getCenters() {
        return centers;
    }

    public void setCenters(List<PointData> centers) {
        this.centers = centers;
    }
}
