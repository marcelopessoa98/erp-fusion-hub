
-- Table for Laudo Cautelar de Vizinhança
CREATE TABLE public.laudos_cautelares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid REFERENCES public.filiais(id) NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) NOT NULL,
  obra_id uuid REFERENCES public.obras(id) NOT NULL,
  -- Imóvel vistoriado
  endereco_vistoriado text NOT NULL DEFAULT '',
  tipo_imovel text NOT NULL DEFAULT 'Imóvel residencial',
  objetivo text DEFAULT 'Identificar danos já existentes.',
  -- Imóvel a ser construído
  tipo_ocupacao text DEFAULT 'Residencial',
  caracteristicas_edificacao text DEFAULT 'Constituído por unidades autônomas distribuídas em blocos.',
  vias_acesso text DEFAULT '',
  -- Características do imóvel
  padrao_construtivo text DEFAULT 'Baixo padrão',
  qtd_pavimentos integer DEFAULT 1,
  estruturas text DEFAULT 'Concreto armado e alvenaria',
  vedacao text DEFAULT 'Alvenaria em tijolos cerâmicos furados',
  acabamento_piso text DEFAULT 'Cômodos em sua maioria com revestimento cerâmico',
  acabamento_paredes text DEFAULT 'Revestimento argamassa e pintura',
  cobertura text DEFAULT 'madeira, telhas cerâmicas e revestimento gesso',
  -- Textos editáveis
  texto_objetivo text DEFAULT 'Este laudo cautelar de vizinhança tem como objetivo constatar as condições das propriedades adjacentes à obra em construção e já identificar possíveis danos existentes nestas. Essa avaliação é essencial para verificar a integridade das edificações em questão. O resultado é decorrente de uma vistoria técnica realizada por um profissional habilitado e experiente, que avalia minuciosamente as propriedades vizinhas à obra em construção.',
  texto_nota_previa text DEFAULT '',
  texto_metodologia text DEFAULT 'O presente documento é baseado na ABNT (Associação Brasileira de Normas Técnicas) e IBAPE (Instituto Brasileiro de Avaliação e Perícias de Engenharia), seguindo todas as aplicações práticas de vistoria cautelar de vizinhança, metodologia e parâmetros, de forma que atendam os pré-requisitos mínimos estabelecidos para o perfeito funcionamento de todo o sistema existente.',
  texto_avaliacao_final text DEFAULT 'Diante do exposto neste laudo cautelar de vizinhança, conclui-se que foram realizadas todas as vistorias e análises necessárias para identificar possíveis danos e anomalias no imóvel. As informações e resultados obtidos foram descritos de forma clara e objetiva.

Assim, a contratada atesta que realizou todas as atividades previstas neste contrato, e que o proprietário do imóvel vistoriado teve a oportunidade de acompanhar e esclarecer quaisquer dúvidas sobre as informações obtidas.

Por fim, os responsáveis da contratada, contratante e o proprietário do imóvel vistoriado assinam este laudo cautelar de vizinhança, atestando a sua concordância e aceitação das informações apresentadas.',
  -- Bairro e cidade para nota prévia
  bairro text DEFAULT '',
  cidade text DEFAULT 'Fortaleza-CE',
  -- Images (storage paths)
  imagem_google_maps text,
  imagem_fluxograma text,
  -- Responsável técnico
  responsavel_id uuid REFERENCES public.equipe_tecnica(id),
  -- Meta
  status text NOT NULL DEFAULT 'rascunho',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laudos_cautelares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view laudos of their filiais" ON public.laudos_cautelares
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create laudos" ON public.laudos_cautelares
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update laudos" ON public.laudos_cautelares
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR (public.has_role(auth.uid(), 'gerente') AND public.has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete laudos" ON public.laudos_cautelares
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Table for photos
CREATE TABLE public.laudo_cautelar_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laudo_id uuid REFERENCES public.laudos_cautelares(id) ON DELETE CASCADE NOT NULL,
  numero integer NOT NULL,
  descricao text DEFAULT '',
  foto_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laudo_cautelar_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage laudo fotos" ON public.laudo_cautelar_fotos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.laudos_cautelares l
    WHERE l.id = laudo_cautelar_fotos.laudo_id
    AND (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), l.filial_id))
  ));

CREATE POLICY "Users can view laudo fotos" ON public.laudo_cautelar_fotos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.laudos_cautelares l
    WHERE l.id = laudo_cautelar_fotos.laudo_id
    AND (public.is_admin(auth.uid()) OR public.has_filial_access(auth.uid(), l.filial_id))
  ));

-- Storage bucket for laudo photos
INSERT INTO storage.buckets (id, name, public) VALUES ('laudos-cautelares', 'laudos-cautelares', true);

-- Storage RLS
CREATE POLICY "Authenticated users can upload laudo files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'laudos-cautelares');

CREATE POLICY "Anyone can view laudo files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'laudos-cautelares');

CREATE POLICY "Authenticated users can delete laudo files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'laudos-cautelares');

-- Trigger for updated_at
CREATE TRIGGER update_laudos_cautelares_updated_at
  BEFORE UPDATE ON public.laudos_cautelares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
