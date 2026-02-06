import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Building2,
  Users,
  HardHat,
  UserCog,
  Package,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Trophy,
  LogOut,
  Settings,
  ChevronDown,
  ThumbsUp,
  Tags,
  UserX,
  Building,
  UserPlus,
  CalendarDays,
  DollarSign,
  Wrench,
  Construction,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const cadastrosItems = [
  { title: 'Filiais', url: '/cadastros/filiais', icon: Building2 },
  { title: 'Clientes', url: '/cadastros/clientes', icon: Users },
  { title: 'Obras', url: '/cadastros/obras', icon: HardHat },
  { title: 'Funcionários', url: '/cadastros/funcionarios', icon: UserCog },
];

const controleMateriais = [
  { title: 'Cadastrar Materiais', url: '/materiais/cadastro', icon: Package },
  { title: 'Materiais em Obra', url: '/materiais/em-obra', icon: Construction },
  { title: 'Materiais em Estoque', url: '/materiais/estoque', icon: ArrowLeftRight },
];

const horasExtrasItems = [
  { title: 'Lançamentos', url: '/horas-extras/lancamentos', icon: Clock },
  { title: 'Relatórios', url: '/horas-extras/relatorios', icon: LayoutDashboard },
];

const ncItems = [
  { title: 'NCs Funcionários', url: '/nao-conformidades/funcionarios', icon: UserX },
  { title: 'NCs Clientes', url: '/nao-conformidades/clientes', icon: Building },
  { title: 'Avaliações', url: '/nao-conformidades/avaliacoes', icon: ThumbsUp },
  { title: 'Tipos de NC', url: '/nao-conformidades/tipos', icon: Tags },
  { title: 'Ranking', url: '/nao-conformidades/ranking', icon: Trophy },
];

const agendamentosItems = [
  { title: 'Calendário', url: '/agendamentos', icon: CalendarDays },
];

const servicosExtrasItems = [
  { title: 'Gerenciar', url: '/servicos-extras', icon: Wrench },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { profile, role, signOut } = useAuth();

  const isActiveGroup = (items: { url: string }[]) => {
    return items.some((item) => location.pathname.startsWith(item.url));
  };

  const renderMenuItems = (items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
              activeClassName="bg-accent text-accent-foreground font-medium"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="Concrefuji" 
            className={cn(
              "transition-all duration-200",
              collapsed ? "h-8 w-8 object-contain" : "h-10 w-auto max-w-[180px]"
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/"
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  activeClassName="bg-accent text-accent-foreground font-medium"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Cadastros */}
        <Collapsible defaultOpen={isActiveGroup(cadastrosItems)} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-3 py-2 flex items-center justify-between">
                <span className={cn(collapsed && 'sr-only')}>Cadastros</span>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {renderMenuItems(cadastrosItems)}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Controle de Materiais */}
        <Collapsible defaultOpen={isActiveGroup(controleMateriais)} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-3 py-2 flex items-center justify-between">
                <span className={cn(collapsed && 'sr-only')}>Controle de Materiais</span>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {renderMenuItems(controleMateriais)}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Horas Extras */}
        <Collapsible defaultOpen={isActiveGroup(horasExtrasItems)} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-3 py-2 flex items-center justify-between">
                <span className={cn(collapsed && 'sr-only')}>Horas Extras</span>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {renderMenuItems(horasExtrasItems)}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Não Conformidades */}
        <Collapsible defaultOpen={isActiveGroup(ncItems)} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-3 py-2 flex items-center justify-between">
                <span className={cn(collapsed && 'sr-only')}>Não Conformidades</span>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {renderMenuItems(ncItems)}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Agendamentos */}
        <Collapsible defaultOpen={isActiveGroup(agendamentosItems)} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-3 py-2 flex items-center justify-between">
                <span className={cn(collapsed && 'sr-only')}>Agendamentos</span>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {renderMenuItems(agendamentosItems)}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Financeiro - Em Desenvolvimento */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="flex items-center gap-3 px-3 py-2 rounded-md opacity-60 cursor-not-allowed">
                <DollarSign className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <div className="flex items-center gap-2">
                    <span>Financeiro</span>
                    <Badge variant="secondary" className="text-xs">Em breve</Badge>
                  </div>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Serviços Extras */}
        <Collapsible defaultOpen={isActiveGroup(servicosExtrasItems)} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-3 py-2 flex items-center justify-between">
                <span className={cn(collapsed && 'sr-only')}>Serviços Extras</span>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {renderMenuItems(servicosExtrasItems)}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {role === 'admin' && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/admin/usuarios"
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Usuários</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/configuracoes"
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-medium">
              {profile?.nome?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.nome || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground capitalize">{role || 'Carregando...'}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="shrink-0"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
