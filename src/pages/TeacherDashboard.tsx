import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, BookOpen, Users, ClipboardCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { RubricCriterion } from "@/types/evaluation";

const TeacherDashboard: React.FC = () => {
  const { questions, submissions, results } = useEvaluation();

  const stats = [
    { label: "Questions", value: questions.length, icon: BookOpen, color: "bg-accent" },
    { label: "Submissions", value: submissions.length, icon: Users, color: "gradient-warm" },
    { label: "Evaluated", value: results.length, icon: ClipboardCheck, color: "bg-success" },
    { label: "Avg Score", value: results.length ? `${Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)}%` : "—", icon: ChevronRight, color: "bg-info" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Teacher Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage questions, rubrics, and review submissions</p>
        </div>
        <CreateQuestionDialog />
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

      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Questions & Rubrics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {questions.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
              <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-lg">{q.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{q.questionText}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.rubricCriteria.map(c => (
                      <span key={c.id} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                        {c.name} ({c.maxScore}pts)
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {submissions.filter(s => s.questionId === q.id).length} submissions
                    </span>
                    <span className="text-sm font-medium text-foreground">{q.totalPoints} total pts</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">Recent Submissions</h2>
        </div>
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Question</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => {
                    const question = questions.find(q => q.id === sub.questionId);
                    const result = results.find(r => r.submissionId === sub.id);
                    return (
                      <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{sub.studentName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{question?.title ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.evaluated ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                            {sub.evaluated ? "Evaluated" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{result ? `${result.percentage}%` : "—"}</td>
                        <td className="px-4 py-3">
                          {result && (
                            <Link to={`/results?id=${sub.id}`} className="text-sm font-medium text-accent hover:underline">
                              View →
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

const CreateQuestionDialog: React.FC = () => {
  const { addQuestion } = useEvaluation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [criteria, setCriteria] = useState<Omit<RubricCriterion, "id">[]>([
    { name: "", description: "", maxScore: 10, weight: 1 },
  ]);

  const addCriterion = () => setCriteria(prev => [...prev, { name: "", description: "", maxScore: 10, weight: 1 }]);
  const removeCriterion = (i: number) => setCriteria(prev => prev.filter((_, idx) => idx !== i));
  const updateCriterion = (i: number, field: string, value: string | number) =>
    setCriteria(prev => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const handleSubmit = () => {
    if (!title || !questionText || !modelAnswer || criteria.some(c => !c.name)) return;
    addQuestion({
      title,
      questionText,
      modelAnswer,
      rubricCriteria: criteria.map(c => ({ ...c, id: crypto.randomUUID() })),
    });
    setOpen(false);
    setTitle("");
    setQuestionText("");
    setModelAnswer("");
    setCriteria([{ name: "", description: "", maxScore: 10, weight: 1 }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-accent text-accent-foreground border-0">
          <Plus className="mr-2 h-4 w-4" /> New Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create New Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Photosynthesis Process" />
          </div>
          <div>
            <Label>Question</Label>
            <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Enter the question..." rows={3} />
          </div>
          <div>
            <Label>Model Answer</Label>
            <Textarea value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder="Enter the ideal answer..." rows={4} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Rubric Criteria</Label>
              <Button variant="outline" size="sm" onClick={addCriterion}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {criteria.map((c, i) => (
                <div key={i} className="flex gap-2 items-start rounded-lg border border-border p-3">
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Criterion name" value={c.name} onChange={e => updateCriterion(i, "name", e.target.value)} />
                    <Input placeholder="Description" value={c.description} onChange={e => updateCriterion(i, "description", e.target.value)} />
                  </div>
                  <Input type="number" className="w-20" value={c.maxScore} onChange={e => updateCriterion(i, "maxScore", +e.target.value)} />
                  {criteria.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeCriterion(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full gradient-accent text-accent-foreground border-0">
            Create Question
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherDashboard;
