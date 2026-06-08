package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.ExperimentCaseEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ExperimentCaseMapper {

    @Select("""
            SELECT id, code, title, description, learning_type AS learningType,
                   algorithm_code AS algorithmCode, dataset_code AS datasetCode,
                   config_json AS configJson, guide_text AS guideText,
                   expected_result AS expectedResult, display_order AS displayOrder,
                   created_at AS createdAt
            FROM experiment_case
            ORDER BY display_order, id
            """)
    List<ExperimentCaseEntity> findAll();
}
