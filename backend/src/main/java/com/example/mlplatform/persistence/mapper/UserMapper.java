package com.example.mlplatform.persistence.mapper;

import com.example.mlplatform.persistence.entity.UserEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper {

    @Select("""
            SELECT id, username, password, email, display_name AS displayName, role, created_at AS createdAt
            FROM app_user
            WHERE username = #{username}
            """)
    UserEntity findByUsername(String username);

    @Select("""
            SELECT id, username, password, email, display_name AS displayName, role, created_at AS createdAt
            FROM app_user
            WHERE id = #{id}
            """)
    UserEntity findById(Long id);

    @Select("SELECT COUNT(1) FROM app_user WHERE username = #{username}")
    int countByUsername(String username);

    @Insert("""
            INSERT INTO app_user (username, password, email, display_name, role, created_at)
            VALUES (#{username}, #{password}, #{email}, #{displayName}, #{role}, #{createdAt})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(UserEntity user);
}
