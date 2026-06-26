package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.ChatMessageEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ChatMessageMapper {

    @Insert("""
            INSERT INTO chat_message (sender_user_id, sender_name, content, created_at)
            VALUES (#{senderUserId}, #{senderName}, #{content}, #{createdAt})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(ChatMessageEntity message);

    @Select("""
            SELECT id, sender_user_id AS senderUserId, sender_name AS senderName,
                   content, created_at AS createdAt
            FROM chat_message
            ORDER BY id DESC
            LIMIT #{limit}
            """)
    List<ChatMessageEntity> findRecent(int limit);
}
