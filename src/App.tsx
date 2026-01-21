import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Filiais from "./pages/cadastros/Filiais";
import Clientes from "./pages/cadastros/Clientes";
import Obras from "./pages/cadastros/Obras";
import Funcionarios from "./pages/cadastros/Funcionarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Placeholder pages for modules that will be implemented next
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">Módulo em desenvolvimento</p>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      
      {/* Protected routes with layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Cadastros */}
      <Route
        path="/cadastros/filiais"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Filiais />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cadastros/clientes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Clientes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cadastros/obras"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Obras />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cadastros/funcionarios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Funcionarios />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Estoque - Placeholders */}
      <Route
        path="/estoque/materiais"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Materiais" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estoque/movimentacoes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Movimentações" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estoque/alugueis"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Aluguéis" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Horas Extras - Placeholders */}
      <Route
        path="/horas-extras/lancamentos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Lançamentos de Horas Extras" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/horas-extras/relatorios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Relatórios de Horas Extras" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Não Conformidades - Placeholders */}
      <Route
        path="/nao-conformidades/ocorrencias"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Ocorrências" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nao-conformidades/ranking"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PlaceholderPage title="Ranking de Funcionários" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Configurações */}
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <PlaceholderPage title="Configurações" />
            </AppLayout>
          </ProtectedRoute>
        }
      />

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
