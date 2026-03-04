import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthSession, type AuthSession } from "@/hooks/useAuthSession";
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
import Manual from "./pages/Manual";
import ModoTV from "./pages/ModoTV";
import AvisoPopup from "./components/AvisoPopup";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  auth,
  requireFullAccess = false,
}: {
  children: React.ReactNode;
  auth: AuthSession;
  requireFullAccess?: boolean;
}) {
  const { user, loading, hasFullAccess } = auth;

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
  const auth = useAuthSession();
  const { user, loading } = auth;
  const [hasAnyUsers, setHasAnyUsers] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUsersCount = async () => {
      try {
        const { count, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });

        if (!isMounted) return;
        if (error) {
          console.error("[AppRoutes/profiles-count] error:", error);
          setHasAnyUsers(true);
          return;
        }

        setHasAnyUsers((count ?? 0) > 0);
      } catch (err) {
        console.error("[AppRoutes/profiles-count] unexpected error:", err);
        if (isMounted) setHasAnyUsers(true);
      }
    };

    void loadUsersCount();

    return () => {
      isMounted = false;
    };
  }, []);

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
      <Route path="/" element={<ProtectedRoute auth={auth}><Dashboard /></ProtectedRoute>} />
      <Route path="/estrutura" element={<ProtectedRoute auth={auth} requireFullAccess><Estrutura /></ProtectedRoute>} />
      <Route path="/monitor" element={<ProtectedRoute auth={auth}><MonitorUnidade /></ProtectedRoute>} />
      <Route path="/acesso" element={<ProtectedRoute auth={auth}><AcessoRapido /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute auth={auth} requireFullAccess><AdminUsuarios /></ProtectedRoute>} />
      <Route path="/manual" element={<ProtectedRoute auth={auth}><Manual /></ProtectedRoute>} />
      <Route path="/tv" element={<ModoTV />} />
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

