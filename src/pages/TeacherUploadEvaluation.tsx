import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, Image, Loader2, X, CheckCircle, Save, Edit3,
  Target, AlertTriangle, ChevronDown, ChevronUp, Eye, Send,
} from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExamEvaluation, QuestionEvaluation } from "@/types/evaluation";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const TeacherUploadEvaluation: React.FC = () => {
  const { exams, addTeacherEvaluation } = useEvaluation();
  const [selectedExam, setSelectedExam] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrFullText, setOcrFullText] = useState("");
  const [ocrAnswers, setOcrAnswers] = useState<{ questionNumber: number; extractedText: string; confidence: number }[]>([]);
  const [ocrDone, setOcrDone] = useState(false);

  // AI Evaluation
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<ExamEvaluation | null>(null);
  const [editedScores, setEditedScores] = useState<Record<string, Record<string, number>>>({});
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [finalized, setFinalized] = useState(false);

  const exam = exams.find(e => e.id === selectedExam);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) { toast.error("Upload PDF, JPG, or PNG"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setUploadedFile(file);
    setOcrDone(false); setOcrAnswers([]); setOcrFullText(""); setAiEvaluation(null); setFinalized(false);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setUploadPreview(null); }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null); setUploadPreview(null); setUploadedUrl(null);
    setOcrDone(false); setOcrAnswers([]); setOcrFullText("");
    setAiEvaluation(null); setFinalized(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtractOCR = async () => {
    if (!uploadedFile || !exam) return;
    setIsExtracting(true);
    try {
      const fileName = `teacher/${Date.now()}-${uploadedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("answer-sheets").upload(fileName, uploadedFile, { contentType: uploadedFile.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("answer-sheets").getPublicUrl(uploadData.path);
      setUploadedUrl(urlData.publicUrl);

      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: { fileUrl: urlData.publicUrl, mimeType: uploadedFile.type, questionCount: exam.questions.length },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOcrFullText(data.fullText || "");
      setOcrAnswers(data.answers || []);
      setOcrDone(true);
      toast.success(`Extracted ${data.answers?.length || 0} answers`);
    } catch (err: any) {
      console.error("OCR failed:", err);
      toast.error(err.message || "OCR extraction failed");
    } finally { setIsExtracting(false); }
  };

  const handleAIEvaluate = async () => {
    if (!exam || !ocrDone) return;
    setIsEvaluating(true);
    try {
      const answers = exam.questions.map(q => {
        const ocr = ocrAnswers.find(a => a.questionNumber === q.questionNumber);
        return { questionId: q.id, answer: ocr?.extractedText || "" };
      });

      const { data, error } = await supabase.functions.invoke("evaluate-exam", {
        body: { questions: exam.questions, answers, examTitle: exam.title },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const questionEvaluations = exam.questions.map(q => {
        const aiQEval = data.questionEvaluations.find(
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
        id: crypto.randomUUID(), submissionId: `teacher-${crypto.randomUUID()}`,
        examId: exam.id, examTitle: exam.title,
        studentName, studentEmail,
        totalScore: Math.round(totalScore * 10) / 10, totalPossible: exam.totalMarks,
        percentage: pct, grade,
        questionEvaluations,
        overallMisconceptions: questionEvaluations.flatMap(e => e.misconceptions),
        performanceSummary: data.performanceSummary,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        evaluatedAt: new Date().toISOString(),
        teacherReviewed: false,
        answerSheetUrl: uploadedUrl || undefined,
        answerSheetFileName: uploadedFile?.name,
        ocrFullText,
      };

      setAiEvaluation(evaluation);
      // Initialize edited scores from AI
      const scores: Record<string, Record<string, number>> = {};
      questionEvaluations.forEach(qe => {
        scores[qe.questionId] = {};
        qe.criterionScores.forEach(cs => { scores[qe.questionId][cs.criterionId] = cs.score; });
      });
      setEditedScores(scores);
      toast.success("AI evaluation complete! Review and adjust marks below.");
    } catch (err: any) {
      console.error("Evaluation failed:", err);
      toast.error(err.message || "AI evaluation failed");
    } finally { setIsEvaluating(false); }
  };

  const updateCriterionScore = (qId: string, cId: string, value: number) => {
    setEditedScores(prev => ({
      ...prev,
      [qId]: { ...prev[qId], [cId]: value },
    }));
  };

  const getEditedTotal = (qe: QuestionEvaluation) => {
    const qScores = editedScores[qe.questionId];
    if (!qScores) return qe.score;
    return qe.criterionScores.reduce((s, cs) => s + (qScores[cs.criterionId] ?? cs.score), 0);
  };

  const getGrandTotal = () => {
    if (!aiEvaluation) return 0;
    return aiEvaluation.questionEvaluations.reduce((s, qe) => s + getEditedTotal(qe), 0);
  };

  const handleFinalize = () => {
    if (!aiEvaluation || !exam) return;
    const finalQEvals = aiEvaluation.questionEvaluations.map(qe => {
      const qScores = editedScores[qe.questionId] || {};
      const newCriterionScores = qe.criterionScores.map(cs => ({
        ...cs, score: qScores[cs.criterionId] ?? cs.score,
      }));
      const score = newCriterionScores.reduce((s, cs) => s + cs.score, 0);
      return { ...qe, score: Math.round(score * 10) / 10, percentage: Math.round((score / qe.maxMarks) * 100), criterionScores: newCriterionScores };
    });

    const totalScore = finalQEvals.reduce((s, qe) => s + qe.score, 0);
    const pct = Math.round((totalScore / exam.totalMarks) * 100);
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";

    const finalEval: ExamEvaluation = {
      ...aiEvaluation,
      questionEvaluations: finalQEvals,
      totalScore: Math.round(totalScore * 10) / 10,
      percentage: pct,
      grade,
      teacherReviewed: true,
      evaluatedAt: new Date().toISOString(),
    };

    addTeacherEvaluation(finalEval);
    setFinalized(true);
    toast.success("Evaluation finalized and saved!");
  };

  const getScoreColor = (pct: number) => pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive";
  const getBarColor = (pct: number) => pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-destructive";

  if (finalized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Evaluation Finalized!</h2>
          <p className="text-muted-foreground">Teacher-reviewed marks have been saved.</p>
          <Button onClick={() => {
            setFinalized(false); setAiEvaluation(null); setStudentName(""); setStudentEmail("");
            setSelectedExam(""); handleRemoveFile();
          }} variant="outline">Evaluate Another Sheet</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Teacher Answer Sheet Evaluation</h1>
        <p className="mt-1 text-muted-foreground">Upload scanned answer sheets, get AI-suggested marks, and review before finalizing</p>
      </div>

      {/* Step 1: Student Info & Exam Selection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">1</span>
              Student & Exam Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Student Name</Label><Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. John Doe" /></div>
              <div><Label>Student Email</Label><Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="student@school.edu" /></div>
            </div>
            <div>
              <Label>Select Exam</Label>
              <Select value={selectedExam} onValueChange={v => { setSelectedExam(v); setAiEvaluation(null); setOcrDone(false); }}>
                <SelectTrigger><SelectValue placeholder="Choose an exam..." /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title} ({e.totalMarks} marks)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Step 2: Upload Answer Sheet */}
      {exam && studentName && studentEmail && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">2</span>
                Upload Answer Sheet
              </CardTitle>
              <CardDescription>Upload a scanned answer sheet (PDF, JPG, PNG)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!uploadedFile ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-accent hover:bg-muted/50">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 20MB</p>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      {uploadedFile.type.startsWith("image/") ? <Image className="h-8 w-8 text-accent" /> : <FileText className="h-8 w-8 text-accent" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile}><X className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {uploadPreview && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <img src={uploadPreview} alt="Answer sheet" className="w-full max-h-64 object-contain bg-muted/20" />
                    </div>
                  )}
                  <Button onClick={handleExtractOCR} disabled={isExtracting || ocrDone} className="w-full gradient-accent text-accent-foreground border-0">
                    {isExtracting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting Text...</> :
                     ocrDone ? <><CheckCircle className="mr-2 h-4 w-4" /> Text Extracted</> :
                     <><FileText className="mr-2 h-4 w-4" /> Extract Text (OCR)</>}
                  </Button>
                </div>
              )}

              {ocrDone && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Extracted Text</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">{ocrFullText}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ocrAnswers.map(a => (
                      <Badge key={a.questionNumber} variant="secondary" className="text-xs">
                        Q{a.questionNumber}: {Math.round(a.confidence * 100)}% confidence
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: AI Evaluation */}
      {ocrDone && !aiEvaluation && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">3</span>
                AI Evaluation
              </CardTitle>
              <CardDescription>Run AI-based rubric evaluation on the extracted answers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleAIEvaluate} disabled={isEvaluating} className="w-full gradient-accent text-accent-foreground border-0" size="lg">
                {isEvaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating with AI...</> :
                 <><Target className="mr-2 h-4 w-4" /> Run AI Evaluation</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 4: Review & Adjust */}
      {aiEvaluation && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">4</span>
                Review & Adjust Marks
              </CardTitle>
              <CardDescription>AI-suggested marks shown below. Adjust any scores before finalizing.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">AI Total</p>
                  <p className={`text-2xl font-bold font-heading ${getScoreColor(aiEvaluation.percentage)}`}>
                    {aiEvaluation.totalScore}/{aiEvaluation.totalPossible}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Your Total</p>
                  <p className={`text-2xl font-bold font-heading ${getScoreColor(Math.round((getGrandTotal() / aiEvaluation.totalPossible) * 100))}`}>
                    {Math.round(getGrandTotal() * 10) / 10}/{aiEvaluation.totalPossible}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <p className="text-2xl font-bold font-heading text-accent">
                    {(() => { const p = Math.round((getGrandTotal() / aiEvaluation.totalPossible) * 100); return p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "F"; })()}
                  </p>
                </div>
              </div>

              {/* Per question */}
              <div className="space-y-3">
                {aiEvaluation.questionEvaluations.map((qe, i) => {
                  const isExpanded = expandedQ === qe.questionId;
                  const editedTotal = getEditedTotal(qe);
                  const editedPct = Math.round((editedTotal / qe.maxMarks) * 100);
                  const changed = Math.abs(editedTotal - qe.score) > 0.01;

                  return (
                    <Card key={qe.questionId} className={`border ${changed ? "border-warning/50" : "border-border"}`}>
                      <button className="w-full text-left" onClick={() => setExpandedQ(isExpanded ? null : qe.questionId)}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                              editedPct >= 80 ? "bg-success/10 text-success" : editedPct >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                            }`}>Q{qe.questionNumber}</span>
                            <div>
                              <p className="text-sm font-medium text-foreground line-clamp-1">{qe.questionText}</p>
                              <p className="text-xs text-muted-foreground">{qe.feedback}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                {changed && <Badge variant="outline" className="text-xs border-warning text-warning">Modified</Badge>}
                                <p className={`text-lg font-bold font-heading ${getScoreColor(editedPct)}`}>
                                  {Math.round(editedTotal * 10) / 10}/{qe.maxMarks}
                                </p>
                              </div>
                              {changed && <p className="text-xs text-muted-foreground">AI: {qe.score}/{qe.maxMarks}</p>}
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </CardContent>
                      </button>

                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border">
                          <CardContent className="pt-4 space-y-4">
                            {/* Extracted answer */}
                            {ocrAnswers.find(a => a.questionNumber === qe.questionNumber) && (
                              <div className="rounded-lg bg-muted/20 border border-border p-3">
                                <h4 className="text-xs font-medium text-muted-foreground mb-1">Student's Answer (OCR)</h4>
                                <p className="text-sm text-foreground">{ocrAnswers.find(a => a.questionNumber === qe.questionNumber)?.extractedText}</p>
                              </div>
                            )}

                            {/* Rubric scores - editable */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Edit3 className="h-4 w-4 text-accent" /> Rubric Scores (editable)
                              </h4>
                              {qe.criterionScores.map(cs => {
                                const edited = editedScores[qe.questionId]?.[cs.criterionId] ?? cs.score;
                                const cPct = Math.round((edited / cs.maxScore) * 100);
                                const isModified = Math.abs(edited - cs.score) > 0.01;
                                return (
                                  <div key={cs.criterionId} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">{cs.criterionName}</span>
                                      <div className="flex items-center gap-2">
                                        {isModified && <span className="text-xs text-warning">AI: {cs.score}</span>}
                                        <Input
                                          type="number"
                                          min={0}
                                          max={cs.maxScore}
                                          step={0.5}
                                          value={edited}
                                          onChange={e => updateCriterionScore(qe.questionId, cs.criterionId, Math.min(cs.maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                                          className="w-20 h-8 text-sm text-center"
                                        />
                                        <span className="text-xs text-muted-foreground">/ {cs.maxScore}</span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted">
                                      <div className={`h-1.5 rounded-full transition-all ${getBarColor(cPct)}`} style={{ width: `${cPct}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{cs.feedback}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Concepts */}
                            {(qe.detectedConcepts?.length || qe.missingConcepts?.length) ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {qe.detectedConcepts && qe.detectedConcepts.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-success flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Detected Concepts</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {qe.detectedConcepts.map((c, ci) => <Badge key={ci} variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">{c}</Badge>)}
                                    </div>
                                  </div>
                                )}
                                {qe.missingConcepts && qe.missingConcepts.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Missing Concepts</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {qe.missingConcepts.map((c, ci) => <Badge key={ci} variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{c}</Badge>)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {/* Semantic similarity */}
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">Semantic Similarity:</span>
                              <Badge variant="outline">{Math.round(qe.semanticSimilarity * 100)}%</Badge>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Finalize Button */}
          <Button onClick={handleFinalize} className="w-full gradient-accent text-accent-foreground border-0" size="lg">
            <Save className="mr-2 h-4 w-4" /> Finalize & Save Evaluation
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default TeacherUploadEvaluation;
