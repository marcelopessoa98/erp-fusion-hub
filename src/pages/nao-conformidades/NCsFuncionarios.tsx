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
import { toast } from "sonner";
import { Plus, Search, Eye, CheckCircle, AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type NCStatus = "aberta" | "em_andamento" | "resolvida" | "cancelada";
type NCGravidade = "leve" | "media" | "grave" | "gravissima";

interface NC {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  gravidade: NCGravidade;
  status: NCStatus;
  data_ocorrencia: string;
  acao_corretiva: string | null;
  data_resolucao: string | null;
  funcionario_id: string | null;
  filial_id: string;
  obra_id: string | null;
  funcionario?: { nome: string } | null;
  filial?: { nome: string };
  obra?: { nome: string } | null;
}

const gravidadeConfig = {
  leve: { label: "Leve", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  media: { label: "Média", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  grave: { label: "Grave", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  gravissima: { label: "Gravíssima", color: "bg-red-100 text-red-800", icon: XCircle },
};

const statusConfig = {
  aberta: { label: "Aberta", color: "bg-red-100 text-red-800" },
  em_andamento: { label: "Em Andamento", color: "bg-yellow-100 text-yellow-800" },
  resolvida: { label: "Resolvida", color: "bg-green-100 text-green-800" },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-800" },
};
const NCsFuncionarios = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNC, setSelectedNC] = useState<NC | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFilial, setFilterFilial] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    gravidade: "leve" as NCGravidade,
    funcionario_id: "",
    filial_id: "",
    obra_id: "",
    tipo_nc_id: "",
    data_ocorrencia: new Date().toISOString().split("T")[0],
  });

  const [resolveData, setResolveData] = useState({
    acao_corretiva: "",
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

  // Fetch funcionarios
  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios", formData.filial_id],
    queryFn: async () => {
      let query = supabase
        .from("funcionarios")
        .select("id, nome")
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

  // Fetch obras
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

  // Fetch tipos de NC para funcionários
  const { data: tiposNC = [] } = useQuery({
    queryKey: ["tipos-nc-funcionario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_nc")
        .select("id, nome")
        .eq("categoria", "funcionario")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch NCs de funcionarios
  const { data: ncs = [], isLoading } = useQuery({
    queryKey: ["ncs-funcionarios", filterFilial, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("nao_conformidades")
        .select(
          `
          *,
          funcionario:funcionarios(nome),
          filial:filiais(nome),
          obra:obras(nome)
        `
        )
        .eq("tipo", "funcionario")
        .order("data_ocorrencia", { ascending: false });

      if (filterFilial !== "all") {
        query = query.eq("filial_id", filterFilial);
      }

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as NCStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NC[];
    },
  });

  // Create NC mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("nao_conformidades").insert({
        titulo: data.titulo,
        descricao: data.descricao,
        tipo: "funcionario" as const,
        gravidade: data.gravidade,
        status: "aberta" as const,
        funcionario_id: data.funcionario_id,
        filial_id: data.filial_id,
        obra_id: data.obra_id || null,
        tipo_nc_id: data.tipo_nc_id || null,
        data_ocorrencia: data.data_ocorrencia,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncs-funcionarios"] });
      toast.success("NC registrada com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao registrar NC: " + error.message);
    },
  });

  // Resolve NC mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, acao_corretiva }: { id: string; acao_corretiva: string }) => {
      const { error } = await supabase
        .from("nao_conformidades")
        .update({
          status: "resolvida" as const,
          acao_corretiva,
          data_resolucao: new Date().toISOString().split("T")[0],
          resolvido_por: user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ncs-funcionarios"] });
      toast.success("NC resolvida com sucesso!");
      setIsResolveDialogOpen(false);
      setSelectedNC(null);
      setResolveData({ acao_corretiva: "" });
    },
    onError: (error) => {
      toast.error("Erro ao resolver NC: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      gravidade: "leve",
      funcionario_id: "",
      filial_id: "",
      obra_id: "",
      tipo_nc_id: "",
      data_ocorrencia: new Date().toISOString().split("T")[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.descricao || !formData.funcionario_id || !formData.filial_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNC || !resolveData.acao_corretiva) {
      toast.error("Descreva a ação corretiva");
      return;
    }
    resolveMutation.mutate({
      id: selectedNC.id,
      acao_corretiva: resolveData.acao_corretiva,
    });
  };

  const filteredNCs = ncs.filter(
    (nc) =>
      nc.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.funcionario?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const abertas = ncs.filter((nc) => nc.status === "aberta").length;
  const resolvidas = ncs.filter((nc) => nc.status === "resolvida").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NCs de Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie não conformidades relacionadas a funcionários
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova NC
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar NC de Funcionário</DialogTitle>
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
                  <Label>Data da Ocorrência *</Label>
                  <Input
                    type="date"
                    value={formData.data_ocorrencia}
                    onChange={(e) =>
                      setFormData({ ...formData, data_ocorrencia: e.target.value })
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

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectValue placeholder="Selecione" />
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
                  <Label>Gravidade *</Label>
                  <Select
                    value={formData.gravidade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gravidade: value as NCGravidade })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                      <SelectItem value="gravissima">Gravíssima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de NC</Label>
                <Select
                  value={formData.tipo_nc_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_nc_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposNC.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  placeholder="Título da não conformidade"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descreva a não conformidade..."
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
            <CardTitle className="text-sm font-medium">NCs Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{abertas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NCs Resolvidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvidas}</div>
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
                  placeholder="Buscar por título ou funcionário..."
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="resolvida">Resolvidas</SelectItem>
                <SelectItem value="fechada">Fechadas</SelectItem>
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
                <TableHead>Título</TableHead>
                <TableHead>Gravidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredNCs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma NC encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredNCs.map((nc) => {
                  const GravidadeIcon = gravidadeConfig[nc.gravidade]?.icon || AlertCircle;
                  return (
                    <TableRow key={nc.id}>
                      <TableCell>
                        {format(new Date(nc.data_ocorrencia), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {nc.funcionario?.nome}
                      </TableCell>
                      <TableCell>{nc.titulo}</TableCell>
                      <TableCell>
                        <Badge className={gravidadeConfig[nc.gravidade]?.color}>
                          <GravidadeIcon className="h-3 w-3 mr-1" />
                          {gravidadeConfig[nc.gravidade]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[nc.status]?.color}>
                          {statusConfig[nc.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedNC(nc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && nc.status === "aberta" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedNC(nc);
                                setIsResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={!!selectedNC && !isResolveDialogOpen}
        onOpenChange={() => setSelectedNC(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da NC</DialogTitle>
          </DialogHeader>
          {selectedNC && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={gravidadeConfig[selectedNC.gravidade]?.color}>
                  {gravidadeConfig[selectedNC.gravidade]?.label}
                </Badge>
                <Badge className={statusConfig[selectedNC.status]?.color}>
                  {statusConfig[selectedNC.status]?.label}
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{selectedNC.titulo}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Funcionário</p>
                  <p className="font-medium">{selectedNC.funcionario?.nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(selectedNC.data_ocorrencia), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Filial</p>
                  <p className="font-medium">{selectedNC.filial?.nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Obra</p>
                  <p className="font-medium">{selectedNC.obra?.nome || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Descrição</p>
                <p className="mt-1">{selectedNC.descricao}</p>
              </div>
              {selectedNC.acao_corretiva && (
                <div>
                  <p className="text-muted-foreground text-sm">Ação Corretiva</p>
                  <p className="mt-1">{selectedNC.acao_corretiva}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver NC</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResolve} className="space-y-4">
            <div className="space-y-2">
              <Label>Ação Corretiva *</Label>
              <Textarea
                value={resolveData.acao_corretiva}
                onChange={(e) =>
                  setResolveData({ acao_corretiva: e.target.value })
                }
                placeholder="Descreva a ação corretiva aplicada..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResolveDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={resolveMutation.isPending}>
                {resolveMutation.isPending ? "Salvando..." : "Resolver"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NCsFuncionarios;
