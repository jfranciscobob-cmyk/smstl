import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "./pages/Dashboard";
import Estrutura from "./pages/Estrutura";
import MonitorUnidade from "./pages/MonitorUnidade";
import AcessoRapido from "./pages/AcessoRapido";
import Login from "./pages/Login";
import AdminUsuarios from "./pages/AdminUsuarios";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requireFullAccess = false }: { children: React.ReactNode; requireFullAccess?: boolean }) {
  const { user, loading, hasFullAccess } = useAuthSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireFullAccess && !hasFullAccess) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuthSession();
  const [hasAnyUsers, setHasAnyUsers] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => {
      setHasAnyUsers((count ?? 0) > 0);
    });
  }, [user]);

  if (loading || hasAnyUsers === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Initial setup - no users exist yet
  if (!hasAnyUsers) {
    return <SetupAdmin onDone={() => setHasAnyUsers(true)} />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/estrutura" element={<ProtectedRoute requireFullAccess><Estrutura /></ProtectedRoute>} />
      <Route path="/monitor" element={<ProtectedRoute><MonitorUnidade /></ProtectedRoute>} />
      <Route path="/acesso" element={<ProtectedRoute><AcessoRapido /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute requireFullAccess><AdminUsuarios /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
