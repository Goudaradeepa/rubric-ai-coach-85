import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Lightbulb, Target, TrendingUp, ChevronDown, ChevronUp, FileText, Image, Eye } from "lucide-react";
import { useEvaluation } from "@/context/EvaluationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const EvaluationResults: React.FC = () => {
  const { evaluations, submissions } = useEvaluation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id") || (evaluations[0]?.submissionId ?? "");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const evaluation = evaluations.find(e => e.submissionId === selectedId);
  const submission = submissions.find(s => s.id === selectedId);

  const getScoreColor = (pct: number) =>
    pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-destructive";
  const getBarColor = (pct: number) =>
    pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-destructive";
  const getGradeColor = (pct: number) =>
    pct >= 80 ? "bg-success/10 text-success" : pct >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Evaluation Results</h1>
          <p className="mt-1 text-muted-foreground">Detailed per-question AI analysis and feedback</p>
        </div>
        <Select value={selectedId} onValueChange={v => setSearchParams({ id: v })}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select submission" /></SelectTrigger>
          <SelectContent>
            {submissions.filter(s => s.evaluated).map(s => {
              const ev = evaluations.find(e => e.submissionId === s.id);
              return (
                <SelectItem key={s.id} value={s.id}>
                  {s.studentName} — {ev?.examTitle ?? ""}
                  {s.submissionType === "scanned" && " 📄"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {evaluation ? (
        <div className="space-y-6">
          {/* Overall scores */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total Score", value: `${evaluation.totalScore}/${evaluation.totalPossible}`, sub: `${evaluation.percentage}%`, color: getScoreColor(evaluation.percentage) },
              { label: "Grade", value: evaluation.grade, sub: evaluation.examTitle, color: getScoreColor(evaluation.percentage) },
              { label: "Questions", value: evaluation.questionEvaluations.length, sub: "evaluated", color: "text-accent" },
              { label: "Misconceptions", value: evaluation.overallMisconceptions.length, sub: evaluation.overallMisconceptions.length === 0 ? "None found" : "Review needed", color: evaluation.overallMisconceptions.length === 0 ? "text-success" : "text-warning" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="shadow-card text-center">
                  <CardContent className="pt-6 pb-4">
                    <p className={`text-4xl font-bold font-heading ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                    <p className="text-sm font-medium text-foreground mt-2">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Scanned answer sheet info */}
          {submission?.submissionType === "scanned" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" /> Scanned Answer Sheet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="text">
                    <TabsList>
                      <TabsTrigger value="text">Extracted Text</TabsTrigger>
                      {submission.answerSheetUrl && <TabsTrigger value="preview">Sheet Preview</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="text" className="mt-3">
                      <div className="rounded-lg border border-border bg-muted/20 p-4 max-h-64 overflow-y-auto">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                          {submission.ocrFullText || "No extracted text available"}
                        </p>
                      </div>
                      {submission.ocrExtractedAnswers && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {submission.ocrExtractedAnswers.map(a => (
                            <Badge key={a.questionNumber} variant="secondary" className="text-xs">
                              Q{a.questionNumber}: {Math.round(a.confidence * 100)}% confidence
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    {submission.answerSheetUrl && (
                      <TabsContent value="preview" className="mt-3">
                        <div className="rounded-lg border border-border overflow-hidden">
                          <img src={submission.answerSheetUrl} alt="Answer sheet" className="w-full max-h-96 object-contain bg-muted/20" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          File: {submission.answerSheetFileName}
                        </p>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Performance summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" /> Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{evaluation.performanceSummary}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-success mb-2">✓ Strengths</h4>
                    <ul className="space-y-1">{evaluation.strengths.map((s, i) => <li key={i} className="text-sm text-muted-foreground">• {s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-warning mb-2">⚠ Areas for Improvement</h4>
                    <ul className="space-y-1">{evaluation.weaknesses.map((w, i) => <li key={i} className="text-sm text-muted-foreground">• {w}</li>)}</ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Per-question breakdown */}
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Question-by-Question Results</h2>
            <div className="space-y-3">
              {evaluation.questionEvaluations.map((qe, i) => {
                const isExpanded = expandedQ === qe.questionId;
                return (
                  <motion.div key={qe.questionId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                    <Card className="shadow-card">
                      <button className="w-full text-left" onClick={() => setExpandedQ(isExpanded ? null : qe.questionId)}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${getGradeColor(qe.percentage)}`}>
                              Q{qe.questionNumber}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground line-clamp-1">{qe.questionText}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{qe.feedback}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-lg font-bold font-heading ${getScoreColor(qe.percentage)}`}>{qe.score}/{qe.maxMarks}</p>
                              <p className="text-xs text-muted-foreground">{qe.percentage}% · Sim {Math.round(qe.semanticSimilarity * 100)}%</p>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </CardContent>
                      </button>

                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border">
                          <CardContent className="pt-4 space-y-4">
                            {/* Criterion scores */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Target className="h-4 w-4 text-accent" /> Rubric Breakdown
                              </h4>
                              {qe.criterionScores.map(cs => {
                                const cPct = Math.round((cs.score / cs.maxScore) * 100);
                                return (
                                  <div key={cs.criterionId} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{cs.criterionName}</span>
                                      <span className={`font-medium ${getScoreColor(cPct)}`}>{cs.score}/{cs.maxScore}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted">
                                      <div className={`h-1.5 rounded-full ${getBarColor(cPct)}`} style={{ width: `${cPct}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{cs.feedback}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Detected & Missing Concepts */}
                            {(qe.detectedConcepts?.length || qe.missingConcepts?.length) ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {qe.detectedConcepts && qe.detectedConcepts.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-success flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4" /> Detected Concepts
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {qe.detectedConcepts.map((c, ci) => (
                                        <Badge key={ci} variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">{c}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {qe.missingConcepts && qe.missingConcepts.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4" /> Missing Concepts
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {qe.missingConcepts.map((c, ci) => (
                                        <Badge key={ci} variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{c}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {/* Misconceptions */}
                            {qe.misconceptions.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-warning flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" /> Misconceptions
                                </h4>
                                {qe.misconceptions.map((m, mi) => (
                                  <div key={mi} className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                                    <p className="text-sm font-medium text-foreground">{m.topic}</p>
                                    <p className="text-xs text-muted-foreground">{m.description}</p>
                                    <p className="text-xs text-accent mt-1">💡 {m.suggestion}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <p className="text-muted-foreground">Select a submission to view detailed evaluation results.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EvaluationResults;
