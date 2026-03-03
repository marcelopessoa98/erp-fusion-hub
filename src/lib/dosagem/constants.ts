// Peneiras padrão ABNT para agregado miúdo (NBR NM 248:2003)
export interface Peneira {
  abertura: number; // mm
  label: string;
}

export const PENEIRAS_MIUDO: Peneira[] = [
  { abertura: 9.5, label: '9,5 mm' },
  { abertura: 6.3, label: '6,3 mm' },
  { abertura: 4.75, label: '4,75 mm' },
  { abertura: 2.36, label: '2,36 mm' },
  { abertura: 1.18, label: '1,18 mm' },
  { abertura: 0.6, label: '0,60 mm' },
  { abertura: 0.3, label: '0,30 mm' },
  { abertura: 0.15, label: '0,15 mm' },
  { abertura: 0.075, label: 'Fundo' },
];

export const PENEIRAS_GRAUDO: Peneira[] = [
  { abertura: 75, label: '75 mm' },
  { abertura: 63, label: '63 mm' },
  { abertura: 50, label: '50 mm' },
  { abertura: 37.5, label: '37,5 mm' },
  { abertura: 31.5, label: '31,5 mm' },
  { abertura: 25, label: '25 mm' },
  { abertura: 19, label: '19 mm' },
  { abertura: 12.5, label: '12,5 mm' },
  { abertura: 9.5, label: '9,5 mm' },
  { abertura: 6.3, label: '6,3 mm' },
  { abertura: 4.75, label: '4,75 mm' },
  { abertura: 2.36, label: '2,36 mm' },
  { abertura: 1.18, label: '1,18 mm' },
  { abertura: 0.6, label: '0,60 mm' },
  { abertura: 0.3, label: '0,30 mm' },
  { abertura: 0.15, label: '0,15 mm' },
  { abertura: 0.075, label: 'Fundo' },
];

// Zonas granulométricas para agregado miúdo (NBR 7211)
// [abertura_mm]: [zona_util_inf, zona_otima_inf, zona_otima_sup, zona_util_sup]
export const ZONAS_MIUDO: Record<number, [number, number, number, number]> = {
  9.5:  [0, 0, 0, 0],
  6.3:  [0, 0, 0, 7],
  4.75: [0, 0, 5, 10],
  2.36: [0, 10, 20, 25],
  1.18: [5, 20, 30, 50],
  0.6:  [15, 35, 55, 70],
  0.3:  [50, 65, 85, 95],
  0.15: [85, 90, 95, 100],
  0.075:[100, 100, 100, 100],
};

// Zonas granulométricas para agregado graúdo (NBR 7211)
// Brita 0 (4,75/12,5), Brita 1 (9,5/25), Brita 2 (19/31,5)
export interface ZonaGraudo {
  nome: string;
  faixas: Record<number, [number, number]>; // [min, max]
}

export const ZONAS_GRAUDO: ZonaGraudo[] = [
  {
    nome: 'Brita 0 (4,75/12,5)',
    faixas: {
      75: [0, 0], 63: [0, 0], 50: [0, 0], 37.5: [0, 0], 31.5: [0, 0],
      25: [0, 0], 19: [0, 0], 12.5: [0, 5], 9.5: [2, 15], 6.3: [40, 65],
      4.75: [80, 100], 2.36: [95, 100], 1.18: [100, 100], 0.6: [100, 100],
      0.3: [100, 100], 0.15: [100, 100], 0.075: [100, 100],
    },
  },
  {
    nome: 'Brita 1 (9,5/25)',
    faixas: {
      75: [0, 0], 63: [0, 0], 50: [0, 0], 37.5: [0, 0], 31.5: [0, 0],
      25: [0, 5], 19: [2, 15], 12.5: [40, 65], 9.5: [80, 100], 6.3: [92, 100],
      4.75: [95, 100], 2.36: [100, 100], 1.18: [100, 100], 0.6: [100, 100],
      0.3: [100, 100], 0.15: [100, 100], 0.075: [100, 100],
    },
  },
  {
    nome: 'Brita 2 (19/31,5)',
    faixas: {
      75: [0, 0], 63: [0, 0], 50: [0, 0], 37.5: [0, 0], 31.5: [0, 5],
      25: [5, 25], 19: [65, 95], 12.5: [92, 100], 9.5: [95, 100], 6.3: [100, 100],
      4.75: [100, 100], 2.36: [100, 100], 1.18: [100, 100], 0.6: [100, 100],
      0.3: [100, 100], 0.15: [100, 100], 0.075: [100, 100],
    },
  },
];

// Densidades padrão (g/cm³ = t/m³)
export interface MaterialDensidade {
  id: string;
  nome: string;
  densidade: number;
  unidade: string;
  categoria: 'cimento' | 'areia' | 'brita' | 'agua' | 'aditivo' | 'adicao';
}

