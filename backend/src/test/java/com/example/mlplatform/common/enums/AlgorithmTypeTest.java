package com.example.mlplatform.common.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AlgorithmTypeTest {

    @Test
    void fromCodeAndToCodeRoundTrip() {
        for (AlgorithmType type : AlgorithmType.values()) {
            String code = type.toCode();
            assertEquals(type, AlgorithmType.fromCode(code), "round trip failed for " + type);
        }
    }

    @Test
    void qLearningIsSupported() {
        assertEquals(AlgorithmType.Q_LEARNING, AlgorithmType.fromCode("q_learning"));
        assertEquals("q_learning", AlgorithmType.Q_LEARNING.toCode());
    }

    @Test
    void fromCodeIsCaseInsensitiveAndTrimmed() {
        assertEquals(AlgorithmType.SVM, AlgorithmType.fromCode("  SVM  "));
    }

    @Test
    void fromCodeRejectsUnknown() {
        assertThrows(IllegalArgumentException.class, () -> AlgorithmType.fromCode("unknown_algo"));
    }

    @Test
    void fromCodeRejectsBlank() {
        assertThrows(IllegalArgumentException.class, () -> AlgorithmType.fromCode("  "));
    }
}
