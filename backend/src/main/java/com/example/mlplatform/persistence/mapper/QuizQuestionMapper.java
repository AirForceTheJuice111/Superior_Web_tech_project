package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.QuizQuestionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface QuizQuestionMapper {

    @Select("""
            SELECT id, topic_id AS topicId, category, question,
                   options_json AS optionsJson, correct_index AS correctIndex,
                   explanation, display_order AS displayOrder, created_at AS createdAt
            FROM quiz_question
            ORDER BY topic_id, display_order, id
            """)
    List<QuizQuestionEntity> findAll();

    @Select("""
            SELECT id, topic_id AS topicId, category, question,
                   options_json AS optionsJson, correct_index AS correctIndex,
                   explanation, display_order AS displayOrder, created_at AS createdAt
            FROM quiz_question
            WHERE topic_id = #{topicId}
            ORDER BY display_order, id
            """)
    List<QuizQuestionEntity> findByTopic(String topicId);
}
