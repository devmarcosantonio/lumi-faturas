import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;
  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat({ textPdf }: { textPdf: string }): Promise<string> {
    const promptSystem = `
    Você é um sistema de extração de dados de faturas de energia elétrica.

    Sua tarefa é analisar o texto extraído de um PDF de fatura (o usuário enviará apenas o texto já extraído) e retornar exclusivamente um JSON válido seguindo exatamente o schema abaixo.

    NÃO escreva explicações.
    NÃO escreva texto fora do JSON.
    NÃO inclua comentários.
    Se não encontrar um campo, retorne null.

    REGRAS IMPORTANTES:

    Valores monetários devem usar ponto decimal (ex: 104.81).

    Nunca usar vírgula.

    Nunca usar "R$".

    Quantidades em kWh devem ser número decimal.

    Datas no formato ISO: YYYY-MM-DD.

    O mês de referência deve estar no formato: MMM/YYYY (ex: SET/2024) em maiúsculas.

    Não invente dados.

    Se houver dúvida entre dois valores, use null.

    Preserve sinais negativos quando presentes (ex: -222.22).

    Precisão: kWh até 3 casas decimais; valores monetários até 2 casas decimais.

    SCHEMA OBRIGATÓRIO (retorne apenas este JSON):
    {
    "cliente": {
      "numero_cliente": string | null,
      "nome": string | null,
      "municipio": string | null,
      "uf": string | null,
      "cep": string | null
    },

    "instalacao": string | null,
    "mes_referencia": string | null,
    "mes_referencia_data": string | null,
    "data_vencimento": string | null,

    "energia_eletrica": {
    "quantidade_kwh": number | null,
    "valor_rs": number | null
    },

    "energia_scee_sem_icms": {
    "quantidade_kwh": number | null,
    "valor_rs": number | null
    },

    "energia_compensada_gd": {
    "quantidade_kwh": number | null,
    "valor_rs": number | null
    },

    "contribuicao_iluminacao_publica": {
    "valor_rs": number | null
    }
    }

    Agora analise cuidadosamente o documento e preencha o JSON.
    Retorne apenas o JSON puro.

    REGRAS DE EXTRAÇÃO ESPECÍFICAS:

    numero_cliente e instalacao: capture exatamente como aparecem no documento (strings).
    mes_referencia_data: converta o mês de referência para o primeiro dia daquele mês no formato ISO YYYY-MM-DD (ex: "JAN/2026" vira "2026-01-01").
    data_vencimento: extraia a data de vencimento e converta para YYYY-MM-DD.
    cep: remova qualquer formatação (hífens, pontos), retorne apenas os dígitos (ex: "12345678").
    nome: nome completo do cliente conforme aparece na fatura.
    municipio e uf: extraia a cidade e estado (UF com 2 letras maiúsculas).
    Se um campo não for encontrado com confiança, retorne null para esse campo (não tente adivinhar).
    Não inclua moeda, símbolos ou separadores de milhares, apenas números com ponto decimal quando necessário.
    `;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: promptSystem,
        },
        { role: 'user', content: textPdf },
      ],
      response_format: { type: 'json_object' },
    });

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    return completion.choices[0].message.content || '';
  }
}
