import React from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Lightbulb, Target, TrendingUp } from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EvaluationResults: React.FC = () => {
  const { results, submissions } = useEvaluation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id") || (results[0]?.submissionId ?? "");

  const result = results.find(r => r.submissionId === selectedId);

  const getScoreColor = (pct: number) =>
    pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive";

  const getScoreBarColor = (pct: number) =>
    pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Evaluation Results</h1>
          <p className="mt-1 text-muted-foreground">AI-powered detailed analysis and feedback</p>
        </div>
        <Select value={selectedId} onValueChange={v => setSearchParams({ id: v })}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select submission" /></SelectTrigger>
          <SelectContent>
            {submissions.filter(s => s.evaluated).map(s => (
              <SelectItem key={s.id} value={s.id}>{s.studentName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {result ? (
        <div className="space-y-6">
          {/* Score overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card text-center">
                <CardContent className="pt-6">
                  <div className={`text-5xl font-bold font-heading ${getScoreColor(result.percentage)}`}>
                    {result.percentage}%
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{result.overallScore}/{result.totalPossible} points</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{result.studentName}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="shadow-card text-center">
                <CardContent className="pt-6">
                  <div className="text-5xl font-bold font-heading text-accent">
                    {Math.round(result.semanticSimilarity * 100)}%
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Semantic Similarity</p>
                  <p className="mt-2 text-sm text-muted-foreground">vs. Model Answer</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="shadow-card text-center">
                <CardContent className="pt-6">
                  <div className={`text-5xl font-bold font-heading ${result.misconceptions.length === 0 ? "text-success" : "text-warning"}`}>
                    {result.misconceptions.length}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Misconceptions Found</p>
                  <p className="mt-2 text-sm text-muted-foreground">{result.misconceptions.length === 0 ? "Great understanding!" : "Review needed"}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Criterion scores */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" /> Rubric Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {result.criterionScores.map(cs => {
                  const pct = Math.round((cs.score / cs.maxScore) * 100);
                  return (
                    <div key={cs.criterionId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{cs.criterionName}</span>
                        <span className={`text-sm font-bold ${getScoreColor(pct)}`}>{cs.score}/{cs.maxScore}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={`h-2 rounded-full transition-all ${getScoreBarColor(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{cs.feedback}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Feedback and misconceptions */}
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="shadow-card h-full">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" /> Overall Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{result.overallFeedback}</p>
                  {result.misconceptions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-warning">
                        <AlertTriangle className="h-4 w-4" /> Misconceptions Detected
                      </h4>
                      {result.misconceptions.map((m, i) => (
                        <div key={i} className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                          <p className="text-sm font-medium text-foreground">{m.topic}</p>
                          <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                          <p className="text-xs text-accent mt-1">💡 {m.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="shadow-card h-full">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-warning" /> Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.improvementSuggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                          {i + 1}
                        </span>
                        <p className="text-sm text-muted-foreground">{s}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <p className="text-muted-foreground">Select a submission to view evaluation results.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EvaluationResults;
