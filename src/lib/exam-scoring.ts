import type { ExamQuestion } from "@/types/evaluation";

export function calculateEffectiveTotals(
  questions: Pick<ExamQuestion, "id" | "marks" | "orGroup" | "questionNumber">[],
  scoreFor: (questionId: string) => number,
) {
  const groups = new Map<string, Map<number, { score: number; max: number }>>();
  let score = 0;
  let max = 0;

  for (const question of questions) {
    const questionScore = scoreFor(question.id);
    const questionMarks = Number(question.marks) || 0;
    if (question.orGroup) {
      const byQuestion = groups.get(question.orGroup) ?? new Map<number, { score: number; max: number }>();
      const number = Number(question.questionNumber) || 0;
      const current = byQuestion.get(number) ?? { score: 0, max: 0 };
      current.score += questionScore;
      current.max += questionMarks;
      byQuestion.set(number, current);
      groups.set(question.orGroup, byQuestion);
    } else {
      score += questionScore;
      max += questionMarks;
    }
  }

  for (const byQuestion of groups.values()) {
    const alternatives = [...byQuestion.values()];
    const best = alternatives.reduce((winner, current) =>
      current.score > winner.score || (current.score === winner.score && current.max > winner.max) ? current : winner,
      { score: 0, max: 0 },
    );
    score += best.score;
    max += Math.max(...alternatives.map(alternative => alternative.max), 0);
  }

  return { score: Math.round(score * 10) / 10, max };
}