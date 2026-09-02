import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EvaluationProvider } from "@/context/EvaluationContext";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherAuth from "@/pages/TeacherAuth";
import StudentSubmission from "@/pages/StudentSubmission";
import StudentDashboard from "@/pages/StudentDashboard";
import EvaluationResults from "@/pages/EvaluationResults";
import PerformanceAnalytics from "@/pages/PerformanceAnalytics";
import TeacherUploadEvaluation from "@/pages/TeacherUploadEvaluation";
import TeacherBulkEvaluation from "@/pages/TeacherBulkEvaluation";
import StudentsAnswers from "@/pages/StudentsAnswers";
import QuestionPaperProcessing from "@/pages/QuestionPaperProcessing";
import ReviewQueue from "@/pages/ReviewQueue";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const teacher = (el: React.ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <EvaluationProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/auth" element={<TeacherAuth />} />
                <Route path="/" element={teacher(<TeacherDashboard />)} />
                <Route path="/teacher-evaluate" element={teacher(<TeacherUploadEvaluation />)} />
                <Route path="/bulk-evaluate" element={teacher(<TeacherBulkEvaluation />)} />
                <Route path="/question-paper" element={teacher(<QuestionPaperProcessing />)} />
                <Route path="/review" element={teacher(<ReviewQueue />)} />
                <Route path="/students-answers" element={teacher(<StudentsAnswers />)} />
                <Route path="/results" element={teacher(<EvaluationResults />)} />
                <Route path="/analytics" element={teacher(<PerformanceAnalytics />)} />
                <Route path="/submit" element={<StudentSubmission />} />
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </EvaluationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
