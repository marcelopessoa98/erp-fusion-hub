/**
 * Utilitários para manipulação de datas sem problemas de timezone
 */

/**
 * Formata uma data para string YYYY-MM-DD usando componentes locais
 * Evita problemas de timezone que ocorrem com toISOString()
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma string de data YYYY-MM-DD para Date sem problemas de timezone
 * Cria a data no fuso horário local em vez de UTC
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formata uma string de data para exibição no formato brasileiro
 */
export function formatDateBR(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
