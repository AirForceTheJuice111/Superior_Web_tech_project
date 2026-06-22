package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.AiChatRequest;
import com.example.mlplatform.service.AiService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    /** 前端据此决定是否显示助手按钮;不回传任何密钥。 */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> status() {
        return ApiResponse.success("ok", aiService.status());
    }

    /** 流式对话(SSE),逐字返回用于打字机效果。 */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@RequestBody AiChatRequest request) {
        return aiService.streamChat(request);
    }
}
