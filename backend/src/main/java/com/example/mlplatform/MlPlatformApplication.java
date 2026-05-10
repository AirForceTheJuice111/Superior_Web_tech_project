package com.example.mlplatform;

import com.example.mlplatform.config.AppCorsProperties;
import com.example.mlplatform.config.PythonServiceProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@EnableConfigurationProperties({
        AppCorsProperties.class,
        PythonServiceProperties.class
})
@SpringBootApplication
public class MlPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(MlPlatformApplication.class, args);
    }
}
