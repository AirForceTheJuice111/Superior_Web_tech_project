package com.example.mlplatform.security;

/**
 * 已解析的认证主体，挂在请求属性上供 Controller 读取当前登录身份。
 *
 * @param userId   用户主键
 * @param username 登录名
 * @param role     角色（student / teacher）
 */
public record AuthPrincipal(Long userId, String username, String role) {

    /** 大小写不敏感地判断当前主体是否拥有指定角色。 */
    public boolean hasRole(String expected) {
        return role != null && role.equalsIgnoreCase(expected);
    }
}
