// Variável global para armazenar o nome do arquivo atual sendo processado
let currentFileName = '';

export function setCurrentFileName(fileName: string) {
  currentFileName = fileName;
}

// Função para extrair dados do nome do arquivo no formato: numeroCliente-instalacao-mes-ano.pdf
function parseFileName(fileName: string) {
  // Remove extensão .pdf
  const nameWithoutExt = fileName.replace('.pdf', '');
  const parts = nameWithoutExt.split('-');

  if (parts.length !== 4) {
    throw new Error(
      `Nome de arquivo inválido: ${fileName}. Esperado: numeroCliente-instalacao-mes-ano.pdf`,
    );
  }

  const [numeroCliente, instalacao, mes, ano] = parts;

  // Converte mês numérico para nome
  const mesesMap: Record<string, string> = {
    '01': 'JAN',
    '02': 'FEV',
    '03': 'MAR',
    '04': 'ABR',
    '05': 'MAI',
    '06': 'JUN',
    '07': 'JUL',
    '08': 'AGO',
    '09': 'SET',
    '10': 'OUT',
    '11': 'NOV',
    '12': 'DEZ',
  };

  const mesNome = mesesMap[mes] || 'JAN';
  const mesReferencia = `${mesNome}/${ano}`;
  const mesReferenciaData = `${ano}-${mes}-01`;

  // Calcula data de vencimento (próximo mês, dia 10)
  const mesVencimento =
    parseInt(mes) === 12 ? '01' : String(parseInt(mes) + 1).padStart(2, '0');
  const anoVencimento = parseInt(mes) === 12 ? String(parseInt(ano) + 1) : ano;
  const dataVencimento = `${anoVencimento}-${mesVencimento}-10`;

  return {
    numero_cliente: numeroCliente,
    instalacao,
    mes_referencia: mesReferencia,
    mes_referencia_data: mesReferenciaData,
    data_vencimento: dataVencimento,
  };
}

export class MockOpenAiService {
  async chat() {
    // Ignora o texto do PDF e se baseia no nome do arquivo
    const fileData = parseFileName(currentFileName);

    const response = {
      cliente: {
        numero_cliente: fileData.numero_cliente,
        nome: 'MARIA SILVA SANTOS',
        municipio: 'FLORIANOPOLIS',
        uf: 'SC',
        cep: '88015100',
      },
      instalacao: fileData.instalacao,
      mes_referencia: fileData.mes_referencia,
      mes_referencia_data: fileData.mes_referencia_data,
      data_vencimento: fileData.data_vencimento,
      energia_eletrica: {
        quantidade_kwh: 100.5,
        valor_rs: 50.25,
      },
      energia_scee_sem_icms: {
        quantidade_kwh: 150.3,
        valor_rs: 75.15,
      },
      energia_compensada_gd: {
        quantidade_kwh: 250.8,
        valor_rs: -125.4,
      },
      contribuicao_iluminacao_publica: {
        valor_rs: 45.5,
      },
    };

    return JSON.stringify(response);
  }
}
