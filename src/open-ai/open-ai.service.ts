import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const FaturaSchema = z.object({
  cliente: z.object({
    numero_cliente: z.string().nullable(),
    nome: z.string().nullable(),
    municipio: z.string().nullable(),
    uf: z.string().nullable(),
    cep: z.string().nullable(),
  }),
  instalacao: z.string().nullable(),
  mes_referencia: z.string().nullable(),
  mes_referencia_data: z.string().nullable(),
  data_vencimento: z.string().nullable(),
  energia_eletrica: z.object({
    quantidade_kwh: z.number().nullable(),
    valor_rs: z.number().nullable(),
  }),
  energia_scee_sem_icms: z.object({
    quantidade_kwh: z.number().nullable(),
    valor_rs: z.number().nullable(),
  }),
  energia_compensada_gd: z.object({
    quantidade_kwh: z.number().nullable(),
    valor_rs: z.number().nullable(),
  }),
  contribuicao_iluminacao_publica: z.object({
    valor_rs: z.number().nullable(),
  }),
});

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
    
    Analise o texto da fatura e extraia os dados seguindo estas regras:
    
    FORMATAÇÃO:
    - Valores monetários: use ponto decimal (ex: 104.81), nunca vírgula ou "R$"
    - Quantidades kWh: número decimal com até 3 casas decimais
    - Datas: formato ISO YYYY-MM-DD
    - Mês de referência: formato MMM/YYYY em maiúsculas (ex: SET/2024)
    - CEP: apenas dígitos, sem formatação (ex: "12345678")
    - UF: 2 letras maiúsculas
    
    CONVERSÕES ESPECIAIS:
    - mes_referencia_data: converta o mês de referência para o primeiro dia do mês (ex: "JAN/2026" → "2026-01-01")
    - Preserve sinais negativos quando presentes (ex: -222.22)
    
    CAMPOS OBRIGATÓRIOS:
    - numero_cliente: número do cliente exatamente como aparece
    - instalacao: número da instalação
    - nome: nome completo do cliente
    - municipio: cidade
    - uf: estado (2 letras)
    - cep: apenas dígitos
    - mes_referencia: mês no formato MMM/YYYY
    - mes_referencia_data: primeiro dia do mês em formato ISO
    - data_vencimento: data de vencimento em formato ISO
    
    ENERGIA:
    - energia_eletrica: quantidade em kWh e valor em R$
    - energia_scee_sem_icms: quantidade em kWh e valor em R$
    - energia_compensada_gd: quantidade em kWh e valor em R$ (pode ser negativo)
    - contribuicao_iluminacao_publica: valor em R$
    
    Se não encontrar um campo com confiança, retorne null.
    Não invente dados.
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
      response_format: zodResponseFormat(FaturaSchema, 'fatura'),
    });

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    return completion.choices[0].message.content || '';
  }
}
