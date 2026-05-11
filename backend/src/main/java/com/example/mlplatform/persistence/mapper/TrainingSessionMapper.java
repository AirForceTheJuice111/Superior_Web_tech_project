package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.TrainingSessionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TrainingSessionMapper {

    void insert(TrainingSessionEntity entity);

    void update(TrainingSessionEntity entity);

    TrainingSessionEntity findBySessionId(@Param("sessionId") String sessionId);
}
