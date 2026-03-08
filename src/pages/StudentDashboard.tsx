import React, { useState } from "react";
import { motion } from "framer-motion";
import { useEvaluation } from "@/context/EvaluationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Award, BookOpen, TrendingUp, AlertTriangle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const StudentDashboard: React.FC = () => {
  const { evaluations } = useEvaluation();
  const [email, setEmail] = useState("alice@school.edu");
  const [searchEmail, setSearchEmail] = useState("alice@school.edu");

  const studentEvals = evaluations.filter(e => e.studentEmail === searchEmail);

  const handleSearch = () => setSearchEmail(email);

  const avgScore = studentEvals.length ? Math.round(studentEvals.reduce((s, e) => s + e.percentage, 0) / studentEvals.length) : 0;
  const totalMisconceptions = studentEvals.reduce((s, e) => s + e.overallMisconceptions.length, 0);
  const bestGrade = studentEvals.length ? studentEvals.reduce((best, e) => e.percentage > best.percentage ? e : best).grade : "—";

  const chartData = studentEvals.map(e => ({
    exam: e.examTitle.slice(0, 15),
    score: e.percentage,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Student Dashboard</h1>
        <p className="mt-1 text-muted-foreground">View your exam results and performance history</p>
      </div>

      {/* Email lookup */}
      <Card className="shadow-card">
        <CardContent className="flex items-end gap-3 pt-6">
          <div className="flex-1">
            <Label>Student Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <Button onClick={handleSearch} className="gradient-accent text-accent-foreground border-0">
            <Search className="mr-2 h-4 w-4" /> Look Up
          </Button>
        </CardContent>
      </Card>

      {studentEvals.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Average Score", value: `${avgScore}%`, icon: TrendingUp, color: "bg-accent" },
              { label: "Exams Taken", value: studentEvals.length, icon: BookOpen, color: "gradient-primary" },
              { label: "Best Grade", value: bestGrade, icon: Award, color: "bg-success" },
              { label: "Misconceptions", value: totalMisconceptions, icon: AlertTriangle, color: "gradient-warm" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="shadow-card">
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

          {/* Score chart */}
          {chartData.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-heading text-base">Score Progression</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" />
                      <XAxis dataKey="exam" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="hsl(174, 60%, 40%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Results list */}
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Exam Results</h2>
            <div className="space-y-3">
              {studentEvals.map((ev, i) => (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                  <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${ev.percentage >= 80 ? "bg-success/10 text-success" : ev.percentage >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                          {ev.grade}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{ev.examTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {ev.totalScore}/{ev.totalPossible} marks · {ev.questionEvaluations.length} questions · {ev.overallMisconceptions.length} misconceptions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-2xl font-bold font-heading ${ev.percentage >= 80 ? "text-success" : ev.percentage >= 60 ? "text-warning" : "text-destructive"}`}>
                          {ev.percentage}%
                        </p>
                        <Link to={`/results?id=${ev.submissionId}`} className="text-sm font-medium text-accent hover:underline">
                          Details →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Card className="shadow-card">
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">No results found for this email. Try submitting an exam first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
