package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.UploadedDatasetEntity;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UploadedDatasetMapper {

    @Insert("""
            INSERT INTO uploaded_dataset (
                code, name, description, owner_user_id, task_type, source_type,
                feature_columns_json, numeric_columns_json, label_column,
                headers_json, rows_json, row_count, column_count, created_at
            ) VALUES (
                #{code}, #{name}, #{description}, #{ownerUserId}, #{taskType}, #{sourceType},
                #{featureColumnsJson}, #{numericColumnsJson}, #{labelColumn},
                #{headersJson}, #{rowsJson}, #{rowCount}, #{columnCount}, #{createdAt}
            )
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(UploadedDatasetEntity entity);

    @Select("""
            SELECT id, code, name, description, owner_user_id AS ownerUserId,
                   task_type AS taskType, source_type AS sourceType,
                   feature_columns_json AS featureColumnsJson, numeric_columns_json AS numericColumnsJson,
                   label_column AS labelColumn, headers_json AS headersJson, rows_json AS rowsJson,
                   row_count AS rowCount, column_count AS columnCount, created_at AS createdAt
            FROM uploaded_dataset
            ORDER BY id
            """)
    List<UploadedDatasetEntity> findAll();

    @Select("""
            SELECT id, code, name, description, owner_user_id AS ownerUserId,
                   task_type AS taskType, source_type AS sourceType,
                   feature_columns_json AS featureColumnsJson, numeric_columns_json AS numericColumnsJson,
                   label_column AS labelColumn,
                   row_count AS rowCount, column_count AS columnCount, created_at AS createdAt
            FROM uploaded_dataset
            WHERE owner_user_id = #{ownerUserId}
            ORDER BY created_at DESC
            """)
    List<UploadedDatasetEntity> findByOwner(Long ownerUserId);

    @Select("""
            SELECT id, code, name, description, owner_user_id AS ownerUserId,
                   task_type AS taskType, source_type AS sourceType,
                   feature_columns_json AS featureColumnsJson, numeric_columns_json AS numericColumnsJson,
                   label_column AS labelColumn, headers_json AS headersJson, rows_json AS rowsJson,
                   row_count AS rowCount, column_count AS columnCount, created_at AS createdAt
            FROM uploaded_dataset
            WHERE code = #{code}
            """)
    UploadedDatasetEntity findByCode(String code);

    @Delete("DELETE FROM uploaded_dataset WHERE code = #{code}")
    int deleteByCode(String code);
}
