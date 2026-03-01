import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cliente, Prisma } from '@prisma/client';

@Injectable()
export class ClientesRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ClienteCreateInput): Promise<Cliente> {
    return this.prisma.cliente.create({ data: data });
  }

  async findClientByNumber(clientNumber: string): Promise<Cliente | null> {
    return await this.prisma.cliente.findUnique({
      where: { numero_cliente: clientNumber },
    });
  }
}
