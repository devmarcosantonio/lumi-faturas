import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { OpenAiService } from 'src/open-ai/open-ai.service';
import { PDFParse } from 'pdf-parse';
import { FaturasRepository } from './faturas.repository';
import { S3Service } from 'src/s3/s3.service';
import { ClientesService } from 'src/clientes/clientes.service';
import { z } from 'zod';
import { Fatura } from '@prisma/client';
import {
  convertMesReferenciaToStartDate,
  convertMesReferenciaToEndDate,
} from 'src/utils/date.utils';

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
  mes_referencia_data: string | null;
  data_vencimento: string | null;
  energia_eletrica: EnergiaData;
  energia_scee_sem_icms: EnergiaData;
  energia_compensada_gd: EnergiaData;
  contribuicao_iluminacao_publica: ContribuicaoData;
}

@Injectable()
export class FaturasService {
  private readonly logger = new Logger(FaturasService.name);

  constructor(
    private openAiService: OpenAiService,
    private clientesService: ClientesService,
    private faturasRepository: FaturasRepository,
    private s3Service: S3Service,
  ) {}

  async getFaturaByClienteEMesReferencia({
    numeroCliente,
    mesReferencia,
    mesReferenciaInicio,
    mesReferenciaFim,
  }: {
    numeroCliente?: string;
    mesReferencia?: string;
    mesReferenciaInicio?: string;
    mesReferenciaFim?: string;
  }): Promise<Fatura[]> {
    // Se numeroCliente foi fornecido, busca o ID do cliente
    let clienteDbId: string | undefined;
    if (numeroCliente) {
      const cliente =
        await this.clientesService.findByNumeroCliente(numeroCliente);
      if (!cliente) {
        throw new InternalServerErrorException(
          `Cliente com número ${numeroCliente} não encontrado`,
        );
      }
      clienteDbId = cliente.id;
    }

    // Converte datas (formato: YYYY-MM)
    let dataInicio: Date | undefined;
    let dataFim: Date | undefined;

    // Se mesReferencia específico foi fornecido, converte para período de 1 mês
    if (mesReferencia) {
      dataInicio = convertMesReferenciaToStartDate(mesReferencia);
      dataFim = convertMesReferenciaToEndDate(mesReferencia);
    } else {
      // Senão, usa período customizado se fornecido
      if (mesReferenciaInicio) {
        dataInicio = convertMesReferenciaToStartDate(mesReferenciaInicio);
      }

      if (mesReferenciaFim) {
        dataFim = convertMesReferenciaToEndDate(mesReferenciaFim);
      }
    }

    // Busca com os parâmetros disponíveis (se nenhum for fornecido, retorna todas)
    return this.faturasRepository.findByIdClienteEMesReferencia({
      clienteId: clienteDbId,
      mesReferenciaInicio: dataInicio,
      mesReferenciaFim: dataFim,
    });
  }

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

      let cliente = await this.clientesService.findByNumeroCliente(
        resposta_json.cliente.numero_cliente!,
      );

      // Cria o cliente se não existir
      if (!cliente) {
        cliente = await this.clientesService.create({
          numero_cliente: resposta_json.cliente.numero_cliente!,
          nome: resposta_json.cliente.nome!,
          municipio: resposta_json.cliente.municipio!,
          uf: resposta_json.cliente.uf!,
          cep: resposta_json.cliente.cep!,
        });
      }

      if (!cliente) {
        throw new InternalServerErrorException(
          'Erro ao criar ou buscar cliente',
        );
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

      // Verifica se já existe fatura para esta instalação + mês de referência
      const faturaExistente =
        await this.faturasRepository.findByInstalacaoEMesReferencia({
          instalacao: resposta_json.instalacao,
          mesReferencia: resposta_json.mes_referencia,
        });

      if (faturaExistente) {
        throw new InternalServerErrorException(
          `Já existe uma fatura para a instalação ${resposta_json.instalacao} no mês de referência ${resposta_json.mes_referencia}`,
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

      // Faz upload do PDF para o S3 e obtém a URL
      let pdfUrl: string | null = null;

      try {
        pdfUrl = await this.s3Service.uploadPdf(
          pdfBuffer,
          resposta_json.cliente.numero_cliente!,
          resposta_json.mes_referencia,
        );
        this.logger.log(`PDF salvo no S3: ${pdfUrl}`);
      } catch (uploadError) {
        this.logger.error(
          `Erro ao fazer upload para S3: ${uploadError instanceof Error ? uploadError.message : 'Erro desconhecido'}`,
        );
        this.logger.warn('Continuando processamento sem URL do PDF');
      }

      // Salva a fatura com os campos calculados
      const fatura = await this.faturasRepository.create({
        instalacao: resposta_json.instalacao,
        mes_referencia: resposta_json.mes_referencia,
        mes_referencia_data: resposta_json.mes_referencia_data
          ? new Date(resposta_json.mes_referencia_data)
          : null,
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
        url_download_fatura: pdfUrl,
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

  async downloadFaturaPdf(faturaId: string): Promise<Buffer> {
    try {
      // Busca a fatura no banco para pegar a URL
      const fatura = await this.faturasRepository.findById(faturaId);

      if (!fatura) {
        throw new InternalServerErrorException(
          `Fatura com ID ${faturaId} não encontrada`,
        );
      }

      if (!fatura.url_download_fatura) {
        throw new InternalServerErrorException(
          `Fatura não possui URL de download`,
        );
      }

      // Baixa o PDF do S3
      const pdfBuffer = await this.s3Service.downloadPdf(
        fatura.url_download_fatura,
      );

      return pdfBuffer;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Erro ao baixar PDF da fatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }
}
