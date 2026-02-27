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
import { toast } from '@/components/ui/sonner';
import { Plus, UserCog, Shield, Building2, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({ nome: '', email: '', password: '' });
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserWithRole | null>(null);
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

  // Edit user mutation (via edge function)
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, nome, email, password }: { userId: string; nome?: string; email?: string; password?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'update', userId, nome, email, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete user mutation (via edge function)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete', userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin'] });
      setDeleteUserTarget(null);
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
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

  const openEditUserDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditUserData({ nome: user.nome, email: user.email, password: '' });
    setIsEditUserDialogOpen(true);
  };

  const handleEditUserSubmit = () => {
    if (!selectedUser) return;
    if (!editUserData.nome || !editUserData.email) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    if (editUserData.password && editUserData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    editUserMutation.mutate({
      userId: selectedUser.user_id,
      nome: editUserData.nome,
      email: editUserData.email,
      password: editUserData.password || undefined,
    });
  };

  const handleDeleteUser = () => {
    if (!deleteUserTarget) return;
    deleteUserMutation.mutate(deleteUserTarget.user_id);
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditUserDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditFiliais(user)}
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteUserTarget(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={editUserData.nome}
                onChange={(e) => setEditUserData({ ...editUserData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nova Senha (deixe em branco para manter)</Label>
              <Input
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button
              onClick={handleEditUserSubmit}
              disabled={editUserMutation.isPending}
              className="w-full"
            >
              {editUserMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserTarget} onOpenChange={() => setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteUserTarget?.nome}</strong> ({deleteUserTarget?.email})?
              Esta ação não pode ser desfeita e removerá todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteUserMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Usuarios;
