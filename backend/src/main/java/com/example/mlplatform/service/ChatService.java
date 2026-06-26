package com.example.mlplatform.service;

import com.example.mlplatform.persistence.entity.ChatMessageEntity;

import java.util.List;

public interface ChatService {

    /** 最近 limit 条消息(按 id 倒序返回,调用方按需反转为正序)。 */
    List<ChatMessageEntity> recent(int limit);

    /** 落库一条消息并回填 id。 */
    ChatMessageEntity save(Long userId, String senderName, String content);

    /** 由 userId 取显示名;userId 为空或用户不存在返回 null。 */
    String displayNameOf(Long userId);
}
