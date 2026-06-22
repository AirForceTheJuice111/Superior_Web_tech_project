package com.example.mlplatform.service;

import com.example.mlplatform.config.AiProperties;
import com.example.mlplatform.dto.request.AiChatRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

/**
 * 调用 OpenAI 兼容的 /chat/completions 流式接口,把增量内容通过 SSE 转发给前端。
 * api-key 只在后端持有,前端永远拿不到。
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final AiProperties props;
    private final ObjectMapper mapper;
    private final HttpClient http;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public AiService(AiProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    }

    public Map<String, Object> status() {
        boolean configured = props.isEnabled()
                && props.getApiKey() != null && !props.getApiKey().isBlank();
        Map<String, Object> m = new HashMap<>();
        m.put("enabled", props.isEnabled());
        m.put("configured", configured);
        m.put("model", props.getModel());
        return m;
    }

    public SseEmitter streamChat(AiChatRequest req) {
        SseEmitter emitter = new SseEmitter((long) props.getTimeoutMs() + 15000L);
        if (!props.isEnabled() || props.getApiKey() == null || props.getApiKey().isBlank()) {
            sendError(emitter, "AI 服务未配置(缺少 API Key)。请在后端环境变量 APP_AI_API_KEY 中设置。");
            return emitter;
        }
        executor.submit(() -> run(req, emitter));
        return emitter;
    }

    private void run(AiChatRequest req, SseEmitter emitter) {
        try {
            String body = mapper.writeValueAsString(buildPayload(req));
            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(trimSlash(props.getBaseUrl()) + "/chat/completions"))
                    .timeout(Duration.ofMillis(props.getTimeoutMs()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + props.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<Stream<String>> resp = http.send(httpReq, HttpResponse.BodyHandlers.ofLines());
            if (resp.statusCode() >= 400) {
                String err;
                try (Stream<String> s = resp.body()) {
                    err = s.reduce("", (a, b) -> a + b);
                }
                sendError(emitter, "上游 AI 服务错误 " + resp.statusCode() + ": " + truncate(err, 300));
                return;
            }

            try (Stream<String> lines = resp.body()) {
                Iterator<String> it = lines.iterator();
                while (it.hasNext()) {
                    String line = it.next();
                    if (line == null || line.isBlank() || !line.startsWith("data:")) {
                        continue;
                    }
                    String payload = line.substring("data:".length()).trim();
                    if ("[DONE]".equals(payload)) {
                        break;
                    }
                    String delta = extractDelta(payload);
                    if (delta != null && !delta.isEmpty()) {
                        emitter.send(Map.of("type", "delta", "text", delta));
                    }
                }
            }
            emitter.send(Map.of("type", "done"));
            emitter.complete();
        } catch (Exception e) {
            log.warn("AI stream failed: {}", e.getMessage());
            sendError(emitter, "AI 调用失败: " + e.getMessage());
        }
    }

    private String extractDelta(String json) {
        try {
            JsonNode node = mapper.readTree(json);
            JsonNode content = node.path("choices").path(0).path("delta").path("content");
            return content.isMissingNode() || content.isNull() ? null : content.asText();
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> buildPayload(AiChatRequest req) throws Exception {
        List<Map<String, String>> msgs = new ArrayList<>();
        msgs.add(Map.of("role", "system", "content", props.getSystemPrompt()));

        if (req.getContext() != null && !req.getContext().isEmpty()) {
            msgs.add(Map.of("role", "system",
                    "content", "以下是用户当前实验页面的上下文(JSON),回答时请结合它:\n"
                            + mapper.writeValueAsString(req.getContext())));
        }

        if (req.getMessages() != null) {
            int start = Math.max(0, req.getMessages().size() - 20);
            for (int i = start; i < req.getMessages().size(); i++) {
                AiChatRequest.Message m = req.getMessages().get(i);
                if (m.getRole() == null || m.getContent() == null) {
                    continue;
                }
                String role = "assistant".equals(m.getRole()) ? "assistant" : "user";
                msgs.add(Map.of("role", role, "content", truncate(m.getContent(), 4000)));
            }
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", props.getModel());
        payload.put("messages", msgs);
        payload.put("stream", true);
        payload.put("max_tokens", props.getMaxTokens());
        payload.put("temperature", props.getTemperature());
        return payload;
    }

    private void sendError(SseEmitter emitter, String message) {
        try {
            emitter.send(Map.of("type", "error", "message", message));
            emitter.send(Map.of("type", "done"));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }

    private static String trimSlash(String s) {
        return (s != null && s.endsWith("/")) ? s.substring(0, s.length() - 1) : s;
    }

    private static String truncate(String s, int n) {
        if (s == null) {
            return "";
        }
        return s.length() <= n ? s : s.substring(0, n);
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdownNow();
    }
}
