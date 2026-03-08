import React from "react";
import { motion } from "framer-motion";
import { useEvaluation } from "@/context/EvaluationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";

const COLORS = ["hsl(174, 60%, 40%)", "hsl(222, 60%, 22%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)"];

const PerformanceAnalytics: React.FC = () => {
  const { results, questions } = useEvaluation();

  // Score distribution
  const distribution = [
    { range: "0-20%", count: results.filter(r => r.percentage <= 20).length },
    { range: "21-40%", count: results.filter(r => r.percentage > 20 && r.percentage <= 40).length },
    { range: "41-60%", count: results.filter(r => r.percentage > 40 && r.percentage <= 60).length },
    { range: "61-80%", count: results.filter(r => r.percentage > 60 && r.percentage <= 80).length },
    { range: "81-100%", count: results.filter(r => r.percentage > 80).length },
  ];

  // Per-question averages
  const questionAvgs = questions.map(q => {
    const qResults = results.filter(r => r.questionId === q.id);
    const avg = qResults.length ? Math.round(qResults.reduce((s, r) => s + r.percentage, 0) / qResults.length) : 0;
    return { name: q.title.slice(0, 20), average: avg, count: qResults.length };
  });

  // Grade breakdown
  const grades = [
    { name: "A (80-100%)", value: results.filter(r => r.percentage >= 80).length },
    { name: "B (60-79%)", value: results.filter(r => r.percentage >= 60 && r.percentage < 80).length },
    { name: "C (40-59%)", value: results.filter(r => r.percentage >= 40 && r.percentage < 60).length },
    { name: "F (<40%)", value: results.filter(r => r.percentage < 40).length },
  ].filter(g => g.value > 0);

  // Criterion averages across all results (radar)
  const criteriaMap = new Map<string, { total: number; count: number; max: number }>();
  results.forEach(r => r.criterionScores.forEach(cs => {
    const prev = criteriaMap.get(cs.criterionName) || { total: 0, count: 0, max: cs.maxScore };
    criteriaMap.set(cs.criterionName, { total: prev.total + cs.score, count: prev.count + 1, max: cs.maxScore });
  }));
  const radarData = Array.from(criteriaMap.entries()).map(([name, v]) => ({
    criterion: name.slice(0, 15),
    score: Math.round((v.total / v.count / v.max) * 100),
  }));

  // Similarity vs Score scatter (line chart)
  const similarityData = results.map(r => ({
    name: r.studentName.split(" ")[0],
    similarity: Math.round(r.semanticSimilarity * 100),
    score: r.percentage,
  }));

  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : 0;
  const avgSimilarity = results.length ? Math.round(results.reduce((s, r) => s + r.semanticSimilarity, 0) / results.length * 100) : 0;
  const totalMisconceptions = results.reduce((s, r) => s + r.misconceptions.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Performance Analytics</h1>
        <p className="mt-1 text-muted-foreground">Insights and trends across all evaluations</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Average Score", value: `${avgScore}%`, color: "bg-accent" },
          { label: "Total Evaluations", value: results.length, color: "gradient-primary" },
          { label: "Avg Similarity", value: `${avgSimilarity}%`, color: "bg-info" },
          { label: "Misconceptions", value: totalMisconceptions, color: "gradient-warm" },
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

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Criteria Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(220, 16%, 88%)" />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="hsl(174, 60%, 40%)" fill="hsl(174, 60%, 40%)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading text-base">Score vs Semantic Similarity</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={similarityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(222, 60%, 22%)" strokeWidth={2} dot={{ r: 4 }} name="Score %" />
                  <Line type="monotone" dataKey="similarity" stroke="hsl(174, 60%, 40%)" strokeWidth={2} dot={{ r: 4 }} name="Similarity %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Student leaderboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading text-base">Student Rankings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Similarity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Misconceptions</th>
                </tr>
              </thead>
              <tbody>
                {[...results].sort((a, b) => b.percentage - a.percentage).map((r, i) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "gradient-warm text-primary-foreground" : i === 1 ? "bg-muted text-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.studentName}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: r.percentage >= 80 ? "hsl(152, 60%, 40%)" : r.percentage >= 60 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)" }}>
                      {r.percentage}%
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{Math.round(r.semanticSimilarity * 100)}%</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.misconceptions.length}</td>
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
