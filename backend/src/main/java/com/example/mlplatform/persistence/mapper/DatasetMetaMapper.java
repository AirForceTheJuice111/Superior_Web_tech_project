package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.DatasetMetaEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface DatasetMetaMapper {

    @Select("""
            SELECT id, code, name, description, task_type AS taskType, source_type AS sourceType,
                   feature_count AS featureCount, sample_count AS sampleCount,
                   label_column AS labelColumn, created_at AS createdAt
            FROM dataset_meta
            ORDER BY id
            """)
    List<DatasetMetaEntity> findAll();

    @Select("""
            SELECT id, code, name, description, task_type AS taskType, source_type AS sourceType,
                   feature_count AS featureCount, sample_count AS sampleCount,
                   label_column AS labelColumn, created_at AS createdAt
            FROM dataset_meta
            WHERE code = #{code}
            """)
    DatasetMetaEntity findByCode(String code);
}
