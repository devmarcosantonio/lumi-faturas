import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OpenAiService } from '../src/open-ai/open-ai.service';
import { S3Service } from '../src/s3/s3.service';
import { clearDatabase } from './test-helpers';
import { MockOpenAiService, setCurrentFileName } from './mocks/openai.mock';
import { MockS3Service } from './mocks/s3.mock';

describe('FaturasController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // CONFIGURAÇÃO DOS TESTES
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenAiService)
      .useClass(MockOpenAiService)
      .overrideProvider(S3Service)
      .useClass(MockS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  // ========================================
  // POST /faturas - VALIDAÇÃO DE ARQUIVO
  // ========================================
  describe('POST /faturas - Validação de Tipo de Arquivo', () => {
    it('deve rejeitar arquivo que não seja PDF', async () => {
      const txtFilePath = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-01-2024.txt',
      );

      const fixturesDir = path.join(__dirname, 'fixtures');
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }

      fs.writeFileSync(
        txtFilePath,
        'Este é um arquivo de texto com nome válido, mas não é um PDF',
      );

      try {
        const response = await request(app.getHttpServer())
          .post('/faturas')
          .attach('file', txtFilePath)
          .expect((res) => {
            if (res.status < 400) {
              throw new Error(
                `Esperado status >= 400, mas recebeu ${res.status}`,
              );
            }
          });

        if (response.body.message) {
          expect(response.body.message.toLowerCase()).toMatch(
            /pdf|arquivo|permitido/i,
          );
        }

        const faturas = await prisma.fatura.findMany();
        expect(faturas).toHaveLength(0);

        const clientes = await prisma.cliente.findMany();
        expect(clientes).toHaveLength(0);
      } catch (error) {
        if (
          error.code === 'ECONNRESET' ||
          error.message?.includes('ECONNRESET')
        ) {
          const faturas = await prisma.fatura.findMany();
          expect(faturas).toHaveLength(0);

          const clientes = await prisma.cliente.findMany();
          expect(clientes).toHaveLength(0);
        } else {
          throw error;
        }
      } finally {
        if (fs.existsSync(txtFilePath)) {
          fs.unlinkSync(txtFilePath);
        }
      }
    });
  });

  // ========================================
  // POST /faturas - REGRAS DE DUPLICATAS
  // ========================================
  describe('POST /faturas - Regras de Duplicatas', () => {
    it('não deve permitir salvar fatura duplicada (mesma instalação + mês)', async () => {
      const pdfPath = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-01-2024.pdf',
      );

      if (!fs.existsSync(pdfPath)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdfPath}`);
      }

      setCurrentFileName('1001-3001116735-01-2024.pdf');

      // Primeiro upload - deve ter sucesso
      const response1 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdfPath);

      if (response1.status !== 201) {
        console.log('Erro no primeiro upload:', response1.body);
      }
      expect(response1.status).toBe(201);
      expect(response1.body.mensagem).toBe('Fatura processada com sucesso');
      expect(response1.body.resposta.instalacao).toBe('3001116735');
      expect(response1.body.resposta.mes_referencia).toBe('JAN/2024');

      setCurrentFileName('1001-3001116735-01-2024.pdf');

      // Segundo upload (mesma instalação + mês) - deve falhar
      const response2 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdfPath);

      expect(response2.status).toBe(500);
      expect(response2.body.message).toContain('Já existe uma fatura');
      expect(response2.body.message).toContain('3001116735');
      expect(response2.body.message).toContain('JAN/2024');
    });

    it('deve permitir salvar faturas da mesma instalação em meses diferentes', async () => {
      const pdf1Path = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-01-2024.pdf',
      );
      const pdf2Path = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-02-2024.pdf',
      );

      if (!fs.existsSync(pdf1Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf1Path}`);
      }
      if (!fs.existsSync(pdf2Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf2Path}`);
      }

      // Upload 1 - Janeiro 2024
      setCurrentFileName('1001-3001116735-01-2024.pdf');
      const response1 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf1Path);

      if (response1.status !== 201) {
        console.log('Erro no upload de janeiro:', response1.body);
      }
      expect(response1.status).toBe(201);
      expect(response1.body.mensagem).toBe('Fatura processada com sucesso');
      expect(response1.body.resposta.instalacao).toBe('3001116735');
      expect(response1.body.resposta.mes_referencia).toBe('JAN/2024');

      // Upload 2 - Fevereiro 2024 (mesma instalação, mês diferente)
      setCurrentFileName('1001-3001116735-02-2024.pdf');
      const response2 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf2Path);

      if (response2.status !== 201) {
        console.log('Erro no upload de fevereiro:', response2.body);
      }
      expect(response2.status).toBe(201);
      expect(response2.body.mensagem).toBe('Fatura processada com sucesso');
      expect(response2.body.resposta.instalacao).toBe('3001116735');
      expect(response2.body.resposta.mes_referencia).toBe('FEV/2024');

      // Verifica que ambas as faturas foram salvas
      const faturas = await prisma.fatura.findMany({
        where: { instalacao: '3001116735' },
      });

      expect(faturas).toHaveLength(2);
      const meses = faturas.map((f) => f.mes_referencia).sort();
      expect(meses).toEqual(['FEV/2024', 'JAN/2024']);
    });
  });

  // ========================================
  // POST /faturas - GERENCIAMENTO DE CLIENTES
  // ========================================
  describe('POST /faturas - Gerenciamento de Clientes', () => {
    it('não deve criar cliente duplicado ao processar múltiplas faturas da mesma instalação', async () => {
      const pdf1Path = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-01-2024.pdf',
      );
      const pdf2Path = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-02-2024.pdf',
      );

      if (!fs.existsSync(pdf1Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf1Path}`);
      }
      if (!fs.existsSync(pdf2Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf2Path}`);
      }

      // Upload 1 - Janeiro 2024
      setCurrentFileName('1001-3001116735-01-2024.pdf');
      const response1 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf1Path);

      expect(response1.status).toBe(201);
      const clienteId1 = response1.body.resposta.clienteId;

      // Upload 2 - Fevereiro 2024 (mesma instalação)
      setCurrentFileName('1001-3001116735-02-2024.pdf');
      const response2 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf2Path);

      expect(response2.status).toBe(201);
      const clienteId2 = response2.body.resposta.clienteId;

      // Verifica que ambas as faturas usam o MESMO clienteId
      expect(clienteId1).toBe(clienteId2);

      // Verifica que existe apenas 1 cliente no banco
      const clientes = await prisma.cliente.findMany();
      expect(clientes).toHaveLength(1);
      expect(clientes[0].id).toBe(clienteId1);
      expect(clientes[0].numero_cliente).toBe('1001');

      // Verifica que as 2 faturas têm o mesmo clienteId
      const faturas = await prisma.fatura.findMany({
        where: { instalacao: '3001116735' },
      });

      expect(faturas).toHaveLength(2);
      expect(faturas[0].clienteId).toBe(clienteId1);
      expect(faturas[1].clienteId).toBe(clienteId1);
    });

    it('deve criar clientes distintos para números de cliente diferentes', async () => {
      const pdf1Path = path.join(
        __dirname,
        'fixtures',
        '1001-3001116735-01-2024.pdf',
      );
      const pdf2Path = path.join(
        __dirname,
        'fixtures',
        '1002-3001422762-01-2024.pdf',
      );
      const pdf3Path = path.join(
        __dirname,
        'fixtures',
        '1003-3001422762-02-2024.pdf',
      );

      if (!fs.existsSync(pdf1Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf1Path}`);
      }
      if (!fs.existsSync(pdf2Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf2Path}`);
      }
      if (!fs.existsSync(pdf3Path)) {
        throw new Error(`Arquivo de teste não encontrado: ${pdf3Path}`);
      }

      // Upload 1 - Cliente 1001
      setCurrentFileName('1001-3001116735-01-2024.pdf');
      const response1 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf1Path);

      expect(response1.status).toBe(201);
      const clienteId1 = response1.body.resposta.clienteId;

      // Upload 2 - Cliente 1002
      setCurrentFileName('1002-3001422762-01-2024.pdf');
      const response2 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf2Path);

      expect(response2.status).toBe(201);
      const clienteId2 = response2.body.resposta.clienteId;

      // Upload 3 - Cliente 1003
      setCurrentFileName('1003-3001422762-02-2024.pdf');
      const response3 = await request(app.getHttpServer())
        .post('/faturas')
        .attach('file', pdf3Path);

      expect(response3.status).toBe(201);
      const clienteId3 = response3.body.resposta.clienteId;

      // Verifica que os 3 clientes são diferentes
      expect(clienteId1).not.toBe(clienteId2);
      expect(clienteId1).not.toBe(clienteId3);
      expect(clienteId2).not.toBe(clienteId3);

      // Verifica que existem 3 clientes no banco
      const clientes = await prisma.cliente.findMany({
        orderBy: { numero_cliente: 'asc' },
      });
      expect(clientes).toHaveLength(3);
      expect(clientes[0].numero_cliente).toBe('1001');
      expect(clientes[1].numero_cliente).toBe('1002');
      expect(clientes[2].numero_cliente).toBe('1003');

      // Verifica que cada fatura tem seu respectivo cliente
      const fatura1 = await prisma.fatura.findFirst({
        where: { instalacao: '3001116735' },
      });
      const fatura2 = await prisma.fatura.findFirst({
        where: { instalacao: '3001422762', mes_referencia: 'JAN/2024' },
      });
      const fatura3 = await prisma.fatura.findFirst({
        where: { instalacao: '3001422762', mes_referencia: 'FEV/2024' },
      });

      expect(fatura1?.clienteId).toBe(clienteId1);
      expect(fatura2?.clienteId).toBe(clienteId2);
      expect(fatura3?.clienteId).toBe(clienteId3);
    });
  });
});
