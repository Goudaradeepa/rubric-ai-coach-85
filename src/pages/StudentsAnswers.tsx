import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, Image as ImageIcon, Loader2, X, CheckCircle,
  Sparkles, UserPlus, AlertTriangle, Save,
} from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

interface Student {
  id: string;
  name: string;
  rollNumber: string;
}

interface ExtractedAnswer {
  answerId: string;
  questionId: string;
  questionNumber: number;
  questionText: string;
  marks: number;
  extractedText: string;
  ocrStatus: "done" | "empty";
  ocrConfidence: number;
}

interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface AnswerEvaluation {
  evaluationId: string;
  criterionScores: CriterionScore[];
  totalScore: number;
  maxMarks: number;
  feedback: string;
  semanticSimilarity: number;
  rubricCoverage: number;
  confidenceScore: number;
  confidenceLevel: string;
  requiresTeacherReview: boolean;
  detectedConcepts?: string[];
  missingConcepts?: string[];
  review?: { finalMarks: number; comment: string };
}

const StudentsAnswers: React.FC = () => {
  const { exams, addReviewItem } = useEvaluation();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoll, setNewRoll] = useState("");
  const [selectedExam, setSelectedExam] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedAnswer[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluation>>({});
  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});
  const [reviewDraft, setReviewDraft] = useState<Record<string, { finalMarks: string; comment: string }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exam = exams.find(e => e.id === selectedExam);
  const student = students.find(s => s.id === selectedStudent);

  const addStudent = () => {
    if (!newName.trim()) {
      toast.error("Enter the student's name");
      return;
    }
    const s: Student = { id: crypto.randomUUID(), name: newName.trim(), rollNumber: newRoll.trim() || "—" };
    setStudents(prev => [...prev, s]);
    setSelectedStudent(s.id);
    setNewName("");
    setNewRoll("");
    toast.success("Student added");
  };

  const resetSheet = () => {
    setFile(null);
    setPreview(null);
    setProcessed(false);
    setExtracted([]);
    setEvaluations({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Only PDF, PNG, JPG or JPEG files are supported");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }
    resetSheet();
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  // POST /answers/sheet — multipart upload of the answer sheet, backend does OCR/HTR + answer extraction
  const handleUploadAndProcess = async () => {
    if (!student) return toast.error("Select a student first");
    if (!exam) return toast.error("Select a question paper first");
    if (!file) return toast.error("Upload the student's answer sheet");

    setProcessing(true);
    try {
      const path = `${student.id}/${Date.now()}-${file.name}`;
      const { data: up, error: upErr } = await supabase.storage
        .from("answer-sheets")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("answer-sheets").getPublicUrl(up.path);

      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: {
          student_id: student.id,
          question_paper_id: exam.id,
          fileUrl: urlData.publicUrl,
          mimeType: file.type,
          questionCount: exam.questions.length,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rows: ExtractedAnswer[] = exam.questions.map(q => {
        const match = data.answers?.find((a: any) => a.questionNumber === q.questionNumber);
        return {
          answerId: crypto.randomUUID(),
          questionId: q.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          marks: q.marks,
          extractedText: match?.extractedText || "",
          ocrStatus: match?.extractedText ? "done" : "empty",
          ocrConfidence: match?.confidence ?? 0,
        };
      });

      setExtracted(rows);
      setProcessed(true);
      toast.success("Answer sheet processed successfully.");
    } catch (err: any) {
      console.error("Answer sheet processing failed:", err);
      toast.error(err.message || "Answer sheet processing failed");
    } finally {
      setProcessing(false);
    }
  };

  // POST /answers/{answer_id}/evaluate — backend performs the full rubric evaluation
  const runEvaluation = async (row: ExtractedAnswer) => {
    const question = exam?.questions.find(q => q.id === row.questionId);
    if (!question) return;
    setEvaluating(prev => ({ ...prev, [row.answerId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-answer", {
        body: {
          answer_id: row.answerId,
          question,
          studentAnswer: row.extractedText,
          ocrConfidence: row.ocrConfidence,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const evaluation: AnswerEvaluation = { evaluationId: crypto.randomUUID(), ...data };
      setEvaluations(prev => ({ ...prev, [row.answerId]: evaluation }));

      // Low-confidence cases are routed to the teacher Review Queue
      if (evaluation.requiresTeacherReview || evaluation.confidenceLevel?.toLowerCase() === "low") {
        addReviewItem({
          studentName: student?.name || "Unknown",
          rollNumber: student?.rollNumber || "—",
          examId: exam?.id || "",
          examTitle: exam?.title || "",
          module: question.module,
          questionId: row.questionId,
          questionNumber: row.questionNumber,
          questionText: row.questionText,
          extractedText: row.extractedText,
          maxMarks: row.marks,
          aiMarks: evaluation.totalScore,
          confidenceScore: evaluation.confidenceScore,
          confidenceLevel: evaluation.confidenceLevel,
          explanation: evaluation.feedback,
          criterionScores: evaluation.criterionScores,
        });
      }
      setReviewDraft(prev => ({
        ...prev,
        [row.answerId]: { finalMarks: String(evaluation.totalScore ?? ""), comment: "" },
      }));
    } catch (err: any) {
      console.error("Evaluation failed:", err);
      toast.error(err.message || "AI evaluation failed");
    } finally {
      setEvaluating(prev => ({ ...prev, [row.answerId]: false }));
    }
  };

  // POST /evaluations/{evaluation_id}/review
  const saveReview = (row: ExtractedAnswer) => {
    const evaluation = evaluations[row.answerId];
    const draft = reviewDraft[row.answerId];
    if (!evaluation || !draft) return;
    const finalMarks = Number(draft.finalMarks);
    if (Number.isNaN(finalMarks) || finalMarks < 0 || finalMarks > row.marks) {
      toast.error(`Final marks must be between 0 and ${row.marks}`);
      return;
    }
    setEvaluations(prev => ({
      ...prev,
      [row.answerId]: { ...evaluation, review: { finalMarks, comment: draft.comment } },
    }));
    toast.success("Teacher review saved");
  };

  const evaluatedTotal = extracted.reduce((sum, r) => {
    const ev = evaluations[r.answerId];
    return sum + (ev?.review?.finalMarks ?? ev?.totalScore ?? 0);
  }, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Students &amp; Answers</h1>
        <p className="mt-1 text-muted-foreground">
          Upload handwritten/scanned answer sheets — the backend handles OCR, extraction and rubric evaluation.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">1. Student</CardTitle>
            <CardDescription>Add a new student or select an existing one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <Label>Student name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Anita Rao" />
              </div>
              <div>
                <Label>Roll number</Label>
                <Input value={newRoll} onChange={e => setNewRoll(e.target.value)} placeholder="e.g. 1BM21CS045" />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={addStudent} className="w-full sm:w-auto">
                  <UserPlus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
            <div>
              <Label>Select student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder={students.length ? "Choose a student..." : "Add a student first"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} · {s.rollNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">2. Question Paper</CardTitle>
            <CardDescription>Select the question paper this answer sheet belongs to</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedExam} onValueChange={v => { setSelectedExam(v); resetSheet(); }}>
              <SelectTrigger><SelectValue placeholder="Choose a question paper..." /></SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.title} — {e.subject} ({e.totalMarks} marks)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Upload Student Answer Sheet</CardTitle>
            <CardDescription>Upload the student's complete handwritten/scanned answer sheet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 transition-colors hover:border-accent hover:bg-muted/50"
              >
                <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Click to select the answer sheet</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG, JPEG — max 20MB</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    {file.type.startsWith("image/")
                      ? <ImageIcon className="h-8 w-8 text-accent" />
                      : <FileText className="h-8 w-8 text-accent" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={processing}>
                      Change
                    </Button>
                    <Button variant="ghost" size="icon" onClick={resetSheet} disabled={processing} aria-label="Remove file">
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {preview && (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <img src={preview} alt="Scanned answer sheet preview" className="max-h-96 w-full bg-muted/20 object-contain" />
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={handleFileSelect}
            />

            <Button
              onClick={handleUploadAndProcess}
              disabled={processing || !file || !student || !exam}
              className="w-full gradient-accent border-0 text-accent-foreground"
              size="lg"
            >
              {processing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing answer sheet (OCR)…</>
                : <><Upload className="mr-2 h-4 w-4" /> Upload &amp; Process Answer Sheet</>}
            </Button>

            {processing && (
              <div className="space-y-2">
                <Progress value={66} className="h-1.5" />
                <p className="text-center text-xs text-muted-foreground">
                  Image processing → OCR/HTR → answer extraction. This can take up to a minute.
                </p>
              </div>
            )}

            {processed && (
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm font-medium text-success">
                <CheckCircle className="h-4 w-4" /> Answer sheet processed successfully.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {processed && exam && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Extracted Student Answers</h2>
              <p className="text-sm text-muted-foreground">
                Question Paper: {exam.title} — {exam.subject}
                {student ? ` · ${student.name} (${student.rollNumber})` : ""}
              </p>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              Total: {evaluatedTotal} / {exam.totalMarks}
            </span>
          </div>

          {extracted.map(row => {
            const ev = evaluations[row.answerId];
            const draft = reviewDraft[row.answerId] || { finalMarks: "", comment: "" };
            const lowConfidence = ev && (ev.confidenceLevel?.toLowerCase() === "low" || ev.requiresTeacherReview);
            return (
              <Card key={row.answerId} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-heading text-base">Q{row.questionNumber} — {row.marks} marks</CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                        OCR Status: {row.ocrStatus === "done" ? "Done" : "No text found"}
                      </span>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                        OCR Confidence: {(row.ocrConfidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <CardDescription>{row.questionText}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {row.extractedText || "No text could be extracted for this question."}
                    </p>
                  </div>

                  {!ev && (
                    <Button
                      onClick={() => runEvaluation(row)}
                      disabled={!!evaluating[row.answerId]}
                      variant="outline"
                      className="w-full"
                    >
                      {evaluating[row.answerId]
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating…</>
                        : <><Sparkles className="mr-2 h-4 w-4" /> Run AI Evaluation</>}
                    </Button>
                  )}

                  {ev && (
                    <div className="space-y-4 rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-heading text-sm font-semibold text-foreground">AI Evaluation</h4>
                        <span className="text-sm font-semibold text-accent">
                          Total Marks: {ev.totalScore} / {ev.maxMarks ?? row.marks}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {ev.criterionScores?.map((c, i) => (
                          <div key={c.criterionId || i} className="rounded-lg bg-muted/30 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">{c.criterionName}</p>
                              <span className="text-sm font-semibold text-foreground">{c.score} / {c.maxScore} marks</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Reason: {c.feedback}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Semantic Similarity: <span className="font-medium text-foreground">{(ev.semanticSimilarity * 100).toFixed(1)}%</span></p>
                        <p>Rubric Coverage: <span className="font-medium text-foreground">{(ev.rubricCoverage * 100).toFixed(1)}%</span></p>
                        <p>Confidence Score: <span className="font-medium text-foreground">{(ev.confidenceScore * 100).toFixed(1)}%</span></p>
                        <p>Confidence Level: <span className="font-medium text-foreground capitalize">{ev.confidenceLevel}</span></p>
                      </div>

                      {ev.feedback && <p className="text-sm text-muted-foreground">{ev.feedback}</p>}

                      {lowConfidence && (
                        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <AlertTriangle className="h-4 w-4" /> Low confidence — teacher review requested
                          </p>
                          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                            <div>
                              <Label className="text-xs">Final Marks</Label>
                              <Input
                                type="number"
                                min={0}
                                max={row.marks}
                                value={draft.finalMarks}
                                onChange={e => setReviewDraft(prev => ({ ...prev, [row.answerId]: { ...draft, finalMarks: e.target.value } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Comment</Label>
                              <Textarea
                                rows={2}
                                value={draft.comment}
                                onChange={e => setReviewDraft(prev => ({ ...prev, [row.answerId]: { ...draft, comment: e.target.value } }))}
                                placeholder="Reason for the adjustment"
                                className="resize-none"
                              />
                            </div>
                          </div>
                          <Button size="sm" onClick={() => saveReview(row)}>
                            <Save className="mr-2 h-4 w-4" /> Save Review
                          </Button>
                        </div>
                      )}

                      {ev.review && (
                        <p className="text-xs font-medium text-success">
                          Teacher review saved · Final marks {ev.review.finalMarks} / {row.marks}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentsAnswers;
