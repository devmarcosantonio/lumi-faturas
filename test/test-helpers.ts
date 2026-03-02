import { PrismaClient } from '@prisma/client';

export async function clearDatabase(prisma: PrismaClient) {
  await prisma.fatura.deleteMany({});
  await prisma.cliente.deleteMany({});
}

export async function seedTestData(prisma: PrismaClient) {
  // Dados de exemplo para testes
  const cliente = await prisma.cliente.create({
    data: {
      numero_cliente: '7202210726',
      nome: 'Cliente Teste',
      uf: 'SC',
      municipio: 'Florianópolis',
      cep: '88000000',
    },
  });

  return { cliente };
}
