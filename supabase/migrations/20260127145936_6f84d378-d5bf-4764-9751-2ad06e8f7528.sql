
-- Create table for concrete pouring schedules (agendamentos de concretagem)
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  referencia TEXT,
  data_concretagem DATE NOT NULL,
  volume NUMERIC NOT NULL,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'agendado',
  notificado BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for multiple responsible technicians
CREATE TABLE public.agendamento_responsaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agendamento_id, funcionario_id)
);

-- Enable RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_responsaveis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agendamentos
CREATE POLICY "Users can view agendamentos of their filiais"
ON public.agendamentos
FOR SELECT
USING (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create agendamentos"
ON public.agendamentos
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update agendamentos"
ON public.agendamentos
FOR UPDATE
USING (public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete agendamentos"
ON public.agendamentos
FOR DELETE
USING (public.is_admin(auth.uid()));

-- RLS Policies for agendamento_responsaveis
CREATE POLICY "Users can view agendamento_responsaveis"
ON public.agendamento_responsaveis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agendamentos a 
    WHERE a.id = agendamento_id 
    AND (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), a.filial_id))
  )
);

CREATE POLICY "Authenticated users can manage agendamento_responsaveis"
ON public.agendamento_responsaveis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agendamentos a 
    WHERE a.id = agendamento_id 
    AND (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), a.filial_id))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance on date queries
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data_concretagem);
CREATE INDEX idx_agendamentos_filial ON public.agendamentos(filial_id);
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);
