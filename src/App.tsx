import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EvaluationProvider } from "@/context/EvaluationContext";
import AppLayout from "@/components/AppLayout";
import TeacherDashboard from "@/pages/TeacherDashboard";
import StudentSubmission from "@/pages/StudentSubmission";
import StudentDashboard from "@/pages/StudentDashboard";
import EvaluationResults from "@/pages/EvaluationResults";
import PerformanceAnalytics from "@/pages/PerformanceAnalytics";
import TeacherUploadEvaluation from "@/pages/TeacherUploadEvaluation";
import TeacherBulkEvaluation from "@/pages/TeacherBulkEvaluation";
import StudentsAnswers from "@/pages/StudentsAnswers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EvaluationProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<TeacherDashboard />} />
              <Route path="/teacher-evaluate" element={<TeacherUploadEvaluation />} />
              <Route path="/bulk-evaluate" element={<TeacherBulkEvaluation />} />
              <Route path="/students-answers" element={<StudentsAnswers />} />
              <Route path="/submit" element={<StudentSubmission />} />
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/results" element={<EvaluationResults />} />
              <Route path="/analytics" element={<PerformanceAnalytics />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </EvaluationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
