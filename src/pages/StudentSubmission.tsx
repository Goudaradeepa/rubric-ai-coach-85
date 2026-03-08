import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const StudentSubmission: React.FC = () => {
  const { exams, addSubmission } = useEvaluation();
  const [selectedExam, setSelectedExam] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const exam = exams.find(e => e.id === selectedExam);

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    setAnswers({});
  };

  const handleSubmit = () => {
    if (!selectedExam || !studentName || !studentEmail) {
      toast.error("Please fill in all fields");
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
          <Button onClick={() => { setSubmitted(false); setAnswers({}); setSelectedExam(""); }} variant="outline">
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
        <p className="mt-1 text-muted-foreground">Select an exam and answer all questions for AI evaluation</p>
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
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{q.marks} marks</span>
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
                    placeholder="Write your answer here..."
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
