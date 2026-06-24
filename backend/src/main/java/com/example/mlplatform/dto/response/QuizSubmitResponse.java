package com.example.mlplatform.dto.response;

import java.util.List;

/** 判分结果:总分 + 每题对错与解析;persisted 表示是否已为登录用户落库。 */
public class QuizSubmitResponse {

    private String topicId;
    private int score;
    private int correctCount;
    private int total;
    private Integer bestScore;
    private boolean persisted;
    private List<QuizSubmitDetail> details;

    public String getTopicId() {
        return topicId;
    }

    public void setTopicId(String topicId) {
        this.topicId = topicId;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    public void setCorrectCount(int correctCount) {
        this.correctCount = correctCount;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public Integer getBestScore() {
        return bestScore;
    }

    public void setBestScore(Integer bestScore) {
        this.bestScore = bestScore;
    }

    public boolean isPersisted() {
        return persisted;
    }

    public void setPersisted(boolean persisted) {
        this.persisted = persisted;
    }

    public List<QuizSubmitDetail> getDetails() {
        return details;
    }

    public void setDetails(List<QuizSubmitDetail> details) {
        this.details = details;
    }

    public static class QuizSubmitDetail {

        private Long questionId;
        private Integer selectedIndex;
        private int correctIndex;
        private boolean correct;
        private String explanation;

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

        public int getCorrectIndex() {
            return correctIndex;
        }

        public void setCorrectIndex(int correctIndex) {
            this.correctIndex = correctIndex;
        }

        public boolean isCorrect() {
            return correct;
        }

        public void setCorrect(boolean correct) {
            this.correct = correct;
        }

        public String getExplanation() {
            return explanation;
        }

        public void setExplanation(String explanation) {
            this.explanation = explanation;
        }
    }
}
