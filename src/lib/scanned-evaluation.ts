export interface PaperCriterion {
  id: string;
  name: string;
  maxScore: number;
}

export interface PaperQuestion {
  id: string;
  questionNumber: number;
  subQuestion?: string;
  marks: number;
  rubricCriteria: PaperCriterion[];
}

export interface OcrAnswer {
  questionLabel?: string | number;
  questionNumber?: string | number;
  extractedText?: string;
  confidence?: number;
}

export interface AnswerRow {
  answerId: string;
  questionId: string;
  extractedText: string;
  ocrConfidence: number;
}

export interface AiCriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface AiQuestionResult {
  questionId: string;
  criterionScores: AiCriterionScore[];
  totalScore?: number;
  maxMarks?: number;
  feedback?: string;
  semanticSimilarity?: number;
  rubricCoverage?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  requiresTeacherReview?: boolean;
  detectedConcepts?: string[];
  missingConcepts?: string[];
}

export interface AnswerEvaluation {
  evaluationId: string;
  criterionScores: AiCriterionScore[];
  totalScore: number;
  maxMarks: number;
  feedback: string;
  semanticSimilarity: number;
  rubricCoverage: number;
  confidenceScore: number;
  confidenceLevel: "high" | "medium" | "low";
  requiresTeacherReview: boolean;
  detectedConcepts: string[];
  missingConcepts: string[];
}

export function normalizeQuestionLabel(value: unknown): string {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim().toLowerCase().replace(/^q(?:uestion)?\s*/, "");
  const decimal = raw.match(/^(\d+)\.(\d+)$/);
  if (decimal) {
    const subNumber = Number(decimal[2]);
    if (subNumber > 0 && subNumber <= 26) {
      return `${decimal[1]}${String.fromCharCode(96 + subNumber)}`;
    }
  }
  const label = raw.replace(/[()[\]\s]/g, "").match(/^(\d+)[.\-]?([a-z])?\.?$/);
  return label ? `${label[1]}${label[2] ?? ""}` : "";
}

export function matchOcrAnswers<T extends OcrAnswer>(
  questions: Pick<PaperQuestion, "questionNumber" | "subQuestion">[],
  answers: T[],
): Array<T | undefined> {
  const unused = new Set(answers.map((_, index) => index));
  return questions.map(question => {
    const subQuestion = question.subQuestion?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    const expected = normalizeQuestionLabel(`${question.questionNumber}${subQuestion}`);
    const matchIndex = answers.findIndex((answer, index) => {
      if (!unused.has(index)) return false;
      return normalizeQuestionLabel(answer.questionLabel ?? answer.questionNumber) === expected;
    });
    if (matchIndex < 0) return undefined;
    unused.delete(matchIndex);
    return answers[matchIndex];
  });
}

function boundedScore(value: unknown, maximum: number): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.min(maximum, Math.max(0, score)) * 10) / 10;
}

function boundedRatio(value: unknown, fallback = 0): number {
  const ratio = Number(value);
  return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : fallback;
}

export function mapWholePaperEvaluations(
  questions: PaperQuestion[],
  rows: AnswerRow[],
  results: AiQuestionResult[],
): Record<string, AnswerEvaluation> {
  const resultsById = new Map(results.map(result => [result.questionId, result]));
  const questionsById = new Map(questions.map(question => [question.id, question]));

  return Object.fromEntries(rows.map(row => {
    const question = questionsById.get(row.questionId);
    const result = resultsById.get(row.questionId);
    const criteria = question?.rubricCriteria ?? [];
    const returnedCriteria = result?.criterionScores ?? [];
    const criterionScores = criteria.map(criterion => {
      const returned = returnedCriteria.find(score => score.criterionId === criterion.id);
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        score: boundedScore(returned?.score, criterion.maxScore),
        maxScore: criterion.maxScore,
        feedback: returned?.feedback || (result ? "No feedback returned for this criterion." : "This question was not returned by the AI evaluation."),
      };
    });
    const maxMarks = question?.marks ?? row.ocrConfidence * 0;
    const totalScore = boundedScore(
      criterionScores.length ? criterionScores.reduce((total, criterion) => total + criterion.score, 0) : result?.totalScore,
      maxMarks,
    );
    const confidenceScore = boundedRatio(result?.confidenceScore, result ? 0.35 : 0);
    const confidenceLevel = !result || result.requiresTeacherReview || confidenceScore < 0.5
      ? "low"
      : confidenceScore < 0.75
        ? "medium"
        : "high";

    return [row.answerId, {
      evaluationId: crypto.randomUUID(),
      criterionScores,
      totalScore,
      maxMarks,
      feedback: result?.feedback || (result ? "Evaluation completed." : "No evaluation was returned for this question; please review it."),
      semanticSimilarity: boundedRatio(result?.semanticSimilarity),
      rubricCoverage: boundedRatio(result?.rubricCoverage),
      confidenceScore,
      confidenceLevel,
      requiresTeacherReview: !result || Boolean(result.requiresTeacherReview) || confidenceLevel === "low",
      detectedConcepts: result?.detectedConcepts ?? [],
      missingConcepts: result?.missingConcepts ?? [],
    } satisfies AnswerEvaluation];
  }));
}