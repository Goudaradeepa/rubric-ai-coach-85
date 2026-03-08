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
  const { questions, addSubmission } = useEvaluation();
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const question = questions.find(q => q.id === selectedQuestion);

  const handleSubmit = () => {
    if (!selectedQuestion || !studentName || !studentEmail || !answer) {
      toast.error("Please fill in all fields");
      return;
    }
    addSubmission({ questionId: selectedQuestion, studentName, studentEmail, answer });
    setSubmitted(true);
    toast.success("Answer submitted successfully!");
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Answer Submitted!</h2>
          <p className="text-muted-foreground">Your answer has been received and will be evaluated by AI.</p>
          <Button onClick={() => { setSubmitted(false); setAnswer(""); setSelectedQuestion(""); }} variant="outline">
            Submit Another Answer
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Submit Your Answer</h1>
        <p className="mt-1 text-muted-foreground">Select a question and submit your response for AI evaluation</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Answer Form</CardTitle>
            <CardDescription>Fill in your details and write your answer below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="your@email.com" />
              </div>
            </div>

            <div>
              <Label>Select Question</Label>
              <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                <SelectTrigger><SelectValue placeholder="Choose a question..." /></SelectTrigger>
                <SelectContent>
                  {questions.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {question && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium text-foreground mb-1">Question:</p>
                <p className="text-sm text-muted-foreground">{question.questionText}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.rubricCriteria.map(c => (
                    <span key={c.id} className="text-xs rounded-full bg-accent/10 px-2.5 py-0.5 font-medium text-accent">
                      {c.name}: {c.maxScore}pts
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            <div>
              <Label>Your Answer</Label>
              <Textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer here..." rows={8} className="resize-none" />
              <p className="mt-1 text-xs text-muted-foreground">{answer.length} characters</p>
            </div>

            <Button onClick={handleSubmit} className="w-full gradient-accent text-accent-foreground border-0" size="lg">
              <Send className="mr-2 h-4 w-4" /> Submit Answer
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StudentSubmission;
