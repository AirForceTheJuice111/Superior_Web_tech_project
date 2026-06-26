package com.example.mlplatform.config;

import com.example.mlplatform.service.AuthService;
import com.example.mlplatform.service.ChatService;
import com.example.mlplatform.websocket.ChatWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatService chatService;
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    public WebSocketConfig(ChatService chatService, AuthService authService, ObjectMapper objectMapper) {
        this.chatService = chatService;
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new ChatWebSocketHandler(chatService, authService, objectMapper), "/ws/chat")
                .setAllowedOriginPatterns("*");
    }
}
