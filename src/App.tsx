import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Filiais from "./pages/cadastros/Filiais";
import Clientes from "./pages/cadastros/Clientes";
import Obras from "./pages/cadastros/Obras";
import Funcionarios from "./pages/cadastros/Funcionarios";
import Lancamentos from "./pages/horas-extras/Lancamentos";
import Relatorios from "./pages/horas-extras/Relatorios";
import Ocorrencias from "./pages/nao-conformidades/Ocorrencias";
import Ranking from "./pages/nao-conformidades/Ranking";
import Avaliacoes from "./pages/nao-conformidades/Avaliacoes";
import NCsFuncionarios from "./pages/nao-conformidades/NCsFuncionarios";
import NCsClientes from "./pages/nao-conformidades/NCsClientes";
import TiposNC from "./pages/nao-conformidades/TiposNC";
import Agendamentos from "./pages/agendamentos/Agendamentos";
import ServicosExtras from "./pages/servicos-extras/ServicosExtras";
import Usuarios from "./pages/admin/Usuarios";
import DocumentacaoFuncionarios from "./pages/cadastros/DocumentacaoFuncionarios";
import Medicoes from "./pages/financeiro/Medicoes";
import ContratosConfig from "./pages/financeiro/ContratosConfig";
import Propostas from "./pages/financeiro/Propostas";
import SolicitacoesCompras from "./pages/financeiro/SolicitacoesCompras";
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
      
      {/* Agendamentos */}
      <Route
        path="/agendamentos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Agendamentos />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Serviços Extras */}
      <Route
        path="/servicos-extras"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ServicosExtras />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Documentação Funcionários */}
      <Route
        path="/cadastros/documentacao"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DocumentacaoFuncionarios />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Financeiro */}
      <Route
        path="/financeiro/medicoes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Medicoes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro/contratos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ContratosConfig />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro/propostas"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Propostas />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financeiro/compras"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SolicitacoesCompras />
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
  <ThemeProvider>
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
  </ThemeProvider>
);

export default App;
