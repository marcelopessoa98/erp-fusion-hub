import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Plus, Pencil, Trash2, GraduationCap, Loader2, Search, Upload, X, Eye } from 'lucide-react';

interface MembroEquipe {
  id: string;
  nome: string;
  cargo: string | null;
  formacao: string | null;
  numero_crea: string | null;
  carimbo_url: string | null;
  ativo: boolean;
}

const EquipeTecnica = () => {
  const { isGerente } = useAuth();
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MembroEquipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [formacao, setFormacao] = useState('');
  const [numeroCrea, setNumeroCrea] = useState('');
  const [carimboFile, setCarimboFile] = useState<File | null>(null);
  const [carimboPreview, setCarimboPreview] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('equipe_tecnica')
        .select('*')
        .order('nome');
      if (error) throw error;
      setMembros(data || []);
    } catch (error) {
      console.error('Error fetching equipe:', error);
      toast.error('Erro ao carregar equipe técnica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setNome(''); setCargo(''); setFormacao(''); setNumeroCrea('');
    setCarimboFile(null); setCarimboPreview(null); setEditing(null);
  };

  const openEditDialog = (m: MembroEquipe) => {
    setEditing(m);
    setNome(m.nome);
    setCargo(m.cargo || '');
    setFormacao(m.formacao || '');
    setNumeroCrea(m.numero_crea || '');
    setCarimboPreview(m.carimbo_url);
    setCarimboFile(null);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('png')) {
      toast.error('Apenas arquivos PNG são aceitos');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 5MB)');
      return;
    }
    setCarimboFile(file);
    setCarimboPreview(URL.createObjectURL(file));
  };

  const uploadCarimbo = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('carimbos').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('carimbos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);

    try {
      let carimboUrl = editing?.carimbo_url || null;

      if (carimboFile) {
        carimboUrl = await uploadCarimbo(carimboFile);
      }

      const payload = {
        nome: nome.trim(),
        cargo: cargo.trim() || null,
        formacao: formacao.trim() || null,
        numero_crea: numeroCrea.trim() || null,
        carimbo_url: carimboUrl,
      };

      if (editing) {
        const { error } = await (supabase as any).from('equipe_tecnica').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Membro atualizado com sucesso!');
      } else {
        const { error } = await (supabase as any).from('equipe_tecnica').insert(payload);
        if (error) throw error;
        toast.success('Membro cadastrado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (m: MembroEquipe) => {
    try {
      const { error } = await (supabase as any).from('equipe_tecnica').update({ ativo: !m.ativo }).eq('id', m.id);
      if (error) throw error;
      toast.success(m.ativo ? 'Membro desativado' : 'Membro ativado');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao alterar status', { description: error.message });
    }
  };

  const deleteMembro = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este membro?')) return;
    try {
      const { error } = await (supabase as any).from('equipe_tecnica').delete().eq('id', id);
      if (error) throw error;
      toast.success('Membro excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir', { description: error.message });
    }
  };

  const filtered = membros.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.numero_crea?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8" />
            Equipe Técnica
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastro de profissionais com registro técnico (CREA)
          </p>
        </div>
        {isGerente && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Membro</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{editing ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Atualize as informações do profissional' : 'Preencha os dados do profissional'}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="nome" className="text-sm">Nome *</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" required className="h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="cargo" className="text-sm">Cargo</Label>
                      <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Engenheiro Civil" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="formacao" className="text-sm">Formação</Label>
                      <Input id="formacao" value={formacao} onChange={(e) => setFormacao(e.target.value)} placeholder="Ex: Eng. Civil" className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="numeroCrea" className="text-sm">Nº do CREA</Label>
                    <Input id="numeroCrea" value={numeroCrea} onChange={(e) => setNumeroCrea(e.target.value)} placeholder="Ex: 123456/D-SP" className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Carimbo (PNG)</Label>
                    {carimboPreview ? (
                      <div className="relative border rounded-md p-3 bg-muted/30">
                        <img src={carimboPreview} alt="Carimbo" className="max-h-32 mx-auto object-contain" />
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setCarimboFile(null); setCarimboPreview(null); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Clique para enviar imagem PNG</span>
                        <input type="file" accept="image/png" className="hidden" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                </form>
              </ScrollArea>
              <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button type="submit" size="sm" disabled={saving} onClick={handleSubmit}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editing ? 'Salvar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista da Equipe Técnica</CardTitle>
              <CardDescription>{filtered.length} profissional(is) encontrado(s)</CardDescription>
            </div>
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum profissional encontrado.' : 'Nenhum profissional cadastrado ainda.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Formação</TableHead>
                  <TableHead>CREA</TableHead>
                  <TableHead>Carimbo</TableHead>
                  <TableHead>Status</TableHead>
                  {isGerente && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell>{m.cargo || '-'}</TableCell>
                    <TableCell>{m.formacao || '-'}</TableCell>
                    <TableCell>{m.numero_crea || '-'}</TableCell>
                    <TableCell>
                      {m.carimbo_url ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(m.carimbo_url)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem carimbo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.ativo ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => isGerente && toggleAtivo(m)}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    {isGerente && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMembro(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview do carimbo */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Carimbo</DialogTitle>
          </DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Carimbo" className="w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipeTecnica;
