package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.DatasetDataEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DatasetDataMapper {

    @Insert("""
            INSERT INTO dataset_data (
                dataset_id, columns_json, rows_json, feature_columns_json, label_column, created_at
            ) VALUES (
                #{datasetId}, #{columnsJson}, #{rowsJson}, #{featureColumnsJson}, #{labelColumn}, #{createdAt}
            )
            """)
    void insert(DatasetDataEntity entity);

    @Select("""
            SELECT dataset_id AS datasetId, columns_json AS columnsJson, rows_json AS rowsJson,
                   feature_columns_json AS featureColumnsJson, label_column AS labelColumn,
                   created_at AS createdAt
            FROM dataset_data
            WHERE dataset_id = #{datasetId}
            """)
    DatasetDataEntity findByDatasetId(Long datasetId);
}
