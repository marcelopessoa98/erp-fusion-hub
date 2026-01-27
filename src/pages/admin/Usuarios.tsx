import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, UserCog, Shield, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: AppRole;
  filiais: { id: string; nome: string }[];
}

interface NewUser {
  email: string;
  password: string;
  nome: string;
  role: AppRole;
  filiais: string[];
}

const Usuarios = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFilialDialogOpen, setIsFilialDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    nome: '',
    role: 'operador',
    filiais: [],
  });
  const queryClient = useQueryClient();

  // Fetch users with roles and filiais
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-admin'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch user_filiais with filial names
      const { data: userFiliais, error: filiaisError } = await supabase
        .from('user_filiais')
        .select('user_id, filial_id, filiais(id, nome)');

      if (filiaisError) throw filiaisError;

      // Combine data
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        const userFiliaisData = userFiliais
          .filter((uf) => uf.user_id === profile.user_id)
          .map((uf) => uf.filiais as unknown as { id: string; nome: string })
          .filter(Boolean);

        return {
          id: profile.id,
          user_id: profile.user_id,
          nome: profile.nome,
          email: profile.email,
          role: userRole?.role || 'operador',
          filiais: userFiliaisData,
        };
      });

      return usersWithRoles;
    },
  });

  // Fetch all filiais for assignment
  const { data: filiais } = useQuery({
    queryKey: ['filiais-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('filiais')
        .select('id, nome')
        .eq('ativa', true)
        .order('nome');

      if (error) throw error;
      return data;
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: NewUser) => {
      // Create user via Supabase Auth Admin (requires service role in edge function)
      // For now, we'll use the regular signUp and manually handle profile creation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: { nome: userData.nome },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não foi criado');

      // Wait a moment for trigger to create profile
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update user role if not operador (default)
      if (userData.role !== 'operador') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: userData.role })
          .eq('user_id', authData.user.id);

        if (roleError) throw roleError;
      }

      // Assign filiais
      if (userData.filiais.length > 0) {
        const filiaisToInsert = userData.filiais.map((filialId) => ({
          user_id: authData.user!.id,
          filial_id: filialId,
        }));

        const { error: filiaisError } = await supabase
          .from('user_filiais')
          .insert(filiaisToInsert);

        if (filiaisError) throw filiaisError;
      }

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
      setIsOpen(false);
      setNewUser({ email: '', password: '', nome: '', role: 'operador', filiais: [] });
      toast.success('Usuário criado com sucesso! O usuário receberá um e-mail de confirmação.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
      toast.success('Papel do usuário atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar papel: ${error.message}`);
    },
  });

  // Update user filiais mutation
  const updateFiliaisMutation = useMutation({
    mutationFn: async ({ userId, filiais }: { userId: string; filiais: string[] }) => {
      // Remove all existing filiais
      const { error: deleteError } = await supabase
        .from('user_filiais')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new filiais
      if (filiais.length > 0) {
        const filiaisToInsert = filiais.map((filialId) => ({
          user_id: userId,
          filial_id: filialId,
        }));

        const { error: insertError } = await supabase
          .from('user_filiais')
          .insert(filiaisToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
      setIsFilialDialogOpen(false);
      setSelectedUser(null);
      toast.success('Filiais do usuário atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar filiais: ${error.message}`);
    },
  });

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.password || !newUser.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleFilialToggle = (filialId: string) => {
    setNewUser((prev) => ({
      ...prev,
      filiais: prev.filiais.includes(filialId)
        ? prev.filiais.filter((id) => id !== filialId)
        : [...prev.filiais, filialId],
    }));
  };

  const handleEditFiliais = (user: UserWithRole) => {
    setSelectedUser({
      ...user,
      filiais: user.filiais || [],
    });
    setIsFilialDialogOpen(true);
  };

  const handleSelectedFilialToggle = (filialId: string) => {
    if (!selectedUser) return;
    const currentFiliais = selectedUser.filiais.map((f) => f.id);
    const newFiliais = currentFiliais.includes(filialId)
      ? currentFiliais.filter((id) => id !== filialId)
      : [...currentFiliais, filialId];

    setSelectedUser({
      ...selectedUser,
      filiais: newFiliais.map((id) => {
        const filial = filiais?.find((f) => f.id === id);
        return { id, nome: filial?.nome || '' };
      }),
    });
  };

  const handleSaveFiliais = () => {
    if (!selectedUser) return;
    updateFiliaisMutation.mutate({
      userId: selectedUser.user_id,
      filiais: selectedUser.filiais.map((f) => f.id),
    });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'gerente':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      default:
        return 'Operador';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie os usuários do sistema
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={newUser.nome}
                  onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: AppRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filiais com Acesso</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {filiais?.map((filial) => (
                    <div key={filial.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filial-${filial.id}`}
                        checked={newUser.filiais.includes(filial.id)}
                        onCheckedChange={() => handleFilialToggle(filial.id)}
                      />
                      <label
                        htmlFor={`filial-${filial.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {filial.nome}
                      </label>
                    </div>
                  ))}
                  {(!filiais || filiais.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma filial cadastrada
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="w-full"
              >
                {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Usuários Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Filiais</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: AppRole) =>
                          updateRoleMutation.mutate({ userId: user.user_id, role: value })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operador">Operador</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.filiais.length > 0 ? (
                          user.filiais.slice(0, 2).map((filial) => (
                            <Badge key={filial.id} variant="outline" className="text-xs">
                              {filial.nome}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {user.role === 'admin' ? 'Acesso total' : 'Nenhuma'}
                          </span>
                        )}
                        {user.filiais.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.filiais.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditFiliais(user)}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Filiais
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!users || users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar filiais */}
      <Dialog open={isFilialDialogOpen} onOpenChange={setIsFilialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Filiais - {selectedUser?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
              {filiais?.map((filial) => (
                <div key={filial.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-filial-${filial.id}`}
                    checked={selectedUser?.filiais.some((f) => f.id === filial.id) || false}
                    onCheckedChange={() => handleSelectedFilialToggle(filial.id)}
                  />
                  <label
                    htmlFor={`edit-filial-${filial.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {filial.nome}
                  </label>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSaveFiliais}
              disabled={updateFiliaisMutation.isPending}
              className="w-full"
            >
              {updateFiliaisMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
