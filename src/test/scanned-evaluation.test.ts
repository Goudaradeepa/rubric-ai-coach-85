import { describe, expect, it } from "vitest";
import { mapWholePaperEvaluations, matchOcrAnswers, normalizeQuestionLabel } from "@/lib/scanned-evaluation";

describe("scanned answer handling", () => {
  it("normalizes common handwritten question labels", () => {
    expect(normalizeQuestionLabel("Q1 (a)")).toBe("1a");
    expect(normalizeQuestionLabel("1.2")).toBe("1b");
    expect(normalizeQuestionLabel("2b")).toBe("2b");
  });

  it("does not assign an unlabeled OCR answer to a different question by position", () => {
    const matched = matchOcrAnswers(
      [{ questionNumber: 1, subQuestion: "a)" }, { questionNumber: 1, subQuestion: "b)" }],
      [
        { questionLabel: "Q1(a)", extractedText: "Answer A" },
        { questionLabel: "unreadable", extractedText: "Uncertain text" },
      ],
    );
    expect(matched.map(answer => answer?.extractedText ?? "")).toEqual(["Answer A", ""]);
  });

  it("maps the single paper response by question ID and bounds criterion marks", () => {
    const question = {
      id: "q1",
      questionNumber: 1,
      marks: 5,
      rubricCriteria: [{ id: "c1", name: "Key idea", maxScore: 3 }, { id: "c2", name: "Explanation", maxScore: 2 }],
    };
    const mapped = mapWholePaperEvaluations(
      [question],
      [{ answerId: "answer-1", questionId: "q1", extractedText: "Handwritten response", ocrConfidence: 0.8 }],
      [{
        questionId: "q1",
        criterionScores: [
          { criterionId: "c1", criterionName: "Key idea", score: 5, maxScore: 3, feedback: "Good" },
          { criterionId: "c2", criterionName: "Explanation", score: 1, maxScore: 2, feedback: "Some detail" },
        ],
        confidenceScore: 0.9,
        confidenceLevel: "high",
      }],
    );
    expect(mapped["answer-1"]?.criterionScores.map(criterion => criterion.score)).toEqual([3, 1]);
    expect(mapped["answer-1"]?.totalScore).toBe(4);
    expect(mapped["answer-1"]?.confidenceLevel).toBe("high");
  });

  it("routes missing whole-paper answers to teacher review instead of silently accepting them", () => {
    const mapped = mapWholePaperEvaluations(
      [{ id: "q2", questionNumber: 2, marks: 4, rubricCriteria: [] }],
      [{ answerId: "answer-2", questionId: "q2", extractedText: "Answer", ocrConfidence: 0.4 }],
      [],
    );
    expect(mapped["answer-2"]?.totalScore).toBe(0);
    expect(mapped["answer-2"]?.requiresTeacherReview).toBe(true);
  });
});