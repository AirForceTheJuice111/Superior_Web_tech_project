package com.example.mlplatform.dto.request;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 前端发来的对话请求:历史消息 + 可选的当前实验上下文。
 */
public class AiChatRequest {

    private List<Message> messages = new ArrayList<>();
    private Map<String, Object> context;

    public List<Message> getMessages() {
        return messages;
    }

    public void setMessages(List<Message> messages) {
        this.messages = messages;
    }

    public Map<String, Object> getContext() {
        return context;
    }

    public void setContext(Map<String, Object> context) {
        this.context = context;
    }

    public static class Message {
        private String role;
        private String content;

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
