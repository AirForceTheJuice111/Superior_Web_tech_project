package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.UserEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper {

    @Select("""
            SELECT id, username, password, display_name AS displayName, role, created_at AS createdAt
            FROM app_user
            WHERE username = #{username}
            """)
    UserEntity findByUsername(String username);

    @Select("""
            SELECT id, username, password, display_name AS displayName, role, created_at AS createdAt
            FROM app_user
            WHERE id = #{id}
            """)
    UserEntity findById(Long id);
}
