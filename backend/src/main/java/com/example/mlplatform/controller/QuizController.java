package com.example.mlplatform.controller;

import com.example.mlplatform.common.response.ApiResponse;
import com.example.mlplatform.dto.request.QuizSubmitRequest;
import com.example.mlplatform.dto.response.QuizOverviewItemResponse;
import com.example.mlplatform.dto.response.QuizQuestionResponse;
import com.example.mlplatform.dto.response.QuizSubmitResponse;
import com.example.mlplatform.service.AuthService;
import com.example.mlplatform.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final QuizService quizService;
    private final AuthService authService;

    public QuizController(QuizService quizService, AuthService authService) {
        this.quizService = quizService;
        this.authService = authService;
    }

    @GetMapping("/overview")
    public ApiResponse<List<QuizOverviewItemResponse>> overview(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        // 登录则带出个人最佳成绩,未登录只返回题量
        return ApiResponse.success("获取练习概览成功", quizService.overview(resolveUserId(authorization)));
    }

    @GetMapping("/questions")
    public ApiResponse<List<QuizQuestionResponse>> questions(@RequestParam("topicId") String topicId) {
        return ApiResponse.success("获取练习题成功", quizService.listQuestions(topicId));
    }

    @PostMapping("/submit")
    public ApiResponse<QuizSubmitResponse> submit(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody QuizSubmitRequest request) {
        // 服务端判分;登录用户的成绩按最佳值落库
        return ApiResponse.success("提交成功", quizService.submit(resolveUserId(authorization), request));
    }

    /** 解析可信 userId;缺失或无效返回 null(练习允许匿名作答,只是不落库)。 */
    private Long resolveUserId(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        String token = authorization.startsWith("Bearer ")
                ? authorization.substring(7).trim()
                : authorization.trim();
        return authService.resolveUserId(token);
    }
}
