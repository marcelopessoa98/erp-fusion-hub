import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GranulometriaTab } from '@/components/dosagem/GranulometriaTab';
import { DosagemTab } from '@/components/dosagem/DosagemTab';
import { ConfiguracoesModal } from '@/components/dosagem/ConfiguracoesModal';
import { Settings, FileText } from 'lucide-react';

export default function Ensaios() {
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traços — Dosagem e Granulometria</h1>
          <p className="text-sm text-muted-foreground">
            Curvas granulométricas e geração de carta traço de concreto e argamassa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />Configurações
          </Button>
        </div>
      </div>

      <Tabs defaultValue="granulometria">
        <TabsList>
          <TabsTrigger value="granulometria">Granulometria</TabsTrigger>
          <TabsTrigger value="dosagem">Dosagem (1m³)</TabsTrigger>
        </TabsList>

        <TabsContent value="granulometria" className="mt-4">
          <GranulometriaTab />
        </TabsContent>

        <TabsContent value="dosagem" className="mt-4">
          <DosagemTab />
        </TabsContent>
      </Tabs>

      <ConfiguracoesModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
