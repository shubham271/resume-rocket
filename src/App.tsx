import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isAdminSubdomain } from "@/lib/subdomain";
import Navbar from "./components/Navbar";
import DashboardLayout from "./components/DashboardLayout";
import AdminLayout from "./components/AdminLayout";
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
import Admin from "./pages/Admin";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AdminRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Admin />} />
        <Route path="/users" element={<Admin />} />
        <Route path="/analytics" element={<AdminAnalytics />} />
        <Route path="/notifications" element={<AdminNotifications />} />
        <Route path="/settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

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

const App = () => {
  const isAdmin = isAdminSubdomain();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            {isAdmin ? <AdminRoutes /> : <AppRoutes />}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
