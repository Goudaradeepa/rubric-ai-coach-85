import { describe, expect, it } from "vitest";
import { calculateEffectiveTotals } from "@/lib/exam-scoring";

describe("calculateEffectiveTotals", () => {
  it("counts the best complete question in each OR group, while summing its sub-questions", () => {
    const questions = [
      { id: "1a", questionNumber: 1, orGroup: "A-OR-1", marks: 5 },
      { id: "1b", questionNumber: 1, orGroup: "A-OR-1", marks: 5 },
      { id: "2a", questionNumber: 2, orGroup: "A-OR-1", marks: 5 },
      { id: "2b", questionNumber: 2, orGroup: "A-OR-1", marks: 5 },
      { id: "3a", questionNumber: 3, orGroup: "B-OR-1", marks: 5 },
      { id: "3b", questionNumber: 3, orGroup: "B-OR-1", marks: 5 },
      { id: "4a", questionNumber: 4, orGroup: "B-OR-1", marks: 5 },
      { id: "4b", questionNumber: 4, orGroup: "B-OR-1", marks: 5 },
      { id: "5", questionNumber: 5, marks: 5 },
    ];
    const scores: Record<string, number> = {
      "1a": 3, "1b": 3, "2a": 4, "2b": 4,
      "3a": 4, "3b": 5, "4a": 3, "4b": 4, "5": 4,
    };

    expect(calculateEffectiveTotals(questions, id => scores[id] ?? 0)).toEqual({ score: 21, max: 25 });
  });

  it("uses the printed paper maximum when OCR provides it", () => {
    const questions = [
      { id: "1", questionNumber: 1, marks: 10 },
      { id: "2", questionNumber: 2, marks: 5 },
    ];
    expect(calculateEffectiveTotals(questions, () => 0, 25)).toEqual({ score: 0, max: 25 });
  });

  it("does not keep a stale 15-mark header when correctly grouped questions total 25", () => {
    const questions = [
      { id: "1a", questionNumber: 1, orGroup: "first", marks: 5 },
      { id: "1b", questionNumber: 1, orGroup: "first", marks: 5 },
      { id: "2a", questionNumber: 2, orGroup: "first", marks: 5 },
      { id: "2b", questionNumber: 2, orGroup: "first", marks: 5 },
      { id: "3a", questionNumber: 3, orGroup: "second", marks: 5 },
      { id: "3b", questionNumber: 3, orGroup: "second", marks: 5 },
      { id: "4a", questionNumber: 4, orGroup: "second", marks: 5 },
      { id: "4b", questionNumber: 4, orGroup: "second", marks: 5 },
      { id: "5", questionNumber: 5, marks: 5 },
    ];
    expect(calculateEffectiveTotals(questions, () => 0, 15)).toEqual({ score: 0, max: 25 });
  });
});