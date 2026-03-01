import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Fatura, Prisma } from '@prisma/client';

@Injectable()
export class FaturasRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.FaturaCreateInput): Promise<Fatura> {
    return this.prisma.fatura.create({ data: data });
  }
}
