export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  modelAnswer: string;
  marks: number;
  rubricCriteria: RubricCriterion[];
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  totalMarks: number;
  questions: ExamQuestion[];
  createdAt: string;
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
}

export interface OCRExtractedAnswer {
  questionNumber: number;
  extractedText: string;
  confidence: number;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentName: string;
  studentEmail: string;
  answers: StudentAnswer[];
  submittedAt: string;
  evaluated: boolean;
  // Scanned upload fields
  answerSheetUrl?: string;
  answerSheetFileName?: string;
  ocrFullText?: string;
  ocrExtractedAnswers?: OCRExtractedAnswer[];
  submissionType: "typed" | "scanned";
}

export interface QuestionCriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface Misconception {
  topic: string;
  description: string;
  suggestion: string;
}

export interface QuestionEvaluation {
  questionId: string;
  questionNumber: number;
  questionText: string;
  score: number;
  maxMarks: number;
  percentage: number;
  criterionScores: QuestionCriterionScore[];
  misconceptions: Misconception[];
  feedback: string;
  semanticSimilarity: number;
  detectedConcepts?: string[];
  missingConcepts?: string[];
}

export interface ExamEvaluation {
  id: string;
  submissionId: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentEmail: string;
  totalScore: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  questionEvaluations: QuestionEvaluation[];
  performanceSummary: string;
  strengths: string[];
  weaknesses: string[];
  overallMisconceptions: Misconception[];
  evaluatedAt: string;
}
