import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, GraduationCap, BarChart3, ClipboardCheck, User, FileText } from "lucide-react";

const navItems = [
  { path: "/", label: "Teacher", icon: BookOpen },
  { path: "/submit", label: "Submit Exam", icon: FileText },
  { path: "/student", label: "Student", icon: User },
  { path: "/results", label: "Results", icon: ClipboardCheck },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <GraduationCap className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-primary-foreground">EvalAI</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-primary-foreground"
                      : "text-primary-foreground/70 hover:bg-sidebar-accent/50 hover:text-primary-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
};

export default AppLayout;
