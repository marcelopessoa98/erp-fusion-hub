import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceiroDashboard } from '@/components/gestao-financeira/FinanceiroDashboard';
import { LancamentosTab } from '@/components/gestao-financeira/LancamentosTab';
import { CobrancasTab } from '@/components/gestao-financeira/CobrancasTab';
import { CategoriasTab } from '@/components/gestao-financeira/CategoriasTab';
import { BarChart3, ArrowLeftRight, Users, Tags } from 'lucide-react';

export default function GestaoFinanceira() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>
        <p className="text-muted-foreground">Controle completo de receitas, despesas e cobranças</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Lançamentos</span>
          </TabsTrigger>
          <TabsTrigger value="cobrancas" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Cobranças</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FinanceiroDashboard />
        </TabsContent>
        <TabsContent value="lancamentos">
          <LancamentosTab />
        </TabsContent>
        <TabsContent value="cobrancas">
          <CobrancasTab />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
