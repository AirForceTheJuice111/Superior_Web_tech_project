package com.example.mlplatform.websocket;

import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import com.example.mlplatform.service.AuthService;
import com.example.mlplatform.service.ChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * 单一全站聊天室:维护活跃连接集合,连接=在线人数。
 * 登录用户(URL ?token= 可解析)才能发言;匿名只能接收。消息落库并广播。
 */
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final int HISTORY_LIMIT = 50;
    private static final int MAX_CONTENT = 500;

    private final ChatService chatService;
    private final AuthService authService;
    private final ObjectMapper objectMapper;
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    public ChatWebSocketHandler(ChatService chatService, AuthService authService, ObjectMapper objectMapper) {
        this.chatService = chatService;
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String token = queryParam(session, "token");
        Long userId = (token == null || token.isBlank())
                ? null
                : authService.resolveUserId(token.startsWith("Bearer ") ? token.substring(7).trim() : token.trim());
        String name = chatService.displayNameOf(userId);
        if (userId != null && name != null) {
            session.getAttributes().put("userId", userId);
            session.getAttributes().put("name", name);
        }
        sessions.add(session);

        List<ChatMessageEntity> recent = chatService.recent(HISTORY_LIMIT);
        Collections.reverse(recent);
        List<Map<String, Object>> messages = new ArrayList<>();
        for (ChatMessageEntity m : recent) {
            messages.add(toMap(m));
        }
        send(session, Map.of("type", "history", "messages", messages));
        broadcastPresence();
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws Exception {
        Object userId = session.getAttributes().get("userId");
        Object name = session.getAttributes().get("name");
        if (userId == null || name == null) {
            send(session, Map.of("type", "error", "message", "登录后才能发言"));
            return;
        }
        Map<?, ?> payload = objectMapper.readValue(textMessage.getPayload(), Map.class);
        Object rawContent = payload.get("content");
        if (rawContent == null) {
            return;
        }
        String content = rawContent.toString().trim();
        if (content.isEmpty()) {
            return;
        }
        if (content.length() > MAX_CONTENT) {
            content = content.substring(0, MAX_CONTENT);
        }
        ChatMessageEntity saved = chatService.save((Long) userId, name.toString(), content);
        broadcast(Map.of("type", "message", "message", toMap(saved)));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        broadcastPresence();
    }

    private Map<String, Object> toMap(ChatMessageEntity m) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", m.getId());
        map.put("senderName", m.getSenderName());
        map.put("content", m.getContent());
        map.put("createdAt", String.valueOf(m.getCreatedAt()));
        return map;
    }

    private void broadcastPresence() {
        // 在线人数按"去重后的登录用户数"统计:同一用户开多个标签页只算 1,匿名连接不计入
        Set<Long> distinctUsers = new HashSet<>();
        for (WebSocketSession session : sessions) {
            Object userId = session.getAttributes().get("userId");
            if (userId instanceof Long uid) {
                distinctUsers.add(uid);
            }
        }
        broadcast(Map.of("type", "presence", "online", distinctUsers.size()));
    }

    private void broadcast(Object payload) {
        for (WebSocketSession session : sessions) {
            send(session, payload);
        }
    }

    private void send(WebSocketSession session, Object payload) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
            }
        } catch (Exception exception) {
            sessions.remove(session);
        }
    }

    private String queryParam(WebSocketSession session, String key) {
        if (session.getUri() == null || session.getUri().getQuery() == null) {
            return null;
        }
        for (String pair : session.getUri().getQuery().split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(key)) {
                return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }
}
