-- Criar enum para roles do sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'operador');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'operador',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela de filiais
CREATE TABLE public.filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vínculo usuário-filial (gerentes/operadores podem ter acesso a filiais específicas)
CREATE TABLE public.user_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, filial_id)
);

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de obras (vinculadas a cliente e filial)
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  data_inicio DATE,
  data_previsao_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de funcionários
CREATE TABLE public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  documento TEXT,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  data_admissao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========== MÓDULO DE ESTOQUE ==========

-- Tabela de categorias de materiais
CREATE TABLE public.categorias_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de materiais
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias_material(id) ON DELETE SET NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  estoque_minimo INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de estoque por filial
CREATE TABLE public.estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materiais(id) ON DELETE CASCADE NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (material_id, filial_id)
);

-- Tabela de movimentações de estoque
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materiais(id) ON DELETE CASCADE NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL, -- 'entrada', 'saida', 'transferencia', 'aluguel'
  quantidade INTEGER NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de aluguéis de equipamentos
CREATE TABLE public.alugueis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materiais(id) ON DELETE CASCADE NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_saida DATE NOT NULL,
  data_previsao_retorno DATE,
  data_retorno DATE,
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'devolvido', 'atrasado'
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========== MÓDULO DE HORAS EXTRAS ==========

CREATE TABLE public.horas_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  horas DECIMAL(5,2) NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'noturna', 'feriado', 'domingo'
  observacao TEXT,
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========== MÓDULO DE NÃO CONFORMIDADES ==========

CREATE TYPE public.nc_tipo AS ENUM ('funcionario', 'cliente');
CREATE TYPE public.nc_status AS ENUM ('aberta', 'em_andamento', 'resolvida', 'cancelada');
CREATE TYPE public.nc_gravidade AS ENUM ('leve', 'media', 'grave', 'gravissima');

CREATE TABLE public.nao_conformidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL,
  tipo nc_tipo NOT NULL,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  gravidade nc_gravidade NOT NULL DEFAULT 'leve',
  status nc_status NOT NULL DEFAULT 'aberta',
  data_ocorrencia DATE NOT NULL,
  acao_corretiva TEXT,
  data_resolucao DATE,
  resolvido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========== FUNÇÕES AUXILIARES ==========

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Função para verificar acesso à filial
CREATE OR REPLACE FUNCTION public.has_filial_access(_user_id UUID, _filial_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_filiais
    WHERE user_id = _user_id
      AND filial_id = _filial_id
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_filiais_updated_at BEFORE UPDATE ON public.filiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON public.materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alugueis_updated_at BEFORE UPDATE ON public.alugueis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_horas_extras_updated_at BEFORE UPDATE ON public.horas_extras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nao_conformidades_updated_at BEFORE UPDATE ON public.nao_conformidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);
  
  -- Primeiro usuário é admin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== RLS POLICIES ==========

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alugueis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));

-- Policies para user_roles (somente admin pode gerenciar)
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- Policies para filiais
CREATE POLICY "Authenticated users can view filiais" ON public.filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage filiais" ON public.filiais FOR ALL USING (public.is_admin(auth.uid()));

-- Policies para user_filiais
CREATE POLICY "Users can view own filial access" ON public.user_filiais FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user_filiais" ON public.user_filiais FOR ALL USING (public.is_admin(auth.uid()));

-- Policies para clientes
CREATE POLICY "Authenticated users can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and gerentes can manage clientes" ON public.clientes FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gerente')
);

-- Policies para obras
CREATE POLICY "Users can view obras of their filiais" ON public.obras FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Admins and gerentes can manage obras" ON public.obras FOR ALL USING (
  public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id))
);

-- Policies para funcionários
CREATE POLICY "Users can view funcionarios of their filiais" ON public.funcionarios FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Admins and gerentes can manage funcionarios" ON public.funcionarios FOR ALL USING (
  public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id))
);

-- Policies para categorias_material
CREATE POLICY "Authenticated users can view categorias" ON public.categorias_material FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categorias" ON public.categorias_material FOR ALL USING (public.is_admin(auth.uid()));

-- Policies para materiais
CREATE POLICY "Authenticated users can view materiais" ON public.materiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and gerentes can manage materiais" ON public.materiais FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gerente')
);

-- Policies para estoque
CREATE POLICY "Users can view estoque of their filiais" ON public.estoque FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Admins and gerentes can manage estoque" ON public.estoque FOR ALL USING (
  public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id))
);

-- Policies para movimentacoes
CREATE POLICY "Users can view movimentacoes of their filiais" ON public.movimentacoes FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Authenticated users can create movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);

-- Policies para alugueis
CREATE POLICY "Users can view alugueis of their filiais" ON public.alugueis FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Authenticated users can manage alugueis" ON public.alugueis FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);

-- Policies para horas_extras
CREATE POLICY "Users can view horas_extras of their filiais" ON public.horas_extras FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Authenticated users can create horas_extras" ON public.horas_extras FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Admins and gerentes can update horas_extras" ON public.horas_extras FOR UPDATE USING (
  public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id))
);

-- Policies para nao_conformidades
CREATE POLICY "Users can view nao_conformidades of their filiais" ON public.nao_conformidades FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Authenticated users can create nao_conformidades" ON public.nao_conformidades FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id)
);
CREATE POLICY "Admins and gerentes can manage nao_conformidades" ON public.nao_conformidades FOR UPDATE USING (
  public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id))
);