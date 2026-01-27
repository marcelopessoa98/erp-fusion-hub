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
import Materiais from "./pages/estoque/Materiais";
import Movimentacoes from "./pages/estoque/Movimentacoes";
import Alugueis from "./pages/estoque/Alugueis";
import Lancamentos from "./pages/horas-extras/Lancamentos";
import Relatorios from "./pages/horas-extras/Relatorios";
import Ocorrencias from "./pages/nao-conformidades/Ocorrencias";
import Ranking from "./pages/nao-conformidades/Ranking";
import Avaliacoes from "./pages/nao-conformidades/Avaliacoes";
import NCsFuncionarios from "./pages/nao-conformidades/NCsFuncionarios";
import NCsClientes from "./pages/nao-conformidades/NCsClientes";
import TiposNC from "./pages/nao-conformidades/TiposNC";
import Usuarios from "./pages/admin/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
      
      {/* Estoque */}
      <Route
        path="/estoque/materiais"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Materiais />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estoque/movimentacoes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Movimentacoes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estoque/alugueis"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Alugueis />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Horas Extras */}
      <Route
        path="/horas-extras/lancamentos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Lancamentos />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/horas-extras/relatorios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Relatorios />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Não Conformidades */}
      <Route
        path="/nao-conformidades/ocorrencias"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Ocorrencias />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nao-conformidades/funcionarios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <NCsFuncionarios />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nao-conformidades/clientes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <NCsClientes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nao-conformidades/avaliacoes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Avaliacoes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nao-conformidades/tipos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TiposNC />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nao-conformidades/ranking"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Ranking />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Administração */}
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <Usuarios />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold mb-2">Configurações</h2>
                <p className="text-muted-foreground">Módulo em desenvolvimento</p>
              </div>
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
