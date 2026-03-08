import React, { createContext, useContext, useState, useCallback } from "react";
import type { Question, StudentSubmission, EvaluationResult } from "@/types/evaluation";
import { mockQuestions, mockSubmissions, mockResults } from "@/data/mockData";

interface EvaluationContextType {
  questions: Question[];
  submissions: StudentSubmission[];
  results: EvaluationResult[];
  addQuestion: (q: Omit<Question, "id" | "createdAt" | "totalPoints">) => void;
  addSubmission: (s: Omit<StudentSubmission, "id" | "submittedAt" | "evaluated">) => void;
  evaluateSubmission: (submissionId: string) => Promise<void>;
  getQuestionById: (id: string) => Question | undefined;
  getResultBySubmissionId: (id: string) => EvaluationResult | undefined;
}

const EvaluationContext = createContext<EvaluationContextType | null>(null);

export const useEvaluation = () => {
  const ctx = useContext(EvaluationContext);
  if (!ctx) throw new Error("useEvaluation must be used within EvaluationProvider");
  return ctx;
};

export const EvaluationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(mockSubmissions);
  const [results, setResults] = useState<EvaluationResult[]>(mockResults);

  const addQuestion = useCallback((q: Omit<Question, "id" | "createdAt" | "totalPoints">) => {
    const totalPoints = q.rubricCriteria.reduce((sum, c) => sum + c.maxScore * c.weight, 0);
    const newQ: Question = {
      ...q,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      totalPoints,
    };
    setQuestions(prev => [...prev, newQ]);
  }, []);

  const addSubmission = useCallback((s: Omit<StudentSubmission, "id" | "submittedAt" | "evaluated">) => {
    const newS: StudentSubmission = {
      ...s,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      evaluated: false,
    };
    setSubmissions(prev => [...prev, newS]);
  }, []);

  const evaluateSubmission = useCallback(async (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;
    const question = questions.find(q => q.id === submission.questionId);
    if (!question) return;

    // Simulated AI evaluation
    await new Promise(r => setTimeout(r, 1500));

    const criterionScores: EvaluationResult["criterionScores"] = question.rubricCriteria.map(c => {
      const ratio = 0.5 + Math.random() * 0.5;
      const score = Math.round(c.maxScore * ratio * 10) / 10;
      return {
        criterionId: c.id,
        criterionName: c.name,
        score,
        maxScore: c.maxScore,
        feedback: `Good understanding shown for ${c.name.toLowerCase()}. ${ratio > 0.75 ? "Excellent detail." : "Could benefit from more depth."}`,
      };
    });

    const overallScore = criterionScores.reduce((s, c) => s + c.score, 0);
    const totalPossible = criterionScores.reduce((s, c) => s + c.maxScore, 0);

    const result: EvaluationResult = {
      id: crypto.randomUUID(),
      submissionId,
      questionId: question.id,
      studentName: submission.studentName,
      overallScore: Math.round(overallScore * 10) / 10,
      totalPossible,
      percentage: Math.round((overallScore / totalPossible) * 100),
      criterionScores,
      misconceptions: [
        { topic: "Key Concept", description: "Minor confusion about core terminology", suggestion: "Review chapter 3 definitions" },
      ],
      overallFeedback: "The answer demonstrates a solid understanding with room for improvement in depth and precision.",
      improvementSuggestions: [
        "Provide more specific examples",
        "Connect concepts to real-world applications",
        "Use technical vocabulary more precisely",
      ],
      semanticSimilarity: 0.6 + Math.random() * 0.35,
      evaluatedAt: new Date().toISOString(),
    };

    setResults(prev => [...prev, result]);
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, evaluated: true } : s));
  }, [submissions, questions]);

  const getQuestionById = useCallback((id: string) => questions.find(q => q.id === id), [questions]);
  const getResultBySubmissionId = useCallback((id: string) => results.find(r => r.submissionId === id), [results]);

  return (
    <EvaluationContext.Provider value={{ questions, submissions, results, addQuestion, addSubmission, evaluateSubmission, getQuestionById, getResultBySubmissionId }}>
      {children}
    </EvaluationContext.Provider>
  );
};
