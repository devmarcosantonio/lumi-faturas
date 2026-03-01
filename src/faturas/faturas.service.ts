import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OpenAiService } from 'src/open-ai/open-ai.service';
import { PDFParse } from 'pdf-parse';
import { ClientesRepository } from 'src/clientes/clientes.repository';
import { FaturasRepository } from './faturas.repository';
import { z } from 'zod';
import { Fatura } from '@prisma/client';

interface ClienteData {
  numero_cliente: string | null;
  nome: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
}

interface EnergiaData {
  quantidade_kwh: number | null;
  valor_rs: number | null;
}

interface ContribuicaoData {
  valor_rs: number | null;
}

export interface FaturaExtraidaData {
  cliente: ClienteData;
  instalacao: string | null;
  mes_referencia: string | null;
  data_vencimento: string | null;
  energia_eletrica: EnergiaData;
  energia_scee_sem_icms: EnergiaData;
  energia_compensada_gd: EnergiaData;
  contribuicao_iluminacao_publica: ContribuicaoData;
}

@Injectable()
export class FaturasService {
  constructor(
    private openAiService: OpenAiService,
    private clientesRepository: ClientesRepository,
    private faturasRepository: FaturasRepository,
  ) {}

  async processarFatura(pdfBuffer: Buffer): Promise<Fatura> {
    try {
      const parser = new PDFParse({ data: pdfBuffer });

      const result = await parser.getText();
      const textoExtraido = result.text;

      await parser.destroy();

      if (!textoExtraido || textoExtraido.trim().length === 0) {
        throw new InternalServerErrorException(
          'Não foi possível extrair texto do PDF',
        );
      }

      const promptCompleto = `\n\nTexto da fatura:\n${textoExtraido}`;

      const resposta: string = await this.openAiService.chat({
        textPdf: promptCompleto,
      });

      const resposta_json: FaturaExtraidaData = JSON.parse(
        resposta,
      ) as FaturaExtraidaData;

      const clienteSchema = z.object({
        numero_cliente: z.string().min(1),
        nome: z.string().min(1),
        municipio: z.string().min(1),
        uf: z.string().min(1),
        cep: z.string().min(1),
      });

      clienteSchema.parse(resposta_json.cliente);

      const clienteExistente = await this.clientesRepository.findClientByNumber(
        resposta_json.cliente.numero_cliente!,
      );

      // Cria ou obtém o cliente
      let cliente = clienteExistente;
      if (!cliente) {
        cliente = await this.clientesRepository.create({
          numero_cliente: resposta_json.cliente.numero_cliente!,
          nome: resposta_json.cliente.nome!,
          municipio: resposta_json.cliente.municipio!,
          uf: resposta_json.cliente.uf!,
          cep: resposta_json.cliente.cep!,
        });
      }

      // Valida campos obrigatórios da fatura
      if (!resposta_json.instalacao) {
        throw new InternalServerErrorException(
          'Campo "instalacao" é obrigatório',
        );
      }
      if (!resposta_json.mes_referencia) {
        throw new InternalServerErrorException(
          'Campo "mes_referencia" é obrigatório',
        );
      }
      if (!resposta_json.data_vencimento) {
        throw new InternalServerErrorException(
          'Campo "data_vencimento" é obrigatório',
        );
      }

      // Extrai valores para facilitar os cálculos
      const energiaEletricaKwh =
        resposta_json.energia_eletrica.quantidade_kwh ?? 0;
      const energiaEletricaValor = resposta_json.energia_eletrica.valor_rs ?? 0;
      const energiaSceeKwh =
        resposta_json.energia_scee_sem_icms.quantidade_kwh ?? 0;
      const energiaSceeValor =
        resposta_json.energia_scee_sem_icms.valor_rs ?? 0;
      const energiaCompensadaKwh =
        resposta_json.energia_compensada_gd.quantidade_kwh ?? 0;
      const energiaCompensadaValor =
        resposta_json.energia_compensada_gd.valor_rs ?? 0;
      const contribIlumValor =
        resposta_json.contribuicao_iluminacao_publica.valor_rs ?? 0;

      // CÁLCULOS DERIVADOS
      // 1. Consumo de Energia Elétrica (kWh) = Energia Elétrica + Energia SCEE
      const consumoEnergiaEletricaKwh = energiaEletricaKwh + energiaSceeKwh;

      // 2. Energia Compensada (kWh) = mesmo valor da energia compensada GD
      const energiaCompensadaTotal = energiaCompensadaKwh;

      // 3. Valor Total sem GD (R$) = Energia Elétrica + Energia SCEE + Contrib Ilum
      const valorTotalSemGd =
        energiaEletricaValor + energiaSceeValor + contribIlumValor;

      // 4. Economia GD (R$) = valor da energia compensada (geralmente negativo)
      const economiaGd = energiaCompensadaValor;

      // Salva a fatura com os campos calculados
      const fatura = await this.faturasRepository.create({
        instalacao: resposta_json.instalacao,
        mes_referencia: resposta_json.mes_referencia,
        data_vencimento: new Date(resposta_json.data_vencimento),
        energia_eletrica_quantidade: energiaEletricaKwh,
        energia_eletrica_valor: energiaEletricaValor,
        energia_sceee_icms_quantidade: energiaSceeKwh,
        energia_sceee_icms_valor: energiaSceeValor,
        energia_compensada_gd_quantidade: energiaCompensadaKwh,
        energia_compensada_gd_valor: energiaCompensadaValor,
        contrib_ilum_publica_valor: contribIlumValor,
        // Campos calculados
        consumo_energia_eletrica_kwh: consumoEnergiaEletricaKwh,
        energia_compensada_kwh: energiaCompensadaTotal,
        valor_total_sem_gd: valorTotalSemGd,
        economia_gd: economiaGd,
        url_download_fatura: '', // TODO: adicionar URL quando implementar upload
        resposta_json_llm: resposta_json as Record<string, any>,
        cliente: {
          connect: { id: cliente.id },
        },
      });

      return fatura;
    } catch (error) {
      // Tratamento seguro do erro
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Erro ao processar fatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }
}
