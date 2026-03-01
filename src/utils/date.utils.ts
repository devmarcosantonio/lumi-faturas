/**
 * Converte uma string no formato YYYY-MM para o primeiro dia do mês
 * @param mesReferencia - String no formato YYYY-MM (ex: "2026-01")
 * @returns Date representando o primeiro dia do mês às 00:00:00
 */
export function convertMesReferenciaToStartDate(mesReferencia: string): Date {
  const [ano, mes] = mesReferencia.split('-');
  return new Date(parseInt(ano), parseInt(mes) - 1, 1);
}

/**
 * Converte uma string no formato YYYY-MM para o último dia do mês
 * @param mesReferencia - String no formato YYYY-MM (ex: "2026-01")
 * @returns Date representando o último dia do mês às 23:59:59
 */
export function convertMesReferenciaToEndDate(mesReferencia: string): Date {
  const [ano, mes] = mesReferencia.split('-');
  return new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);
}

/**
 * Converte uma Data para o intervalo completo do mês (primeiro e último dia)
 * @param data - Date para extrair o mês
 * @returns Tupla [dataInicio, dataFim] do mês completo
 */
export function getMonthRange(data: Date): [Date, Date] {
  const dataInicio = new Date(data.getFullYear(), data.getMonth(), 1);
  const dataFim = new Date(
    data.getFullYear(),
    data.getMonth() + 1,
    0,
    23,
    59,
    59,
  );
  return [dataInicio, dataFim];
}
