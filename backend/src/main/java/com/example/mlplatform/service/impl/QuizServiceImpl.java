package com.example.mlplatform.service.impl;

import com.example.mlplatform.dto.request.QuizSubmitRequest;
import com.example.mlplatform.dto.response.QuizOverviewItemResponse;
import com.example.mlplatform.dto.response.QuizQuestionResponse;
import com.example.mlplatform.dto.response.QuizSubmitResponse;
import com.example.mlplatform.dto.response.QuizSubmitResponse.QuizSubmitDetail;
import com.example.mlplatform.persistence.entity.QuizQuestionEntity;
import com.example.mlplatform.persistence.entity.QuizScoreEntity;
import com.example.mlplatform.persistence.mapper.QuizQuestionMapper;
import com.example.mlplatform.persistence.mapper.QuizScoreMapper;
import com.example.mlplatform.service.QuizService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class QuizServiceImpl implements QuizService {

    private final QuizQuestionMapper questionMapper;
    private final QuizScoreMapper scoreMapper;
    private final ObjectMapper objectMapper;

    public QuizServiceImpl(QuizQuestionMapper questionMapper, QuizScoreMapper scoreMapper, ObjectMapper objectMapper) {
        this.questionMapper = questionMapper;
        this.scoreMapper = scoreMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<QuizOverviewItemResponse> overview(Long userId) {
        // 按题库出现顺序聚合各专题题量
        Map<String, QuizOverviewItemResponse> byTopic = new LinkedHashMap<>();
        for (QuizQuestionEntity question : questionMapper.findAll()) {
            QuizOverviewItemResponse item = byTopic.computeIfAbsent(question.getTopicId(), key -> {
                QuizOverviewItemResponse created = new QuizOverviewItemResponse();
                created.setTopicId(question.getTopicId());
                created.setCategory(question.getCategory());
                created.setQuestionCount(0);
                created.setCompleted(false);
                return created;
            });
            item.setQuestionCount(item.getQuestionCount() + 1);
        }

        // 合并当前登录用户的最佳成绩
        if (userId != null) {
            for (QuizScoreEntity score : scoreMapper.findByUser(userId)) {
                QuizOverviewItemResponse item = byTopic.get(score.getTopicId());
                if (item != null) {
                    item.setBestScore(score.getBestScore());
                    item.setCorrectCount(score.getCorrectCount());
                    item.setTotalCount(score.getTotalCount());
                    item.setCompleted(true);
                }
            }
        }
        return new ArrayList<>(byTopic.values());
    }

    @Override
    public List<QuizQuestionResponse> listQuestions(String topicId) {
        return questionMapper.findByTopic(topicId).stream().map(this::toQuestionResponse).toList();
    }

    @Override
    public QuizSubmitResponse submit(Long userId, QuizSubmitRequest request) {
        List<QuizQuestionEntity> questions = questionMapper.findByTopic(request.getTopicId());
        if (questions.isEmpty()) {
            throw new IllegalArgumentException("该专题暂无练习题");
        }

        // 学生作答:questionId -> selectedIndex
        Map<Long, Integer> answers = new LinkedHashMap<>();
        if (request.getAnswers() != null) {
            for (QuizSubmitRequest.QuizAnswerItem item : request.getAnswers()) {
                if (item.getQuestionId() != null) {
                    answers.put(item.getQuestionId(), item.getSelectedIndex());
                }
            }
        }

        int correctCount = 0;
        List<QuizSubmitDetail> details = new ArrayList<>();
        for (QuizQuestionEntity question : questions) {
            Integer selected = answers.get(question.getId());
            boolean correct = selected != null && selected.equals(question.getCorrectIndex());
            if (correct) {
                correctCount++;
            }
            QuizSubmitDetail detail = new QuizSubmitDetail();
            detail.setQuestionId(question.getId());
            detail.setSelectedIndex(selected);
            detail.setCorrectIndex(question.getCorrectIndex());
            detail.setCorrect(correct);
            detail.setExplanation(question.getExplanation());
            details.add(detail);
        }

        int total = questions.size();
        int score = (int) Math.round(correctCount * 100.0 / total);

        QuizSubmitResponse response = new QuizSubmitResponse();
        response.setTopicId(request.getTopicId());
        response.setScore(score);
        response.setCorrectCount(correctCount);
        response.setTotal(total);
        response.setDetails(details);

        if (userId != null) {
            Integer bestScore = persistBestScore(userId, request.getTopicId(), score, correctCount, total);
            response.setBestScore(bestScore);
            response.setPersisted(true);
        } else {
            response.setPersisted(false);
        }
        return response;
    }

    /** 仅当本次成绩不低于历史最佳时落库,返回落库后的最佳分。 */
    private Integer persistBestScore(Long userId, String topicId, int score, int correctCount, int total) {
        QuizScoreEntity existing = scoreMapper.findByUserAndTopic(userId, topicId);
        if (existing == null || score >= existing.getBestScore()) {
            QuizScoreEntity entity = new QuizScoreEntity();
            entity.setUserId(userId);
            entity.setTopicId(topicId);
            entity.setBestScore(score);
            entity.setCorrectCount(correctCount);
            entity.setTotalCount(total);
            scoreMapper.upsert(entity);
            return score;
        }
        return existing.getBestScore();
    }

    private QuizQuestionResponse toQuestionResponse(QuizQuestionEntity entity) {
        QuizQuestionResponse response = new QuizQuestionResponse();
        response.setId(entity.getId());
        response.setTopicId(entity.getTopicId());
        response.setQuestion(entity.getQuestion());
        response.setOptions(readOptions(entity.getOptionsJson()));
        response.setDisplayOrder(entity.getDisplayOrder());
        return response;
    }

    private List<String> readOptions(String value) {
        if (value == null || value.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<List<String>>() {});
        } catch (Exception exception) {
            throw new IllegalStateException("练习题选项解析失败", exception);
        }
    }
}
