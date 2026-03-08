import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Upload, FileText, Image, Loader2, X } from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const StudentSubmission: React.FC = () => {
  const { exams, addSubmission } = useEvaluation();
  const [selectedExam, setSelectedExam] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<"typed" | "scanned">("typed");

  // Scanned upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrFullText, setOcrFullText] = useState("");
  const [ocrAnswers, setOcrAnswers] = useState<{ questionNumber: number; extractedText: string; confidence: number }[]>([]);
  const [ocrDone, setOcrDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exam = exams.find(e => e.id === selectedExam);

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    setAnswers({});
    setOcrAnswers([]);
    setOcrFullText("");
    setOcrDone(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please upload a PDF, JPG, or PNG file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }
    setUploadedFile(file);
    setOcrDone(false);
    setOcrAnswers([]);
    setOcrFullText("");

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadPreview(null);
    setOcrDone(false);
    setOcrAnswers([]);
    setOcrFullText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtractOCR = async () => {
    if (!uploadedFile || !exam) return;
    setIsExtracting(true);
    try {
      // Upload file to storage
      const fileName = `${Date.now()}-${uploadedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("answer-sheets")
        .upload(fileName, uploadedFile, { contentType: uploadedFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("answer-sheets").getPublicUrl(uploadData.path);
      const fileUrl = urlData.publicUrl;

      // Call OCR edge function
      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: {
          fileUrl,
          mimeType: uploadedFile.type,
          questionCount: exam.questions.length,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOcrFullText(data.fullText || "");
      setOcrAnswers(data.answers || []);
      setOcrDone(true);

      // Auto-map OCR answers to exam questions
      const newAnswers: Record<string, string> = {};
      exam.questions.forEach(q => {
        const ocrA = data.answers?.find((a: any) => a.questionNumber === q.questionNumber);
        if (ocrA) newAnswers[q.id] = ocrA.extractedText;
      });
      setAnswers(newAnswers);

      toast.success(`Extracted text for ${data.answers?.length || 0} questions`);
    } catch (err: any) {
      console.error("OCR extraction failed:", err);
      toast.error(err.message || "OCR extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedExam || !studentName || !studentEmail) {
      toast.error("Please fill in all fields");
      return;
    }
    if (submissionMode === "scanned" && !ocrDone) {
      toast.error("Please extract text from your answer sheet first");
      return;
    }
    if (exam && exam.questions.some(q => !answers[q.id]?.trim())) {
      toast.error("Please answer all questions");
      return;
    }

    addSubmission({
      examId: selectedExam,
      studentName,
      studentEmail,
      answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      submissionType: submissionMode,
      answerSheetUrl: submissionMode === "scanned" ? uploadPreview || undefined : undefined,
      answerSheetFileName: submissionMode === "scanned" ? uploadedFile?.name : undefined,
      ocrFullText: submissionMode === "scanned" ? ocrFullText : undefined,
      ocrExtractedAnswers: submissionMode === "scanned" ? ocrAnswers : undefined,
    });
    setSubmitted(true);
    toast.success("Exam submitted successfully!");
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Exam Submitted!</h2>
          <p className="text-muted-foreground">Your answers have been received and will be evaluated by AI.</p>
          <Button onClick={() => { setSubmitted(false); setAnswers({}); setSelectedExam(""); handleRemoveFile(); }} variant="outline">
            Submit Another Exam
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Submit Exam Answers</h1>
        <p className="mt-1 text-muted-foreground">Type your answers or upload a scanned answer sheet</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full Name</Label><Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Your name" /></div>
              <div><Label>Email</Label><Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="your@email.com" /></div>
            </div>
            <div>
              <Label>Select Exam</Label>
              <Select value={selectedExam} onValueChange={handleExamChange}>
                <SelectTrigger><SelectValue placeholder="Choose an exam..." /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.title} ({e.totalMarks} marks)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {exam && (
        <div className="space-y-4">
          <Tabs value={submissionMode} onValueChange={v => setSubmissionMode(v as "typed" | "scanned")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="typed" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Type Answers
              </TabsTrigger>
              <TabsTrigger value="scanned" className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload Answer Sheet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanned" className="space-y-4 mt-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading text-base">Upload Scanned Answer Sheet</CardTitle>
                  <CardDescription>Upload a PDF, JPG, or PNG of your handwritten answers</CardDescription>
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
                          {uploadedFile.type.startsWith("image/") ? (
                            <Image className="h-8 w-8 text-accent" />
                          ) : (
                            <FileText className="h-8 w-8 text-accent" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {uploadPreview && (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <img src={uploadPreview} alt="Answer sheet preview" className="w-full max-h-96 object-contain bg-muted/20" />
                        </div>
                      )}

                      <Button
                        onClick={handleExtractOCR}
                        disabled={isExtracting || ocrDone}
                        className="w-full gradient-accent text-accent-foreground border-0"
                      >
                        {isExtracting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting Text with AI...</>
                        ) : ocrDone ? (
                          <><CheckCircle className="mr-2 h-4 w-4" /> Text Extracted Successfully</>
                        ) : (
                          <><FileText className="mr-2 h-4 w-4" /> Extract Text (OCR)</>
                        )}
                      </Button>
                    </div>
                  )}

                  {ocrDone && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Full Extracted Text</h4>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">{ocrFullText}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="typed" className="mt-4" />
          </Tabs>

          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-foreground">{exam.title}</h2>
            <span className="text-sm text-muted-foreground">{exam.questions.length} questions · {exam.totalMarks} marks</span>
          </div>

          {exam.questions.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-base">Question {q.questionNumber}</CardTitle>
                    <div className="flex items-center gap-2">
                      {submissionMode === "scanned" && ocrAnswers.find(a => a.questionNumber === q.questionNumber) && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          OCR {Math.round((ocrAnswers.find(a => a.questionNumber === q.questionNumber)?.confidence || 0) * 100)}%
                        </span>
                      )}
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{q.marks} marks</span>
                    </div>
                  </div>
                  <CardDescription>{q.questionText}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {q.rubricCriteria.map(c => (
                      <span key={c.id} className="text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">
                        {c.name}: {c.maxScore}pts
                      </span>
                    ))}
                  </div>
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={submissionMode === "scanned" ? "Extracted text will appear here (editable)" : "Write your answer here..."}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{(answers[q.id] || "").length} characters</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <Button onClick={handleSubmit} className="w-full gradient-accent text-accent-foreground border-0" size="lg">
            <Send className="mr-2 h-4 w-4" /> Submit All Answers
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentSubmission;
