package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.ExperimentEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ExperimentMapper {

    @Insert("""
            INSERT INTO experiment (
                user_id, name, learning_type, algorithm_code, dataset_code,
                config_json, latest_session_id, created_at, updated_at
            ) VALUES (
                #{userId}, #{name}, #{learningType}, #{algorithmCode}, #{datasetCode},
                #{configJson}, #{latestSessionId}, #{createdAt}, #{updatedAt}
            )
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(ExperimentEntity entity);

    @Select("""
            SELECT id, user_id AS userId, name, learning_type AS learningType,
                   algorithm_code AS algorithmCode, dataset_code AS datasetCode,
                   config_json AS configJson, latest_session_id AS latestSessionId,
                   created_at AS createdAt, updated_at AS updatedAt
            FROM experiment
            WHERE user_id = #{userId}
            ORDER BY created_at DESC
            """)
    List<ExperimentEntity> findByUserId(Long userId);
}
