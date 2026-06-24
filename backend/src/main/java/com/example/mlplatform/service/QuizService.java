package com.example.mlplatform.service;

import com.example.mlplatform.dto.request.QuizSubmitRequest;
import com.example.mlplatform.dto.response.QuizOverviewItemResponse;
import com.example.mlplatform.dto.response.QuizQuestionResponse;
import com.example.mlplatform.dto.response.QuizSubmitResponse;

import java.util.List;

public interface QuizService {

    /** 各专题题量 + 该登录用户最佳成绩;userId 为 null 时只返回题量。 */
    List<QuizOverviewItemResponse> overview(Long userId);

    /** 某专题全部题目(不含答案)。 */
    List<QuizQuestionResponse> listQuestions(String topicId);

    /** 服务端判分;userId 非空时按最佳成绩落库。 */
    QuizSubmitResponse submit(Long userId, QuizSubmitRequest request);
}
