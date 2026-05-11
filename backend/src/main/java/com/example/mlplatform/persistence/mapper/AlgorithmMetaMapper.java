package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.AlgorithmMetaEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface AlgorithmMetaMapper {

    @Select("""
            SELECT id, code, name, category, learning_type AS learningType, description,
                   params_schema_json AS paramsSchemaJson, created_at AS createdAt
            FROM algorithm_meta
            ORDER BY id
            """)
    List<AlgorithmMetaEntity> findAll();

    @Select("""
            SELECT id, code, name, category, learning_type AS learningType, description,
                   params_schema_json AS paramsSchemaJson, created_at AS createdAt
            FROM algorithm_meta
            WHERE code = #{code}
            """)
    AlgorithmMetaEntity findByCode(String code);
}
