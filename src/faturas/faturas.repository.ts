import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Fatura, Prisma } from '@prisma/client';

@Injectable()
export class FaturasRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.FaturaCreateInput): Promise<Fatura> {
    return this.prisma.fatura.create({ data: data });
  }

  async findById(id: string): Promise<Fatura | null> {
    return this.prisma.fatura.findUnique({
      where: { id },
    });
  }

  async findByInstalacaoEMesReferencia({
    instalacao,
    mesReferencia,
  }: {
    instalacao: string;
    mesReferencia: string;
  }): Promise<Fatura | null> {
    return this.prisma.fatura.findFirst({
      where: {
        instalacao,
        mes_referencia: mesReferencia,
      },
    });
  }

  async findByIdClienteEMesReferencia({
    clienteId,
    mesReferenciaInicio,
    mesReferenciaFim,
  }: {
    clienteId?: string;
    mesReferenciaInicio?: Date;
    mesReferenciaFim?: Date;
  }): Promise<Fatura[]> {
    const where: Prisma.FaturaWhereInput = {};

    if (clienteId) {
      where.clienteId = clienteId;
    }

    // Filtro de período por data
    if (mesReferenciaInicio && mesReferenciaFim) {
      where.mes_referencia_data = {
        gte: mesReferenciaInicio,
        lte: mesReferenciaFim,
      };
    } else if (mesReferenciaInicio) {
      where.mes_referencia_data = {
        gte: mesReferenciaInicio,
      };
    } else if (mesReferenciaFim) {
      where.mes_referencia_data = {
        lte: mesReferenciaFim,
      };
    }

    return this.prisma.fatura.findMany({
      where,
      include: {
        cliente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
