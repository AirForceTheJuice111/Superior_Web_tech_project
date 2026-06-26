package com.example.mlplatform.service.impl;

import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import com.example.mlplatform.persistence.entity.UserEntity;
import com.example.mlplatform.persistence.mapper.ChatMessageMapper;
import com.example.mlplatform.persistence.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatServiceImplTest {

    private ChatMessageMapper chatMapper;
    private UserMapper userMapper;
    private ChatServiceImpl service;

    @BeforeEach
    void setUp() {
        chatMapper = mock(ChatMessageMapper.class);
        userMapper = mock(UserMapper.class);
        service = new ChatServiceImpl(chatMapper, userMapper);
    }

    @Test
    void saveBuildsEntityAndInserts() {
        ChatMessageEntity saved = service.save(1L, "指导教师", "hello");

        assertEquals(1L, saved.getSenderUserId());
        assertEquals("指导教师", saved.getSenderName());
        assertEquals("hello", saved.getContent());
        assertNotNull(saved.getCreatedAt());
        verify(chatMapper).insert(any(ChatMessageEntity.class));
    }

    @Test
    void recentDelegatesToMapper() {
        ChatMessageEntity m = new ChatMessageEntity();
        when(chatMapper.findRecent(50)).thenReturn(List.of(m));

        List<ChatMessageEntity> result = service.recent(50);

        assertEquals(1, result.size());
        verify(chatMapper).findRecent(50);
    }

    @Test
    void displayNameOfReturnsNullForNullUserWithoutLookup() {
        assertNull(service.displayNameOf(null));
        verify(userMapper, never()).findById(any());
    }

    @Test
    void displayNameOfReturnsDisplayName() {
        UserEntity user = new UserEntity();
        user.setDisplayName("课程演示用户");
        when(userMapper.findById(1L)).thenReturn(user);

        assertEquals("课程演示用户", service.displayNameOf(1L));
    }
}
