import React from "react";
import { motion } from "framer-motion";
import { useEvaluation } from "@/context/EvaluationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend,
} from "recharts";

const COLORS = ["hsl(174, 60%, 40%)", "hsl(222, 60%, 22%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)"];

const PerformanceAnalytics: React.FC = () => {
  const { evaluations, exams, submissions } = useEvaluation();

  // --- Score Distribution ---
  const distribution = [
    { range: "0-20%", count: evaluations.filter(e => e.percentage <= 20).length },
    { range: "21-40%", count: evaluations.filter(e => e.percentage > 20 && e.percentage <= 40).length },
    { range: "41-60%", count: evaluations.filter(e => e.percentage > 40 && e.percentage <= 60).length },
    { range: "61-80%", count: evaluations.filter(e => e.percentage > 60 && e.percentage <= 80).length },
    { range: "81-100%", count: evaluations.filter(e => e.percentage > 80).length },
  ];

  // --- Exam Averages ---
  const examAvgs = exams.map(ex => {
    const exEvals = evaluations.filter(e => e.examId === ex.id);
    const avg = exEvals.length ? Math.round(exEvals.reduce((s, e) => s + e.percentage, 0) / exEvals.length) : 0;
    return { name: ex.title.slice(0, 18), average: avg, students: exEvals.length };
  });

  // --- Grade Breakdown ---
  const grades = [
    { name: "A/A+ (80-100%)", value: evaluations.filter(e => e.percentage >= 80).length },
    { name: "B (70-79%)", value: evaluations.filter(e => e.percentage >= 70 && e.percentage < 80).length },
    { name: "C (60-69%)", value: evaluations.filter(e => e.percentage >= 60 && e.percentage < 70).length },
    { name: "D/F (<60%)", value: evaluations.filter(e => e.percentage < 60).length },
  ].filter(g => g.value > 0);

  // --- Question-wise Performance (Radar) ---
  const qPerfMap = new Map<string, { total: number; count: number; label: string }>();
  evaluations.forEach(ev => ev.questionEvaluations.forEach(qe => {
    const key = `Q${qe.questionNumber}`;
    const prev = qPerfMap.get(key) || { total: 0, count: 0, label: key };
    qPerfMap.set(key, { total: prev.total + qe.percentage, count: prev.count + 1, label: key });
  }));
  const radarData = Array.from(qPerfMap.entries()).map(([, v]) => ({
    question: v.label,
    score: Math.round(v.total / v.count),
  }));

  // --- Rubric Performance (new) ---
  const rubricMap = new Map<string, { total: number; max: number; count: number }>();
  evaluations.forEach(ev => ev.questionEvaluations.forEach(qe => {
    qe.criterionScores.forEach(cs => {
      const prev = rubricMap.get(cs.criterionName) || { total: 0, max: 0, count: 0 };
      rubricMap.set(cs.criterionName, {
        total: prev.total + cs.score,
        max: prev.max + cs.maxScore,
        count: prev.count + 1,
      });
    });
  }));
  const rubricData = Array.from(rubricMap.entries()).map(([name, v]) => ({
    name: name.length > 16 ? name.slice(0, 16) + "…" : name,
    fullName: name,
    avgPercent: Math.round((v.total / v.max) * 100),
    avgScore: Math.round((v.total / v.count) * 10) / 10,
  })).sort((a, b) => b.avgPercent - a.avgPercent);

  // --- Question Difficulty (new) ---
  const questionDifficulty = Array.from(qPerfMap.entries())
    .map(([key, v]) => ({
      question: v.label,
      avgScore: Math.round(v.total / v.count),
      attempts: v.count,
      difficulty: v.total / v.count < 50 ? "Hard" : v.total / v.count < 70 ? "Medium" : "Easy",
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  // --- Top Performing Students (new) ---
  const studentScores = new Map<string, { total: number; count: number; name: string }>();
  evaluations.forEach(ev => {
    const prev = studentScores.get(ev.studentEmail) || { total: 0, count: 0, name: ev.studentName };
    studentScores.set(ev.studentEmail, {
      total: prev.total + ev.percentage,
      count: prev.count + 1,
      name: ev.studentName,
    });
  });
  const topStudents = Array.from(studentScores.entries())
    .map(([email, v]) => ({
      name: v.name,
      email,
      avgScore: Math.round(v.total / v.count),
      examsCount: v.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  // --- Student Performance line chart ---
  const studentPerf = evaluations.map(e => ({
    name: e.studentName.split(" ")[0],
    score: e.percentage,
    similarity: Math.round(e.questionEvaluations.reduce((s, q) => s + q.semanticSimilarity, 0) / e.questionEvaluations.length * 100),
  }));

  // --- Summary stats ---
  const avgScore = evaluations.length ? Math.round(evaluations.reduce((s, e) => s + e.percentage, 0) / evaluations.length) : 0;
  const totalMisconceptions = evaluations.reduce((s, e) => s + e.overallMisconceptions.length, 0);
  const passRate = evaluations.length ? Math.round(evaluations.filter(e => e.percentage >= 50).length / evaluations.length * 100) : 0;
  const scannedCount = submissions.filter(s => s.submissionType === "scanned").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Performance Analytics</h1>
        <p className="mt-1 text-muted-foreground">Insights across all exams and students</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Average Score", value: `${avgScore}%`, color: "bg-accent" },
          { label: "Pass Rate", value: `${passRate}%`, color: "bg-success" },
          { label: "Evaluations", value: evaluations.length, color: "gradient-primary" },
          { label: "Misconceptions", value: totalMisconceptions, color: "gradient-warm" },
          { label: "Scanned Sheets", value: scannedCount, color: "bg-info" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className={`mb-2 h-1.5 w-12 rounded-full ${stat.color}`} />
                <p className="text-2xl font-bold font-heading text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Score Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Score Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" />
                  <XAxis dataKey="range" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(174, 60%, 40%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Grade Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Grade Breakdown</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={grades} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {grades.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rubric Performance (NEW) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Rubric Criteria Performance</CardTitle></CardHeader>
            <CardContent>
              {rubricData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={rubricData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
                    <Tooltip formatter={(val: number) => `${val}%`} />
                    <Bar dataKey="avgPercent" fill="hsl(222, 60%, 22%)" radius={[0, 6, 6, 0]} name="Avg %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No rubric data available yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Question Difficulty (NEW) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Question Difficulty Analysis</CardTitle></CardHeader>
            <CardContent>
              {questionDifficulty.length > 0 ? (
                <div className="space-y-3">
                  {questionDifficulty.map(q => {
                    const diffColor = q.difficulty === "Hard" ? "bg-destructive" : q.difficulty === "Medium" ? "bg-warning" : "bg-success";
                    const diffTextColor = q.difficulty === "Hard" ? "text-destructive" : q.difficulty === "Medium" ? "text-warning" : "text-success";
                    return (
                      <div key={q.question} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{q.question}</span>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diffColor}/10 ${diffTextColor}`}>
                              {q.difficulty}
                            </span>
                            <span className="text-muted-foreground">{q.avgScore}% avg</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${diffColor}`}
                            style={{ width: `${q.avgScore}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No question data available yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Question-wise Performance Radar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Question-wise Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(220, 16%, 88%)" />
                  <PolarAngleAxis dataKey="question" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="hsl(174, 60%, 40%)" fill="hsl(174, 60%, 40%)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score vs Semantic Similarity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Score vs Semantic Similarity</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={studentPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(222, 60%, 22%)" strokeWidth={2} dot={{ r: 4 }} name="Score %" />
                  <Line type="monotone" dataKey="similarity" stroke="hsl(174, 60%, 40%)" strokeWidth={2} dot={{ r: 4 }} name="Similarity %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Exam Averages */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">Exam Averages</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={examAvgs}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                <Tooltip />
                <Bar dataKey="average" fill="hsl(222, 60%, 22%)" radius={[6, 6, 0, 0]} name="Avg %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Performing Students (NEW) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">🏆 Top Performing Students</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Exams</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.map((s, i) => (
                  <tr key={s.email} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "gradient-warm text-primary-foreground" : i === 1 ? "bg-muted-foreground/20 text-foreground" : i === 2 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.examsCount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${s.avgScore >= 80 ? "text-success" : s.avgScore >= 60 ? "text-warning" : "text-destructive"}`}>
                        {s.avgScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Full Student Rankings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">All Evaluation Rankings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Exam</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Grade</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Misconceptions</th>
                </tr>
              </thead>
              <tbody>
                {[...evaluations].sort((a, b) => b.percentage - a.percentage).map((e, i) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "gradient-warm text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{e.studentName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.examTitle}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: e.percentage >= 80 ? "hsl(152, 60%, 40%)" : e.percentage >= 60 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)" }}>
                      {e.totalScore}/{e.totalPossible} ({e.percentage}%)
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.percentage >= 80 ? "bg-success/10 text-success" : e.percentage >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{e.grade}</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.overallMisconceptions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PerformanceAnalytics;
