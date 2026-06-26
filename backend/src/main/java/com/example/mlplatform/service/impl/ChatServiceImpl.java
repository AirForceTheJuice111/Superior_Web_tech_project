package com.example.mlplatform.service.impl;

import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.ChatMessageMapper;
import com.example.mlplatform.persistence.mapper.UserMapper;
import com.example.mlplatform.service.ChatService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatServiceImpl implements ChatService {

    private final ChatMessageMapper chatMapper;
    private final UserMapper userMapper;

    public ChatServiceImpl(ChatMessageMapper chatMapper, UserMapper userMapper) {
        this.chatMapper = chatMapper;
        this.userMapper = userMapper;
    }

    @Override
    public List<ChatMessageEntity> recent(int limit) {
        return chatMapper.findRecent(limit);
    }

    @Override
    public ChatMessageEntity save(Long userId, String senderName, String content) {
        ChatMessageEntity message = new ChatMessageEntity();
        message.setSenderUserId(userId);
        message.setSenderName(senderName);
        message.setContent(content);
        message.setCreatedAt(LocalDateTime.now());
        chatMapper.insert(message);
        return message;
    }

    @Override
    public String displayNameOf(Long userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = userMapper.findById(userId);
        return user == null ? null : user.getDisplayName();
    }
}
