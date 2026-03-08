import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Loader2, X, CheckCircle, Save, ChevronDown, ChevronUp,
  AlertTriangle, Files, Play, Check, Edit3,
} from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExamEvaluation, QuestionEvaluation } from "@/types/evaluation";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

interface SheetEntry {
  id: string;
  file: File;
  preview: string | null;
  status: "queued" | "uploading" | "ocr" | "evaluating" | "reviewed" | "finalized" | "error";
  error?: string;
  // OCR results
  detectedName: string;
  detectedRoll: string;
  ocrFullText: string;
  ocrAnswers: { questionNumber: number; extractedText: string; confidence: number }[];
  uploadedUrl: string | null;
  // AI eval
  evaluation: ExamEvaluation | null;
  editedScores: Record<string, Record<string, number>>;
}

const TeacherBulkEvaluation: React.FC = () => {
  const { exams, addTeacherEvaluation } = useEvaluation();
  const [selectedExam, setSelectedExam] = useState("");
  const [sheets, setSheets] = useState<SheetEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [allFinalized, setAllFinalized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exam = exams.find(e => e.id === selectedExam);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) { toast.error(`${f.name}: unsupported format`); return false; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name}: exceeds 20MB`); return false; }
      return true;
    });

    const newEntries: SheetEntry[] = valid.map(file => {
      let preview: string | null = null;
      const entry: SheetEntry = {
        id: crypto.randomUUID(),
        file,
        preview: null,
        status: "queued",
        detectedName: "",
        detectedRoll: "",
        ocrFullText: "",
        ocrAnswers: [],
        uploadedUrl: null,
        evaluation: null,
        editedScores: {},
      };

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSheets(prev => prev.map(s => s.id === entry.id ? { ...s, preview: ev.target?.result as string } : s));
        };
        reader.readAsDataURL(file);
      }

      return entry;
    });

    setSheets(prev => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSheet = (id: string) => {
    setSheets(prev => prev.filter(s => s.id !== id));
  };

  const updateSheet = (id: string, updates: Partial<SheetEntry>) => {
    setSheets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const processAllSheets = async () => {
    if (!exam || sheets.length === 0) return;
    setIsProcessing(true);

    for (const sheet of sheets) {
      if (sheet.status !== "queued") continue;

      try {
        // Step 1: Upload
        updateSheet(sheet.id, { status: "uploading" });
        const fileName = `bulk/${Date.now()}-${sheet.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("answer-sheets").upload(fileName, sheet.file, { contentType: sheet.file.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("answer-sheets").getPublicUrl(uploadData.path);
        const uploadedUrl = urlData.publicUrl;

        // Step 2: OCR
        updateSheet(sheet.id, { status: "ocr", uploadedUrl });
        const { data: ocrData, error: ocrError } = await supabase.functions.invoke("ocr-extract", {
          body: { fileUrl: uploadedUrl, mimeType: sheet.file.type, questionCount: exam.questions.length },
        });
        if (ocrError) throw ocrError;
        if (ocrData?.error) throw new Error(ocrData.error);

        const detectedName = ocrData.studentName || "";
        const detectedRoll = ocrData.rollNumber || "";

        updateSheet(sheet.id, {
          detectedName,
          detectedRoll,
          ocrFullText: ocrData.fullText || "",
          ocrAnswers: ocrData.answers || [],
        });

        // Step 3: AI Evaluate
        updateSheet(sheet.id, { status: "evaluating" });
        const answers = exam.questions.map(q => {
          const ocr = (ocrData.answers || []).find((a: any) => a.questionNumber === q.questionNumber);
          return { questionId: q.id, answer: ocr?.extractedText || "" };
        });

        const { data: evalData, error: evalError } = await supabase.functions.invoke("evaluate-exam", {
          body: { questions: exam.questions, answers, examTitle: exam.title },
        });
        if (evalError) throw evalError;
        if (evalData?.error) throw new Error(evalData.error);

        const questionEvaluations = exam.questions.map(q => {
          const aiQEval = evalData.questionEvaluations.find(
            (ae: any) => ae.questionId === q.id || ae.questionNumber === q.questionNumber
          );
          if (!aiQEval) {
            return {
              questionId: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
              score: 0, maxMarks: q.marks, percentage: 0,
              criterionScores: q.rubricCriteria.map(c => ({ criterionId: c.id, criterionName: c.name, score: 0, maxScore: c.maxScore, feedback: "Not evaluated" })),
              misconceptions: [], feedback: "Could not evaluate.", semanticSimilarity: 0,
            };
          }
          const score = aiQEval.criterionScores.reduce((s: number, c: any) => s + c.score, 0);
          return {
            questionId: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
            score: Math.round(score * 10) / 10, maxMarks: q.marks,
            percentage: Math.round((score / q.marks) * 100),
            criterionScores: aiQEval.criterionScores,
            misconceptions: aiQEval.misconceptions || [],
            feedback: aiQEval.feedback,
            semanticSimilarity: aiQEval.semanticSimilarity,
            detectedConcepts: aiQEval.detectedConcepts || [],
            missingConcepts: aiQEval.missingConcepts || [],
          };
        });

        const totalScore = questionEvaluations.reduce((s, e) => s + e.score, 0);
        const pct = Math.round((totalScore / exam.totalMarks) * 100);
        const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";

        const evaluation: ExamEvaluation = {
          id: crypto.randomUUID(),
          submissionId: `bulk-${sheet.id}`,
          examId: exam.id, examTitle: exam.title,
          studentName: detectedName || sheet.file.name,
          studentEmail: `${detectedRoll || "unknown"}@school.edu`,
          totalScore: Math.round(totalScore * 10) / 10, totalPossible: exam.totalMarks,
          percentage: pct, grade,
          questionEvaluations,
          overallMisconceptions: questionEvaluations.flatMap(e => e.misconceptions),
          performanceSummary: evalData.performanceSummary,
          strengths: evalData.strengths,
          weaknesses: evalData.weaknesses,
          evaluatedAt: new Date().toISOString(),
          teacherReviewed: false,
          answerSheetUrl: uploadedUrl,
          ocrFullText: ocrData.fullText || "",
        };

        const scores: Record<string, Record<string, number>> = {};
        questionEvaluations.forEach(qe => {
          scores[qe.questionId] = {};
          qe.criterionScores.forEach(cs => { scores[qe.questionId][cs.criterionId] = cs.score; });
        });

        updateSheet(sheet.id, { status: "reviewed", evaluation, editedScores: scores });
      } catch (err: any) {
        console.error(`Processing ${sheet.file.name} failed:`, err);
        updateSheet(sheet.id, { status: "error", error: err.message || "Processing failed" });
      }
    }

    setIsProcessing(false);
    toast.success("Batch processing complete!");
  };

  const updateCriterionScore = (sheetId: string, qId: string, cId: string, value: number) => {
    setSheets(prev => prev.map(s => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        editedScores: {
          ...s.editedScores,
          [qId]: { ...s.editedScores[qId], [cId]: value },
        },
      };
    }));
  };

  const getEditedTotal = (sheet: SheetEntry) => {
    if (!sheet.evaluation) return 0;
    return sheet.evaluation.questionEvaluations.reduce((s, qe) => {
      const qScores = sheet.editedScores[qe.questionId] || {};
      return s + qe.criterionScores.reduce((cs, c) => cs + (qScores[c.criterionId] ?? c.score), 0);
    }, 0);
  };

  const getGrade = (pct: number) => pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";
  const getScoreColor = (pct: number) => pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive";
  const getGradeBg = (pct: number) => pct >= 80 ? "bg-success/10 text-success" : pct >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";

  const finalizeSheet = (sheetId: string) => {
    const sheet = sheets.find(s => s.id === sheetId);
    if (!sheet?.evaluation || !exam) return;

    const finalQEvals = sheet.evaluation.questionEvaluations.map(qe => {
      const qScores = sheet.editedScores[qe.questionId] || {};
      const newCriterionScores = qe.criterionScores.map(cs => ({
        ...cs, score: qScores[cs.criterionId] ?? cs.score,
      }));
      const score = newCriterionScores.reduce((s, cs) => s + cs.score, 0);
      return { ...qe, score: Math.round(score * 10) / 10, percentage: Math.round((score / qe.maxMarks) * 100), criterionScores: newCriterionScores };
    });

    const totalScore = finalQEvals.reduce((s, qe) => s + qe.score, 0);
    const pct = Math.round((totalScore / exam.totalMarks) * 100);

    const finalEval: ExamEvaluation = {
      ...sheet.evaluation,
      studentName: sheet.detectedName || sheet.evaluation.studentName,
      questionEvaluations: finalQEvals,
      totalScore: Math.round(totalScore * 10) / 10,
      percentage: pct,
      grade: getGrade(pct),
      teacherReviewed: true,
      evaluatedAt: new Date().toISOString(),
      answerSheetUrl: sheet.uploadedUrl || undefined,
      ocrFullText: sheet.ocrFullText || undefined,
    };

    addTeacherEvaluation(finalEval);
    updateSheet(sheetId, { status: "finalized" });
  };

  const finalizeAll = () => {
    const reviewedSheets = sheets.filter(s => s.status === "reviewed");
    reviewedSheets.forEach(s => finalizeSheet(s.id));
    setAllFinalized(true);
    toast.success(`${reviewedSheets.length} evaluations finalized!`);
  };

  const processedCount = sheets.filter(s => ["reviewed", "finalized"].includes(s.status)).length;
  const errorCount = sheets.filter(s => s.status === "error").length;
  const progress = sheets.length > 0 ? Math.round((processedCount / sheets.length) * 100) : 0;

  if (allFinalized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">All Evaluations Finalized!</h2>
          <p className="text-muted-foreground">{processedCount} answer sheets have been evaluated and saved.</p>
          <Button onClick={() => { setAllFinalized(false); setSheets([]); setSelectedExam(""); }} variant="outline">
            Start New Batch
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Bulk Answer Sheet Evaluation</h1>
        <p className="mt-1 text-muted-foreground">Upload multiple answer sheets — student info is auto-detected via OCR</p>
      </div>

      {/* Step 1: Select Exam */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">1</span>
              Select Exam
            </CardTitle>
            <CardDescription>Choose the exam paper to evaluate against</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedExam} onValueChange={v => { setSelectedExam(v); setSheets([]); setAllFinalized(false); }}>
              <SelectTrigger><SelectValue placeholder="Choose an exam..." /></SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title} — {e.questions.length} questions, {e.totalMarks} marks
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {/* Step 2: Upload Multiple Files */}
      {exam && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">2</span>
                Upload Answer Sheets
              </CardTitle>
              <CardDescription>Upload multiple scanned answer sheets at once (PDF, JPG, PNG)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-accent hover:bg-muted/50">
                <Files className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">Click to upload multiple answer sheets</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 20MB each</p>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleFilesSelect} />
              </label>

              {sheets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{sheets.length} file(s) added</p>
                    <Button variant="ghost" size="sm" onClick={() => setSheets([])} className="text-xs text-destructive">
                      Clear All
                    </Button>
                  </div>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {sheets.map(sheet => (
                      <div key={sheet.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-accent" />
                          <span className="text-sm truncate text-foreground">{sheet.file.name}</span>
                          <StatusBadge status={sheet.status} />
                        </div>
                        {sheet.status === "queued" && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSheet(sheet.id)}>
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sheets.length > 0 && sheets.some(s => s.status === "queued") && (
                <Button
                  onClick={processAllSheets}
                  disabled={isProcessing}
                  className="w-full gradient-accent text-accent-foreground border-0"
                  size="lg"
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing {sheets.length} sheets...</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /> Process All ({sheets.length} sheets)</>
                  )}
                </Button>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{processedCount}/{sheets.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Review Results Table */}
      {sheets.some(s => ["reviewed", "finalized", "error"].includes(s.status)) && exam && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">3</span>
                  Review & Finalize
                </CardTitle>
                {sheets.some(s => s.status === "reviewed") && (
                  <Button onClick={finalizeAll} className="gradient-accent text-accent-foreground border-0" size="sm">
                    <Check className="mr-2 h-4 w-4" /> Approve All
                  </Button>
                )}
              </div>
              <CardDescription>
                Review AI scores, adjust if needed, then approve.
                {errorCount > 0 && <span className="text-destructive ml-1">({errorCount} failed)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Roll No.</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">File</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">AI Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Your Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Grade</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.filter(s => s.status !== "queued" && s.status !== "uploading" && s.status !== "ocr" && s.status !== "evaluating").map(sheet => {
                      const isExpanded = expandedSheet === sheet.id;
                      const editedTotal = getEditedTotal(sheet);
                      const editedPct = sheet.evaluation ? Math.round((editedTotal / sheet.evaluation.totalPossible) * 100) : 0;

                      return (
                        <React.Fragment key={sheet.id}>
                          <tr className={`border-b border-border last:border-0 transition-colors ${isExpanded ? "bg-accent/5" : "hover:bg-muted/30"}`}>
                            <td className="px-4 py-3">
                              {sheet.status === "error" ? (
                                <span className="text-sm text-destructive">Error</span>
                              ) : (
                                <input
                                  className="text-sm font-medium text-foreground bg-transparent border-0 border-b border-transparent hover:border-border focus:border-accent focus:outline-none w-full"
                                  value={sheet.detectedName}
                                  onChange={e => updateSheet(sheet.id, { detectedName: e.target.value })}
                                  placeholder="Student name"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {sheet.status !== "error" && (
                                <input
                                  className="text-sm text-muted-foreground bg-transparent border-0 border-b border-transparent hover:border-border focus:border-accent focus:outline-none w-20"
                                  value={sheet.detectedRoll}
                                  onChange={e => updateSheet(sheet.id, { detectedRoll: e.target.value })}
                                  placeholder="Roll #"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[120px]">{sheet.file.name}</td>
                            <td className="px-4 py-3">
                              {sheet.evaluation ? (
                                <span className={`text-sm font-bold ${getScoreColor(sheet.evaluation.percentage)}`}>
                                  {sheet.evaluation.totalScore}/{sheet.evaluation.totalPossible}
                                </span>
                              ) : sheet.status === "error" ? (
                                <Badge variant="destructive" className="text-xs">Failed</Badge>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {sheet.evaluation ? (
                                <span className={`text-sm font-bold ${getScoreColor(editedPct)}`}>
                                  {Math.round(editedTotal * 10) / 10}/{sheet.evaluation.totalPossible}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {sheet.evaluation && (
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${getGradeBg(editedPct)}`}>
                                  {getGrade(editedPct)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 flex gap-1">
                              {sheet.status === "reviewed" && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}>
                                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => finalizeSheet(sheet.id)} className="text-xs">
                                    <Check className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                </>
                              )}
                              {sheet.status === "finalized" && (
                                <Badge className="bg-success/10 text-success border-0 text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Done</Badge>
                              )}
                              {sheet.status === "error" && (
                                <span className="text-xs text-destructive">{sheet.error}</span>
                              )}
                            </td>
                          </tr>
                          {/* Expanded detail row */}
                          <AnimatePresence>
                            {isExpanded && sheet.evaluation && (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 py-4 bg-muted/10 border-b border-border space-y-4">
                                      {/* OCR preview */}
                                      {sheet.ocrFullText && (
                                        <div className="rounded-lg border border-border bg-background p-3">
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Extracted Text</p>
                                          <p className="text-xs text-foreground whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{sheet.ocrFullText}</p>
                                        </div>
                                      )}
                                      {/* Per-question rubric editing */}
                                      <div className="space-y-3">
                                        {sheet.evaluation.questionEvaluations.map(qe => {
                                          const qScores = sheet.editedScores[qe.questionId] || {};
                                          const qTotal = qe.criterionScores.reduce((s, cs) => s + (qScores[cs.criterionId] ?? cs.score), 0);
                                          return (
                                            <div key={qe.questionId} className="rounded-lg border border-border bg-background p-3">
                                              <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-medium text-foreground">Q{qe.questionNumber}: {qe.questionText.slice(0, 60)}…</p>
                                                <span className={`text-sm font-bold ${getScoreColor(Math.round((qTotal / qe.maxMarks) * 100))}`}>
                                                  {Math.round(qTotal * 10) / 10}/{qe.maxMarks}
                                                </span>
                                              </div>
                                              <div className="grid gap-2 sm:grid-cols-2">
                                                {qe.criterionScores.map(cs => (
                                                  <div key={cs.criterionId} className="flex items-center gap-2">
                                                    <Label className="text-xs text-muted-foreground min-w-[100px]">{cs.criterionName}</Label>
                                                    <Input
                                                      type="number"
                                                      min={0}
                                                      max={cs.maxScore}
                                                      step={0.5}
                                                      className="h-7 w-16 text-sm"
                                                      value={qScores[cs.criterionId] ?? cs.score}
                                                      onChange={e => updateCriterionScore(sheet.id, qe.questionId, cs.criterionId, Math.min(cs.maxScore, Math.max(0, +e.target.value)))}
                                                    />
                                                    <span className="text-xs text-muted-foreground">/ {cs.maxScore}</span>
                                                  </div>
                                                ))}
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-2 italic">{qe.feedback}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: SheetEntry["status"] }> = ({ status }) => {
  const map: Record<string, { label: string; className: string }> = {
    queued: { label: "Queued", className: "bg-muted text-muted-foreground" },
    uploading: { label: "Uploading", className: "bg-info/10 text-info" },
    ocr: { label: "OCR", className: "bg-warning/10 text-warning" },
    evaluating: { label: "AI Grading", className: "bg-accent/10 text-accent" },
    reviewed: { label: "Ready", className: "bg-success/10 text-success" },
    finalized: { label: "Finalized", className: "bg-success/10 text-success" },
    error: { label: "Error", className: "bg-destructive/10 text-destructive" },
  };
  const { label, className } = map[status] || map.queued;
  return <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${className}`}>{label}</Badge>;
};

export default TeacherBulkEvaluation;
