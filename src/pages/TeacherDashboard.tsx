import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, BookOpen, Users, ClipboardCheck, Award, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ExamQuestion, RubricCriterion } from "@/types/evaluation";

const TeacherDashboard: React.FC = () => {
  const { exams, submissions, evaluations, evaluateSubmission } = useEvaluation();
  const [evaluating, setEvaluating] = useState<string | null>(null);

  const pendingCount = submissions.filter(s => !s.evaluated).length;
  const avgScore = evaluations.length ? Math.round(evaluations.reduce((s, e) => s + e.percentage, 0) / evaluations.length) : 0;

  const handleEvaluate = async (id: string) => {
    setEvaluating(id);
    await evaluateSubmission(id);
    setEvaluating(null);
  };

  const stats = [
    { label: "Exams", value: exams.length, icon: FileText, color: "bg-accent" },
    { label: "Submissions", value: submissions.length, icon: Users, color: "gradient-warm" },
    { label: "Evaluated", value: evaluations.length, icon: ClipboardCheck, color: "bg-success" },
    { label: "Avg Score", value: evaluations.length ? `${avgScore}%` : "—", icon: Award, color: "bg-info" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Teacher Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Create exams, manage submissions, and review AI evaluations</p>
        </div>
        <div className="flex gap-2">
          <Link to="/teacher-evaluate">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> Upload & Evaluate
            </Button>
          </Link>
          <CreateExamDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Exams list */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Exam Papers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam, i) => {
            const examSubs = submissions.filter(s => s.examId === exam.id);
            const examEvals = evaluations.filter(e => e.examId === exam.id);
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-heading text-lg">{exam.title}</CardTitle>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{exam.subject}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{exam.questions.length} questions</span>
                      <span>{exam.totalMarks} marks</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exam.questions.map(q => (
                        <span key={q.id} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Q{q.questionNumber}: {q.marks}pts
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">{examSubs.length} submissions</span>
                      <span className="text-sm text-muted-foreground">{examEvals.length} evaluated</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Submissions table */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">All Submissions</h2>
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Exam</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => {
                    const exam = exams.find(e => e.id === sub.examId);
                    const evaluation = evaluations.find(e => e.submissionId === sub.id);
                    return (
                      <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{sub.studentName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{exam?.title ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.evaluated ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                            {sub.evaluated ? "Evaluated" : "Pending"}
                          </span>
                          {evaluation?.teacherReviewed && (
                            <span className="ml-1 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                              Reviewed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{evaluation ? `${evaluation.totalScore}/${evaluation.totalPossible}` : "—"}</td>
                        <td className="px-4 py-3">
                          {evaluation && (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${evaluation.percentage >= 80 ? "bg-success/10 text-success" : evaluation.percentage >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                              {evaluation.grade}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          {!sub.evaluated && (
                            <Button size="sm" variant="outline" onClick={() => handleEvaluate(sub.id)} disabled={evaluating === sub.id}>
                              {evaluating === sub.id ? "Evaluating..." : "Evaluate"}
                            </Button>
                          )}
                          {evaluation && (
                            <Link to={`/results?id=${sub.id}`} className="text-sm font-medium text-accent hover:underline leading-8">
                              View Results →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ── Create Exam Dialog ── */

interface DraftQuestion {
  questionText: string;
  modelAnswer: string;
  marks: number;
  criteria: { name: string; description: string; maxScore: number }[];
}

const emptyDraftQuestion = (): DraftQuestion => ({
  questionText: "", modelAnswer: "", marks: 10,
  criteria: [{ name: "", description: "", maxScore: 5 }],
});

const CreateExamDialog: React.FC = () => {
  const { addExam } = useEvaluation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([emptyDraftQuestion()]);

  const updateQ = (qi: number, field: keyof DraftQuestion, value: unknown) =>
    setDraftQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));

  const updateCriterion = (qi: number, ci: number, field: string, value: string | number) =>
    setDraftQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, criteria: q.criteria.map((c, j) => j === ci ? { ...c, [field]: value } : c) } : q
    ));

  const addCriterion = (qi: number) =>
    setDraftQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, criteria: [...q.criteria, { name: "", description: "", maxScore: 5 }] } : q
    ));

  const removeCriterion = (qi: number, ci: number) =>
    setDraftQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, criteria: q.criteria.filter((_, j) => j !== ci) } : q
    ));

  const handleSubmit = () => {
    if (!title || !subject || draftQuestions.some(q => !q.questionText || !q.modelAnswer || q.criteria.some(c => !c.name))) return;
    const questions: ExamQuestion[] = draftQuestions.map((dq, i) => ({
      id: crypto.randomUUID(),
      questionNumber: i + 1,
      questionText: dq.questionText,
      modelAnswer: dq.modelAnswer,
      marks: dq.marks,
      rubricCriteria: dq.criteria.map(c => ({ id: crypto.randomUUID(), ...c })),
    }));
    addExam({ title, subject, questions });
    setOpen(false);
    setTitle(""); setSubject(""); setDraftQuestions([emptyDraftQuestion()]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-accent text-accent-foreground border-0">
          <Plus className="mr-2 h-4 w-4" /> New Exam
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create Exam Paper</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Exam Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology Mid-Term" /></div>
            <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" /></div>
          </div>

          {draftQuestions.map((dq, qi) => (
            <Card key={qi} className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-base">Question {qi + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Marks:</Label>
                    <Input type="number" className="w-16 h-8" value={dq.marks} onChange={e => updateQ(qi, "marks", +e.target.value)} />
                    {draftQuestions.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDraftQuestions(prev => prev.filter((_, i) => i !== qi))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="Question text..." value={dq.questionText} onChange={e => updateQ(qi, "questionText", e.target.value)} rows={2} />
                <Textarea placeholder="Model answer..." value={dq.modelAnswer} onChange={e => updateQ(qi, "modelAnswer", e.target.value)} rows={3} />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Rubric Criteria</Label>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addCriterion(qi)}><Plus className="mr-1 h-3 w-3" />Add</Button>
                  </div>
                  {dq.criteria.map((c, ci) => (
                    <div key={ci} className="flex gap-2 items-center mb-2">
                      <Input placeholder="Criterion" value={c.name} onChange={e => updateCriterion(qi, ci, "name", e.target.value)} className="h-8 text-sm" />
                      <Input type="number" className="w-16 h-8" value={c.maxScore} onChange={e => updateCriterion(qi, ci, "maxScore", +e.target.value)} />
                      {dq.criteria.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeCriterion(qi, ci)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={() => setDraftQuestions(prev => [...prev, emptyDraftQuestion()])}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>

          <Button onClick={handleSubmit} className="w-full gradient-accent text-accent-foreground border-0">
            Create Exam ({draftQuestions.reduce((s, q) => s + q.marks, 0)} total marks)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherDashboard;