export const MATERIAIS_PADRAO: MaterialDensidade[] = [
  { id: 'cimento', nome: 'Cimento Portland', densidade: 3.10, unidade: 'kg', categoria: 'cimento' },
  { id: 'areia_fina', nome: 'Areia Fina', densidade: 2.63, unidade: 'kg', categoria: 'areia' },
  { id: 'areia_media', nome: 'Areia Média', densidade: 2.54, unidade: 'kg', categoria: 'areia' },
  { id: 'areia_grossa', nome: 'Areia Grossa', densidade: 2.66, unidade: 'kg', categoria: 'areia' },
  { id: 'po_pedra', nome: 'Pó de Pedra', densidade: 2.70, unidade: 'kg', categoria: 'areia' },
  { id: 'brita0', nome: 'Brita 0 (12,5mm)', densidade: 2.64, unidade: 'kg', categoria: 'brita' },
  { id: 'brita1', nome: 'Brita 1 (25mm)', densidade: 2.64, unidade: 'kg', categoria: 'brita' },
  { id: 'brita2', nome: 'Brita 2 (31,5mm)', densidade: 2.64, unidade: 'kg', categoria: 'brita' },
  { id: 'agua', nome: 'Água', densidade: 1.00, unidade: 'litros', categoria: 'agua' },
  { id: 'aditivo1', nome: 'Aditivo Plastificante', densidade: 1.20, unidade: 'litros', categoria: 'aditivo' },
  { id: 'aditivo2', nome: 'Aditivo Superplastificante', densidade: 1.05, unidade: 'litros', categoria: 'aditivo' },
  { id: 'metacaulim', nome: 'Metacaulim', densidade: 2.52, unidade: 'kg', categoria: 'adicao' },
  { id: 'cinza_volante', nome: 'Cinza Volante', densidade: 2.20, unidade: 'kg', categoria: 'adicao' },
  { id: 'silica_ativa', nome: 'Sílica Ativa', densidade: 2.20, unidade: 'kg', categoria: 'adicao' },
];

// Fórmulas configuráveis
export interface FormulaConfig {
  id: string;
  nome: string;
  descricao: string;
  formula: string;
  valor_padrao?: number;
}

export const FORMULAS_PADRAO: FormulaConfig[] = [
  {
    id: 'volume_absoluto',
    nome: 'Volume Absoluto',
    descricao: 'Cálculo do volume de cada componente no traço',
    formula: 'Volume (m³) = Massa (kg) / (Densidade × 1000)',
  },
  {
    id: 'teor_argamassa',
    nome: 'Teor de Argamassa (α%)',
    descricao: 'Proporção de argamassa no concreto',
    formula: 'α = (1 + a) / (1 + a + p) × 100, onde a = proporção de areia, p = proporção de brita',
  },
  {
    id: 'consumo_cimento',
    nome: 'Consumo de Cimento (Cc)',
    descricao: 'Consumo de cimento por m³ de concreto',
    formula: 'Cc = 1000 / (1/δc + a/δa + p/δp + a/c + ad/δad), onde δ = densidade',
  },
  {
    id: 'relacao_ac',
    nome: 'Relação Água/Cimento',
    descricao: 'Volume de água = a/c × Consumo de Cimento',
    formula: 'Água (kg) = a/c × Cc',
  },
  {
    id: 'correcao_umidade',
    nome: 'Correção de Umidade',
    descricao: 'Ajuste de massa dos agregados pela umidade natural',
    formula: 'Massa_úmida = Massa_seca × (1 + h/100); Água_corrigida = Água - Σ(Massa_seca × h/100)',
  },
  {
    id: 'aditivo_percentual',
    nome: 'Dosagem de Aditivo',
    descricao: 'Cálculo da massa de aditivo sobre o cimento',
    formula: 'Massa_aditivo (kg) = (% aditivo / 100) × Consumo_cimento',
  },
  {
    id: 'modulo_finura',
    nome: 'Módulo de Finura',
    descricao: 'Índice granulométrico do agregado',
    formula: 'MF = Σ(% retidas acumuladas nas peneiras da série normal) / 100',
  },
  {
    id: 'diametro_maximo',
    nome: 'Diâmetro Máximo',
    descricao: 'Abertura da peneira na qual a % retida acumulada ≤ 5%',
    formula: 'Dmáx = abertura da peneira onde % retida acumulada < 5%',
  },
  {
    id: 'massa_especifica',
    nome: 'Massa Específica (Chapman)',
    descricao: 'NBR 9776 - Método do Frasco de Chapman',
    formula: 'δ = Ms / (Lf - Va), onde Ms=massa seca, Lf=leitura final, Va=volume água',
  },
  {
    id: 'betonada',
    nome: 'Consumo por Betonada',
    descricao: 'Conversão de consumo/m³ para volume da betoneira',
    formula: 'Material_betonada = Material_m3 × Volume_betoneira(m³)',
  },
];

// Peneiras da série normal ABNT (para cálculo do Módulo de Finura)
export const PENEIRAS_SERIE_NORMAL = [0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 19, 25, 37.5, 50, 63, 75];
