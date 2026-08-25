import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Save, Inbox } from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const ReviewQueue: React.FC = () => {
  const { reviewQueue, resolveReviewItem } = useEvaluation();
  const [drafts, setDrafts] = useState<Record<string, { marks: string; comment: string }>>({});

  const pending = reviewQueue.filter(r => r.status === "pending");
  const resolved = reviewQueue.filter(r => r.status !== "pending");

  const draftFor = (id: string, aiMarks: number) => drafts[id] || { marks: String(aiMarks), comment: "" };

  const submit = (id: string, maxMarks: number, aiMarks: number, action: "accepted" | "modified") => {
    const d = draftFor(id, aiMarks);
    const marks = action === "accepted" ? aiMarks : Number(d.marks);
    if (Number.isNaN(marks) || marks < 0 || marks > maxMarks) {
      toast.error(`Final marks must be between 0 and ${maxMarks}`);
      return;
    }
    resolveReviewItem(id, marks, d.comment, action);
    toast.success(action === "accepted" ? "AI evaluation accepted" : "Evaluation modified and saved");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Teacher Review Queue</h1>
        <p className="mt-1 text-muted-foreground">
          Low-confidence evaluations routed for human review. Accept the AI marks or modify them before they become final.
        </p>
      </div>

      {pending.length === 0 && resolved.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No cases in the queue. Low-confidence evaluations from Students &amp; Answers appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}

      {pending.map(item => {
        const d = draftFor(item.id, item.aiMarks);
        return (
          <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-card border-destructive/30">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="font-heading text-base">
                    {item.studentName} ({item.rollNumber}) · Q{item.questionNumber}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    {item.module && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{item.module}</span>}
                    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" /> {item.confidenceLevel} confidence ({Math.round(item.confidenceScore * 100)}%)
                    </span>
                  </div>
                </div>
                <CardDescription>{item.examTitle} — {item.questionText}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Recognized answer text</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{item.extractedText || "(no text extracted)"}</p>
                </div>

                <div className="space-y-2">
                  {item.criterionScores.map((c, i) => (
                    <div key={c.criterionId || i} className="rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{c.criterionName}</p>
                        <span className="text-sm font-semibold text-foreground">{c.score} / {c.maxScore}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.feedback}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">{item.explanation}</p>
                <p className="text-sm font-semibold text-accent">AI marks: {item.aiMarks} / {item.maxMarks}</p>

                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div>
                    <Label className="text-xs">Final marks</Label>
                    <Input
                      type="number" min={0} max={item.maxMarks} value={d.marks}
                      onChange={e => setDrafts(prev => ({ ...prev, [item.id]: { ...d, marks: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Teacher comment</Label>
                    <Textarea
                      rows={2} value={d.comment} className="resize-none"
                      placeholder="Reason for accepting or modifying"
                      onChange={e => setDrafts(prev => ({ ...prev, [item.id]: { ...d, comment: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => submit(item.id, item.maxMarks, item.aiMarks, "accepted")}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Accept AI Evaluation
                  </Button>
                  <Button variant="outline" onClick={() => submit(item.id, item.maxMarks, item.aiMarks, "modified")}>
                    <Save className="mr-2 h-4 w-4" /> Save Modified Marks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {resolved.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Reviewed Cases</CardTitle>
            <CardDescription>{resolved.length} finalized by the teacher</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolved.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 p-3 text-sm">
                <span className="text-foreground">{r.studentName} · Q{r.questionNumber} · {r.examTitle}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success capitalize">{r.status}</span>
                  <span className="font-semibold text-foreground">{r.finalMarks} / {r.maxMarks}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReviewQueue;
