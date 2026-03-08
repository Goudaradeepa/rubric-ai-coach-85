import React, { createContext, useContext, useState, useCallback } from "react";
import type { Exam, ExamSubmission, ExamEvaluation, ExamQuestion } from "@/types/evaluation";
import { mockExams, mockSubmissions, mockEvaluations } from "@/data/mockData";

interface EvaluationContextType {
  exams: Exam[];
  submissions: ExamSubmission[];
  evaluations: ExamEvaluation[];
  addExam: (exam: Omit<Exam, "id" | "createdAt" | "totalMarks">) => void;
  addSubmission: (sub: Omit<ExamSubmission, "id" | "submittedAt" | "evaluated">) => void;
  evaluateSubmission: (submissionId: string) => Promise<void>;
  getExamById: (id: string) => Exam | undefined;
  getEvaluationBySubmissionId: (id: string) => ExamEvaluation | undefined;
  getStudentEvaluations: (email: string) => ExamEvaluation[];
}

const EvaluationContext = createContext<EvaluationContextType | null>(null);

export const useEvaluation = () => {
  const ctx = useContext(EvaluationContext);
  if (!ctx) throw new Error("useEvaluation must be used within EvaluationProvider");
  return ctx;
};

export const EvaluationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(mockSubmissions);
  const [evaluations, setEvaluations] = useState<ExamEvaluation[]>(mockEvaluations);

  const addExam = useCallback((exam: Omit<Exam, "id" | "createdAt" | "totalMarks">) => {
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    setExams(prev => [...prev, { ...exam, id: crypto.randomUUID(), createdAt: new Date().toISOString(), totalMarks }]);
  }, []);

  const addSubmission = useCallback((sub: Omit<ExamSubmission, "id" | "submittedAt" | "evaluated">) => {
    setSubmissions(prev => [...prev, { ...sub, id: crypto.randomUUID(), submittedAt: new Date().toISOString(), evaluated: false }]);
  }, []);

  const evaluateSubmission = useCallback(async (submissionId: string) => {
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;
    const exam = exams.find(e => e.id === sub.examId);
    if (!exam) return;

    await new Promise(r => setTimeout(r, 2000));

    const questionEvaluations = exam.questions.map(q => {
      const studentAnswer = sub.answers.find(a => a.questionId === q.id);
      const quality = studentAnswer ? Math.min(1, Math.max(0.2, studentAnswer.answer.length / 200)) : 0.2;
      const criterionScores = q.rubricCriteria.map(c => {
        const ratio = Math.max(0.2, Math.min(1, quality + (Math.random() - 0.5) * 0.3));
        return {
          criterionId: c.id, criterionName: c.name,
          score: Math.round(c.maxScore * ratio * 10) / 10, maxScore: c.maxScore,
          feedback: ratio > 0.75 ? `Strong ${c.name.toLowerCase()}.` : `Needs improvement in ${c.name.toLowerCase()}.`,
        };
      });
      const score = criterionScores.reduce((s, c) => s + c.score, 0);
      const pct = Math.round((score / q.marks) * 100);
      return {
        questionId: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
        score: Math.round(score * 10) / 10, maxMarks: q.marks, percentage: pct, criterionScores,
        misconceptions: pct < 60 ? [{ topic: `Q${q.questionNumber}`, description: "Gaps in understanding", suggestion: "Review this topic" }] : [],
        feedback: pct >= 80 ? "Excellent." : pct >= 60 ? "Good, but room for improvement." : "Needs significant revision.",
        semanticSimilarity: Math.max(0.3, quality + (Math.random() - 0.5) * 0.2),
      };
    });

    const totalScore = questionEvaluations.reduce((s, e) => s + e.score, 0);
    const pct = Math.round((totalScore / exam.totalMarks) * 100);
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";

    const evaluation: ExamEvaluation = {
      id: crypto.randomUUID(), submissionId, examId: exam.id, examTitle: exam.title,
      studentName: sub.studentName, studentEmail: sub.studentEmail,
      totalScore: Math.round(totalScore * 10) / 10, totalPossible: exam.totalMarks, percentage: pct, grade,
      questionEvaluations, overallMisconceptions: questionEvaluations.flatMap(e => e.misconceptions),
      performanceSummary: pct >= 80 ? "Excellent performance." : pct >= 60 ? "Good performance with areas to improve." : "Below expectations.",
      strengths: questionEvaluations.filter(e => e.percentage >= 75).map(e => `Strong in Q${e.questionNumber}`),
      weaknesses: questionEvaluations.filter(e => e.percentage < 60).map(e => `Weak in Q${e.questionNumber}`),
      evaluatedAt: new Date().toISOString(),
    };

    setEvaluations(prev => [...prev, evaluation]);
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, evaluated: true } : s));
  }, [submissions, exams]);

  const getExamById = useCallback((id: string) => exams.find(e => e.id === id), [exams]);
  const getEvaluationBySubmissionId = useCallback((id: string) => evaluations.find(e => e.submissionId === id), [evaluations]);
  const getStudentEvaluations = useCallback((email: string) => evaluations.filter(e => e.studentEmail === email), [evaluations]);

  return (
    <EvaluationContext.Provider value={{ exams, submissions, evaluations, addExam, addSubmission, evaluateSubmission, getExamById, getEvaluationBySubmissionId, getStudentEvaluations }}>
      {children}
    </EvaluationContext.Provider>
  );
};
