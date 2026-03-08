import React, { createContext, useContext, useState, useCallback } from "react";
import type { Exam, ExamSubmission, ExamEvaluation, ExamQuestion } from "@/types/evaluation";
import { mockExams, mockSubmissions, mockEvaluations } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    setSubmissions(prev => [...prev, {
      ...sub,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      evaluated: false,
      submissionType: sub.submissionType || "typed",
    }]);
  }, []);

  const evaluateSubmission = useCallback(async (submissionId: string) => {
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;
    const exam = exams.find(e => e.id === sub.examId);
    if (!exam) return;

    try {
      const { data, error } = await supabase.functions.invoke("evaluate-exam", {
        body: {
          questions: exam.questions,
          answers: sub.answers,
          examTitle: exam.title,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiResult = data;

      // Build full evaluation from AI response
      const questionEvaluations = exam.questions.map(q => {
        const aiQEval = aiResult.questionEvaluations.find(
          (ae: any) => ae.questionId === q.id || ae.questionNumber === q.questionNumber
        );
        if (!aiQEval) {
          // Fallback if AI didn't return this question
          return {
            questionId: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
            score: 0, maxMarks: q.marks, percentage: 0,
            criterionScores: q.rubricCriteria.map(c => ({ criterionId: c.id, criterionName: c.name, score: 0, maxScore: c.maxScore, feedback: "Not evaluated" })),
            misconceptions: [], feedback: "Could not evaluate this question.", semanticSimilarity: 0,
          };
        }
        const score = aiQEval.criterionScores.reduce((s: number, c: any) => s + c.score, 0);
        const pct = Math.round((score / q.marks) * 100);
        return {
          questionId: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
          score: Math.round(score * 10) / 10, maxMarks: q.marks, percentage: pct,
          criterionScores: aiQEval.criterionScores,
          misconceptions: aiQEval.misconceptions || [],
          feedback: aiQEval.feedback,
          semanticSimilarity: aiQEval.semanticSimilarity,
        };
      });

      const totalScore = questionEvaluations.reduce((s, e) => s + e.score, 0);
      const pct = Math.round((totalScore / exam.totalMarks) * 100);
      const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";

      const evaluation: ExamEvaluation = {
        id: crypto.randomUUID(), submissionId, examId: exam.id, examTitle: exam.title,
        studentName: sub.studentName, studentEmail: sub.studentEmail,
        totalScore: Math.round(totalScore * 10) / 10, totalPossible: exam.totalMarks, percentage: pct, grade,
        questionEvaluations,
        overallMisconceptions: questionEvaluations.flatMap(e => e.misconceptions),
        performanceSummary: aiResult.performanceSummary,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        evaluatedAt: new Date().toISOString(),
      };

      setEvaluations(prev => [...prev, evaluation]);
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, evaluated: true } : s));
      toast.success("AI evaluation complete!");
    } catch (err: any) {
      console.error("Evaluation failed:", err);
      toast.error(err.message || "AI evaluation failed. Please try again.");
      throw err;
    }
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
