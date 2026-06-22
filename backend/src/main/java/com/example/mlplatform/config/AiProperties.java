package com.example.mlplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI 助手配置。api-key 只通过环境变量 APP_AI_API_KEY 注入,绝不写入代码库。
 */
@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

    private boolean enabled = true;
    private String baseUrl = "";
    private String apiKey = "";
    private String model = "";
    private int timeoutMs = 60000;
    private int maxTokens = 1024;
    private double temperature = 0.6;
    private String systemPrompt =
            "你是机器学习课程平台的助教导师。用简洁、准确的中文讲清概念,"
            + "优先结合学生当前实验页面的上下文作答;涉及公式给直观解释,涉及代码给关键要点。"
            + "不要编造数据或结果。";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(int timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens) {
        this.maxTokens = maxTokens;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public void setSystemPrompt(String systemPrompt) {
        this.systemPrompt = systemPrompt;
    }
}
