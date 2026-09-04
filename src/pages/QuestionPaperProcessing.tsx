import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles, CheckCircle, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEvaluation } from "@/context/EvaluationContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import type { ExamQuestion, RubricCriterion } from "@/types/evaluation";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

const QuestionPaperProcessing: React.FC = () => {
  const { addExam } = useEvaluation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paperTitle, setPaperTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  // OR alternatives (same orGroup) count once toward the total — students answer only one of them
  const totalMarks = (() => {
    const seen = new Map<string, number>();
    let total = 0;
    for (const q of questions) {
      const marks = Number(q.marks) || 0;
      if (q.orGroup) {
        const prev = seen.get(q.orGroup) ?? 0;
        if (marks > prev) { total += marks - prev; seen.set(q.orGroup, marks); }
      } else {
        total += marks;
      }
    }
    return total;
  })();
  const rubricsReady = questions.length > 0 && questions.every(q => q.rubricCriteria.length > 0);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) return toast.error("Upload a PDF, PNG or JPG question paper");
    if (f.size > 20 * 1024 * 1024) return toast.error("File must be under 20MB");
    setFile(f);
  };

  // Module 2 — Question Paper Processing (backend OCR + structure extraction)
  const extractPaper = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const path = `question-papers/${Date.now()}-${file.name}`;
      const { data: up, error: upErr } = await supabase.storage
        .from("answer-sheets").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("answer-sheets").getPublicUrl(up.path);

      const { data, error } = await supabase.functions.invoke("process-question-paper", {
        body: { fileUrl: urlData.publicUrl, mimeType: file.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaperTitle(data.examTitle || file.name.replace(/\.[^.]+$/, ""));
      setSubject([data.subject, data.courseCode].filter(Boolean).join(" · ") || "General");
      setQuestions((data.questions || []).map((q: any, i: number) => ({
        id: crypto.randomUUID(),
        questionNumber: Number(q.questionNumber) || i + 1,
        subQuestion: q.subQuestion || "",
        module: q.module || "",
        bloomLevel: q.bloomLevel || "",
        courseOutcome: q.courseOutcome || "",
        orGroup: q.orGroup || "",
        questionText: q.questionText || "",
        marks: Number(q.marks) || 0,
        modelAnswer: "",
        rubricCriteria: [],
        rubricApproved: false,
      })));
      toast.success(`Extracted ${data.questions?.length || 0} questions`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Question paper processing failed");
    } finally {
      setExtracting(false);
    }
  };

  // Module 3 — Rubric generation (LLM)
  const generateRubrics = async () => {
    if (!questions.length) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-rubrics", {
        body: { subject, questions: questions.map(q => ({ ...q, rubricCriteria: undefined })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setQuestions(prev => prev.map(q => {
        const r = data.rubrics?.find((x: any) => x.questionId === q.id);
        if (!r) return q;
        const criteria: RubricCriterion[] = (r.criteria || []).map((c: any) => ({
          id: crypto.randomUUID(),
          name: c.name,
          description: c.description,
          expectedConcept: c.expectedConcept,
          maxScore: Number(c.maxScore) || 0,
        }));
        return { ...q, modelAnswer: r.modelAnswer || q.modelAnswer, rubricCriteria: criteria, rubricApproved: false };
      }));
      toast.success("Rubrics generated — review and approve them");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Rubric generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (id: string, patch: Partial<ExamQuestion>) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));

  const updateCriterion = (qid: string, cid: string, patch: Partial<RubricCriterion>) =>
    setQuestions(prev => prev.map(q => q.id === qid
      ? { ...q, rubricApproved: false, rubricCriteria: q.rubricCriteria.map(c => c.id === cid ? { ...c, ...patch } : c) }
      : q));

  const removeCriterion = (qid: string, cid: string) =>
    setQuestions(prev => prev.map(q => q.id === qid
      ? { ...q, rubricApproved: false, rubricCriteria: q.rubricCriteria.filter(c => c.id !== cid) }
      : q));

  const addCriterion = (qid: string) =>
    setQuestions(prev => prev.map(q => q.id === qid
      ? { ...q, rubricApproved: false, rubricCriteria: [...q.rubricCriteria, { id: crypto.randomUUID(), name: "New criterion", description: "", expectedConcept: "", maxScore: 1 }] }
      : q));

  const savePaper = () => {
    if (!paperTitle.trim()) return toast.error("Enter a paper title");
    if (!rubricsReady) return toast.error("Every question needs a rubric");
    if (questions.some(q => !q.rubricApproved)) return toast.error("Approve every rubric before saving");
    addExam({ title: paperTitle, subject: subject || "General", questions });
    toast.success("Question paper saved with approved rubrics");
    navigate("/students-answers");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Question Paper &amp; Rubrics</h1>
        <p className="mt-1 text-muted-foreground">
          Upload the module-wise question paper, extract questions with marks, BL and CO, then generate and approve question-wise rubrics.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">1. Upload Question Paper</CardTitle>
            <CardDescription>PDF, PNG or JPG — the backend runs OCR and extracts the paper structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <div
                role="button" tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 transition-colors hover:border-accent hover:bg-muted/50"
              >
                <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Click to select the question paper</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG — max 20MB</p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label="Remove file">
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={onSelect} />
            <Button onClick={extractPaper} disabled={!file || extracting} className="w-full gradient-accent border-0 text-accent-foreground" size="lg">
              {extracting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting questions (OCR)…</>
                : <><FileText className="mr-2 h-4 w-4" /> Process Question Paper</>}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {questions.length > 0 && (
        <>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">2. Paper Details</CardTitle>
              <CardDescription>{questions.length} questions · {totalMarks} marks detected</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Paper title</Label><Input value={paperTitle} onChange={e => setPaperTitle(e.target.value)} /></div>
              <div><Label>Subject / code</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
              <div className="sm:col-span-2">
                <Button onClick={generateRubrics} disabled={generating} variant="outline" className="w-full">
                  {generating
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating question-wise rubrics…</>
                    : <><Sparkles className="mr-2 h-4 w-4" /> Generate Rubrics with AI</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          <h2 className="font-heading text-2xl font-bold text-foreground">3. Review &amp; Approve Rubrics</h2>

          {questions.map(q => {
            const rubricTotal = q.rubricCriteria.reduce((s, c) => s + (Number(c.maxScore) || 0), 0);
            const mismatch = q.rubricCriteria.length > 0 && rubricTotal !== q.marks;
            return (
              <Card key={q.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-heading text-base">
                      {q.module ? `${q.module} · ` : ""}Q{q.questionNumber}{q.subQuestion ? `(${q.subQuestion})` : ""} — {q.marks} marks
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {q.bloomLevel && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">BL {q.bloomLevel}</span>}
                      {q.courseOutcome && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">CO {q.courseOutcome}</span>}
                      {q.orGroup && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">OR: {q.orGroup}</span>}
                      {q.rubricApproved && <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">Approved</span>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Question text</Label>
                    <Textarea rows={2} value={q.questionText} onChange={e => updateQuestion(q.id, { questionText: e.target.value })} className="resize-none" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div><Label className="text-xs">Marks</Label><Input type="number" value={q.marks} onChange={e => updateQuestion(q.id, { marks: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Module</Label><Input value={q.module || ""} onChange={e => updateQuestion(q.id, { module: e.target.value })} /></div>
                    <div><Label className="text-xs">BL</Label><Input value={q.bloomLevel || ""} onChange={e => updateQuestion(q.id, { bloomLevel: e.target.value })} /></div>
                    <div><Label className="text-xs">CO</Label><Input value={q.courseOutcome || ""} onChange={e => updateQuestion(q.id, { courseOutcome: e.target.value })} /></div>
                  </div>

                  {q.rubricCriteria.length > 0 && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Rubric criteria</p>
                        <span className={`text-xs font-medium ${mismatch ? "text-destructive" : "text-success"}`}>
                          {rubricTotal} / {q.marks} marks allocated
                        </span>
                      </div>
                      {q.rubricCriteria.map(c => (
                        <div key={c.id} className="grid gap-2 rounded-lg bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_90px_auto]">
                          <Input value={c.name} onChange={e => updateCriterion(q.id, c.id, { name: e.target.value })} placeholder="Criterion" />
                          <Input value={c.expectedConcept || c.description} onChange={e => updateCriterion(q.id, c.id, { expectedConcept: e.target.value, description: e.target.value })} placeholder="Expected concept" />
                          <Input type="number" value={c.maxScore} onChange={e => updateCriterion(q.id, c.id, { maxScore: Number(e.target.value) })} />
                          <Button variant="ghost" size="icon" onClick={() => removeCriterion(q.id, c.id)} aria-label="Remove criterion">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => addCriterion(q.id)}>Add criterion</Button>
                        <Button size="sm" disabled={mismatch || q.rubricApproved} onClick={() => updateQuestion(q.id, { rubricApproved: true })}>
                          <CheckCircle className="mr-2 h-4 w-4" /> {q.rubricApproved ? "Rubric approved" : "Approve rubric"}
                        </Button>
                      </div>
                      {q.modelAnswer && (
                        <div>
                          <Label className="text-xs">Model answer</Label>
                          <Textarea rows={3} value={q.modelAnswer} onChange={e => updateQuestion(q.id, { modelAnswer: e.target.value })} className="resize-none" />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Button onClick={savePaper} size="lg" className="w-full gradient-accent border-0 text-accent-foreground">
            <CheckCircle className="mr-2 h-4 w-4" /> Save Approved Question Paper
          </Button>
        </>
      )}
    </div>
  );
};

export default QuestionPaperProcessing;
