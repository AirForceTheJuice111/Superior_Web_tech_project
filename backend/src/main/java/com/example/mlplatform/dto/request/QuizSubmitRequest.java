package com.example.mlplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class QuizSubmitRequest {

    @NotBlank(message = "topicId 不能为空")
    private String topicId;

    @NotNull(message = "answers 不能为空")
    private List<QuizAnswerItem> answers;

    public String getTopicId() {
        return topicId;
    }

    public void setTopicId(String topicId) {
        this.topicId = topicId;
    }

    public List<QuizAnswerItem> getAnswers() {
        return answers;
    }

    public void setAnswers(List<QuizAnswerItem> answers) {
        this.answers = answers;
    }

    public static class QuizAnswerItem {

        private Long questionId;
        private Integer selectedIndex;

        public Long getQuestionId() {
            return questionId;
        }

        public void setQuestionId(Long questionId) {
            this.questionId = questionId;
        }

        public Integer getSelectedIndex() {
            return selectedIndex;
        }

        public void setSelectedIndex(Integer selectedIndex) {
            this.selectedIndex = selectedIndex;
        }
    }
}
