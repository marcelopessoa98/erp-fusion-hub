import { PENEIRAS_SERIE_NORMAL, Peneira } from './constants';

export interface DadosPeneira {
  abertura: number;
  label: string;
  massaRetidaA: number;
  massaRetidaB: number;
  // Calculated
  percRetidaA: number;
  percRetidaB: number;
  variacao: number;
  mediaRetida: number;
  retidaAcumulada: number;
}

/**
 * Calcula todos os valores granulométricos a partir das massas retidas
 */
export function calcularGranulometria(
  peneiras: Peneira[],
  massasA: number[],
  massasB: number[]
): DadosPeneira[] {
  const totalA = massasA.reduce((s, v) => s + v, 0) || 1;
  const totalB = massasB.reduce((s, v) => s + v, 0) || 1;

  let acumulada = 0;
  return peneiras.map((p, i) => {
    const percA = (massasA[i] / totalA) * 100;
    const percB = (massasB[i] / totalB) * 100;
    const media = (percA + percB) / 2;
    acumulada += media;
    return {
      abertura: p.abertura,
      label: p.label,
      massaRetidaA: massasA[i],
      massaRetidaB: massasB[i],
      percRetidaA: percA,
      percRetidaB: percB,
      variacao: Math.abs(percA - percB),
      mediaRetida: media,
      retidaAcumulada: acumulada,
    };
  });
}

/**
 * Calcula o Módulo de Finura
 * MF = Σ(% retidas acumuladas nas peneiras da série normal) / 100
 */
export function calcularModuloFinura(dados: DadosPeneira[]): number {
  let soma = 0;
  for (const d of dados) {
    if (PENEIRAS_SERIE_NORMAL.includes(d.abertura)) {
      soma += d.retidaAcumulada;
    }
  }
  return soma / 100;
}

/**
 * Determina o Diâmetro Máximo Característico (NBR NM 248)
 * É a abertura da MAIOR peneira (em ordem decrescente) cuja % retida acumulada é ≤ 5%.
 */
export function calcularDiametroMaximo(dados: DadosPeneira[]): number {
  // Ordena da maior abertura para a menor
  const ordenados = [...dados].sort((a, b) => b.abertura - a.abertura);
  let dMax = 0;
  for (const d of ordenados) {
    if (d.retidaAcumulada <= 5) {
      dMax = d.abertura;
    } else if (dMax > 0) {
      // Já encontramos pelo menos uma peneira válida e agora ultrapassou 5%
      break;
    }
  }
  // Fallback: nenhuma peneira ≤ 5% — retorna a menor abertura
  if (dMax === 0) return ordenados[ordenados.length - 1]?.abertura || 0;
  return dMax;
}

// ---- Dosagem ----

export interface MaterialTraco {
  id: string;
  nome: string;
  massa: number; // kg
  densidade: number; // t/m³ = g/cm³
  umidade: number; // %
  volume: number; // m³ (calculado)
  massaCorrigida: number; // kg (com umidade)
  categoria: string;
}

export interface ResultadoDosagem {
  volumeTotal: number;
  diferenca: number; // m³ (deve ser 0)
  status: 'baixo' | 'fechado' | 'alto';
  consumoCimento: number;
  teorArgamassa: number;
  tracoUnitario: string;
  aguaCorrigida: number;
}

/**
 * Calcula o volume absoluto de um material
 */
export function calcularVolume(massa: number, densidade: number): number {
  if (densidade <= 0) return 0;
  return massa / (densidade * 1000);
}

/**
 * Calcula a dosagem completa do traço
 */
export function calcularDosagem(
  materiais: MaterialTraco[],
  relacaoAC: number,
  aditivoPercent: number
): ResultadoDosagem {
  const cimento = materiais.find(m => m.categoria === 'cimento');
  const areias = materiais.filter(m => m.categoria === 'areia');
  const britas = materiais.filter(m => m.categoria === 'brita');
  const agua = materiais.find(m => m.categoria === 'agua');
  const aditivos = materiais.filter(m => m.categoria === 'aditivo');
  const adicoes = materiais.filter(m => m.categoria === 'adicao');

  const consumoCimento = cimento?.massa || 0;

  // Volume de cada material
  let volumeTotal = 0;
  for (const m of materiais) {
    m.volume = calcularVolume(m.massa, m.densidade);
    volumeTotal += m.volume;
  }

  // Correção de umidade para agregados
  let aguaCorrecao = 0;
  for (const m of [...areias, ...britas]) {
    m.massaCorrigida = m.massa * (1 + m.umidade / 100);
    aguaCorrecao += m.massa * (m.umidade / 100);
  }

  const aguaMassa = agua?.massa || 0;
  const aguaCorrigida = aguaMassa - aguaCorrecao;

  // Teor de argamassa
  const massaAreias = areias.reduce((s, m) => s + m.massa, 0);
  const massaBritas = britas.reduce((s, m) => s + m.massa, 0);
  const totalSolidos = consumoCimento + massaAreias + massaBritas + aguaMassa;
  const teorArgamassa = totalSolidos > 0
    ? ((consumoCimento + massaAreias + aguaMassa) / totalSolidos) * 100
    : 0;

  // Traço unitário (em relação ao cimento)
  const partes: string[] = ['1'];
  if (consumoCimento > 0) {
    for (const a of areias) partes.push((a.massa / consumoCimento).toFixed(2));
    for (const b of britas) partes.push((b.massa / consumoCimento).toFixed(2));
    partes.push(relacaoAC.toFixed(2));
  }
  const tracoUnitario = partes.join(':');

  const diferenca = volumeTotal - 1.0;
  let status: 'baixo' | 'fechado' | 'alto' = 'baixo';
  if (Math.abs(diferenca) <= 0.005) status = 'fechado';
  else if (diferenca > 0) status = 'alto';

  return {
    volumeTotal,
    diferenca,
    status,
    consumoCimento,
    teorArgamassa,
    tracoUnitario,
    aguaCorrigida,
  };
}

/**
 * Calcula consumo por betonada
 */
export function calcularBetonada(
  materiais: MaterialTraco[],
  volumeBetoneira: number // m³
): { nome: string; massa: number; massaCorrigida: number }[] {
  return materiais.map(m => ({
    nome: m.nome,
    massa: m.massa * volumeBetoneira,
    massaCorrigida: (m.massaCorrigida || m.massa) * volumeBetoneira,
  }));
}
