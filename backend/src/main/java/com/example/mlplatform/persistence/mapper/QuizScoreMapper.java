package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.QuizScoreEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface QuizScoreMapper {

    @Select("""
            SELECT id, user_id AS userId, topic_id AS topicId, best_score AS bestScore,
                   correct_count AS correctCount, total_count AS totalCount, updated_at AS updatedAt
            FROM quiz_score
            WHERE user_id = #{userId}
            """)
    List<QuizScoreEntity> findByUser(Long userId);

    @Select("""
            SELECT id, user_id AS userId, topic_id AS topicId, best_score AS bestScore,
                   correct_count AS correctCount, total_count AS totalCount, updated_at AS updatedAt
            FROM quiz_score
            WHERE user_id = #{userId} AND topic_id = #{topicId}
            """)
    QuizScoreEntity findByUserAndTopic(Long userId, String topicId);

    /** 按 (user_id, topic_id) 唯一键 upsert,只在成绩更高时由 Service 调用以保留最佳成绩。 */
    @Insert("""
            MERGE INTO quiz_score (user_id, topic_id, best_score, correct_count, total_count, updated_at)
            KEY (user_id, topic_id)
            VALUES (#{userId}, #{topicId}, #{bestScore}, #{correctCount}, #{totalCount}, CURRENT_TIMESTAMP())
            """)
    void upsert(QuizScoreEntity score);
}
