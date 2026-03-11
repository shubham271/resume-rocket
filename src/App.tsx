import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "./components/Navbar";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Evaluate from "./pages/Evaluate";
import Jobs from "./pages/Jobs";
import CompaniesAuth from "./pages/CompaniesAuth";
import Analyzer from "./pages/Analyzer";
import Companies from "./pages/Companies";
import Account from "./pages/Account";
import Resumes from "./pages/Resumes";
import CoverLetters from "./pages/CoverLetters";
import ResumeBuilder from "./pages/ResumeBuilder";
import CareerProfiles from "./pages/CareerProfiles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes with top navbar */}
      <Route path="/" element={<><Navbar /><Index /></>} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <><Navbar /><Auth /></>} />
      <Route path="/analyzer" element={<><Navbar /><Analyzer /></>} />
      <Route path="/companies" element={<><Navbar /><Companies /></>} />

      {/* Protected dashboard routes with sidebar */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/evaluate" element={<Evaluate />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/my-companies" element={<CompaniesAuth />} />
        <Route path="/career-profiles" element={<CareerProfiles />} />
        <Route path="/resumes" element={<Resumes />} />
        <Route path="/cover-letters" element={<CoverLetters />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/account" element={<Account />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
