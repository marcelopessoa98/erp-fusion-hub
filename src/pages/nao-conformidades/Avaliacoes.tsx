import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Plus, Star, Search, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Avaliacao {
  id: string;
  funcionario_id: string;
  filial_id: string;
  obra_id: string | null;
  descricao: string;
  data_avaliacao: string;
  created_at: string;
  funcionario?: { nome: string };
  filial?: { nome: string };
  obra?: { nome: string } | null;
}

const Avaliacoes = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFilial, setFilterFilial] = useState<string>("all");
  const [filterMes, setFilterMes] = useState<string>(
    (new Date().getMonth() + 1).toString()
  );
  const [filterAno, setFilterAno] = useState<string>(
    new Date().getFullYear().toString()
  );

  const [formData, setFormData] = useState({
    funcionario_id: "",
    filial_id: "",
    obra_id: "",
    descricao: "",
    data_avaliacao: new Date().toISOString().split("T")[0],
  });

  const isAdmin = role === "admin";
  const isGerente = role === "gerente";
  const canManage = isAdmin || isGerente;

  // Fetch filiais
  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("id, nome")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch funcionarios based on selected filial
  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios", formData.filial_id],
    queryFn: async () => {
      let query = supabase
        .from("funcionarios")
        .select("id, nome, filial_id")
        .eq("ativo", true)
        .order("nome");

      if (formData.filial_id) {
        query = query.eq("filial_id", formData.filial_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!formData.filial_id,
  });

  // Fetch obras based on selected filial
  const { data: obras = [] } = useQuery({
    queryKey: ["obras", formData.filial_id],
    queryFn: async () => {
      let query = supabase
        .from("obras")
        .select("id, nome")
        .eq("status", "ativa")
        .order("nome");

      if (formData.filial_id) {
        query = query.eq("filial_id", formData.filial_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!formData.filial_id,
  });

  // Fetch avaliacoes
  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ["avaliacoes", filterFilial, filterMes, filterAno],
    queryFn: async () => {
      let query = supabase
        .from("avaliacoes_funcionarios")
        .select(
          `
          *,
          funcionario:funcionarios(nome),
          filial:filiais(nome),
          obra:obras(nome)
        `
        )
        .order("data_avaliacao", { ascending: false });

      if (filterFilial !== "all") {
        query = query.eq("filial_id", filterFilial);
      }

      // Filter by month and year
      const startDate = `${filterAno}-${filterMes.padStart(2, "0")}-01`;
      const endDate = new Date(parseInt(filterAno), parseInt(filterMes), 0)
        .toISOString()
        .split("T")[0];
      query = query.gte("data_avaliacao", startDate).lte("data_avaliacao", endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as Avaliacao[];
    },
  });

  // Create avaliacao mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("avaliacoes_funcionarios").insert({
        funcionario_id: data.funcionario_id,
        filial_id: data.filial_id,
        obra_id: data.obra_id || null,
        descricao: data.descricao,
        data_avaliacao: data.data_avaliacao,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacoes"] });
      toast.success("Avaliação positiva registrada com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao registrar avaliação: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("avaliacoes_funcionarios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacoes"] });
      toast.success("Avaliação excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir avaliação: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      funcionario_id: "",
      filial_id: "",
      obra_id: "",
      descricao: "",
      data_avaliacao: new Date().toISOString().split("T")[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.funcionario_id || !formData.filial_id || !formData.descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const filteredAvaliacoes = avaliacoes.filter(
    (a) =>
      a.funcionario?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalAvaliacoes = filteredAvaliacoes.length;
  const funcionariosElogiados = new Set(filteredAvaliacoes.map((a) => a.funcionario_id))
    .size;

  const meses = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avaliações Positivas</h1>
          <p className="text-muted-foreground">
            Registre elogios e feedbacks positivos para funcionários
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Avaliação Positiva</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Filial *</Label>
                  <Select
                    value={formData.filial_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, filial_id: value, funcionario_id: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.data_avaliacao}
                    onChange={(e) =>
                      setFormData({ ...formData, data_avaliacao: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Funcionário *</Label>
                <Select
                  value={formData.funcionario_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, funcionario_id: value })
                  }
                  disabled={!formData.filial_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Obra (opcional)</Label>
                <Select
                  value={formData.obra_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, obra_id: value })
                  }
                  disabled={!formData.filial_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Elogio *</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descreva o motivo do elogio..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Elogios</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAvaliacoes}</div>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Funcionários Elogiados
            </CardTitle>
            <Star className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funcionariosElogiados}</div>
            <p className="text-xs text-muted-foreground">
              funcionários diferentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por funcionário ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Filiais</SelectItem>
                {filiais.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAno} onValueChange={setFilterAno}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredAvaliacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma avaliação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredAvaliacoes.map((avaliacao) => (
                  <TableRow key={avaliacao.id}>
                    <TableCell>
                      {format(new Date(avaliacao.data_avaliacao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {avaliacao.funcionario?.nome}
                    </TableCell>
                    <TableCell>{avaliacao.filial?.nome}</TableCell>
                    <TableCell>{avaliacao.obra?.nome || "-"}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {avaliacao.descricao}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedAvaliacao(avaliacao)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Deseja excluir esta avaliação?")) {
                                deleteMutation.mutate(avaliacao.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={!!selectedAvaliacao}
        onOpenChange={() => setSelectedAvaliacao(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
          </DialogHeader>
          {selectedAvaliacao && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1" />
                  Elogio
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Funcionário</p>
                  <p className="font-medium">{selectedAvaliacao.funcionario?.nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedAvaliacao.data_avaliacao),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Filial</p>
                  <p className="font-medium">{selectedAvaliacao.filial?.nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Obra</p>
                  <p className="font-medium">
                    {selectedAvaliacao.obra?.nome || "-"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Descrição</p>
                <p className="mt-1">{selectedAvaliacao.descricao}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Avaliacoes;
