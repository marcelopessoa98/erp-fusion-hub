import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { NotificacoesPanel } from '@/components/notifications/NotificacoesPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'cadastros': 'Cadastros',
  'filiais': 'Filiais',
  'clientes': 'Clientes',
  'obras': 'Obras',
  'funcionarios': 'Funcionários',
  'materiais': 'Controle de Materiais',
  'cadastro': 'Cadastrar Materiais',
  'em-obra': 'Materiais em Obra',
  'estoque': 'Materiais em Estoque',
  'horas-extras': 'Horas Extras',
  'lancamentos': 'Lançamentos',
  'relatorios': 'Relatórios',
  'nao-conformidades': 'Não Conformidades',
  'ocorrencias': 'Ocorrências',
  'ranking': 'Ranking',
  'configuracoes': 'Configurações',
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment;
    const isLast = index === pathSegments.length - 1;

    return { path, label, isLast };
  });

  // Add home if not on root
  if (pathSegments.length > 0) {
    breadcrumbs.unshift({ path: '/', label: 'Dashboard', isLast: false });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.length === 0 ? (
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                ) : (
                  breadcrumbs.map((crumb, index) => (
                    <BreadcrumbItem key={crumb.path}>
                      {index > 0 && <BreadcrumbSeparator />}
                      {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.path}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  ))
                )}
              </BreadcrumbList>
            </Breadcrumb>
            </div>
            <ThemeToggle />
            <NotificacoesPanel />
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
