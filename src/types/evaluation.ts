export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
}

export interface Question {
  id: string;
  title: string;
  questionText: string;
  modelAnswer: string;
  rubricCriteria: RubricCriterion[];
  totalPoints: number;
  createdAt: string;
}

export interface StudentSubmission {
  id: string;
  questionId: string;
  studentName: string;
  studentEmail: string;
  answer: string;
  submittedAt: string;
  evaluated: boolean;
}

export interface CriterionScore {
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

export interface EvaluationResult {
  id: string;
  submissionId: string;
  questionId: string;
  studentName: string;
  overallScore: number;
  totalPossible: number;
  percentage: number;
  criterionScores: CriterionScore[];
  misconceptions: Misconception[];
  overallFeedback: string;
  improvementSuggestions: string[];
  semanticSimilarity: number;
  evaluatedAt: string;
}
