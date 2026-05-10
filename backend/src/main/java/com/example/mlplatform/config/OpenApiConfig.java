package com.example.mlplatform.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI mlPlatformOpenApi() {
        return new OpenAPI().info(new Info()
                .title("机器学习训练接口")
                .description("支持初始化模型、单步训练、连续训练、状态查询与 SSE 推送")
                .version("v1.0.0")
                .contact(new Contact().name("ML Visual Platform")));
    }
}
