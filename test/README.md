# Guia de Testes

## Configuração Inicial

### 1. Subir o banco de dados de teste

```bash
docker-compose up -d postgres-test
```

### 2. Configurar o banco de teste

```bash
npm run test:db:setup
```

Este comando vai:
- Aplicar todas as migrations no banco de teste
- Gerar o Prisma Client

### 3. Instalar dependências (se ainda não fez)

```bash
npm install --save-dev dotenv-cli
```

## Rodando os Testes

### Testes E2E

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Rodar em modo watch
npm run test:e2e:watch
```

### Testes Unitários

```bash
# Rodar todos os testes unitários
npm test

# Rodar em modo watch
npm run test:watch

# Rodar com coverage
npm run test:cov
```

## Estrutura de Testes

```
test/
├── fixtures/              # Arquivos de teste (PDFs, etc)
│   └── fatura-teste.pdf
├── test-helpers.ts        # Funções auxiliares
├── setup-e2e.ts          # Configuração do ambiente de teste
├── faturas.e2e-spec.ts   # Testes E2E de faturas
└── jest-e2e.json         # Configuração do Jest para E2E
```

## Boas Práticas

1. **Isolamento**: Cada teste limpa o banco antes de executar
2. **Seeds**: Use dados fictícios, nunca dados reais de clientes
3. **Fixtures**: Coloque PDFs de teste na pasta `fixtures/`
4. **Cleanup**: Sempre limpe o banco após os testes

## Banco de Dados de Teste

- **Host**: localhost
- **Porta**: 5433 (diferente do dev que usa 5432)
- **Database**: lumi_test
- **User/Pass**: lumi/lumi

## Comandos Úteis

```bash
# Resetar banco de teste
dotenv -e .env.test -- npx prisma migrate reset

# Visualizar banco de teste no Prisma Studio
dotenv -e .env.test -- npx prisma studio

# Limpar containers
docker-compose down

# Limpar volumes (apaga todos os dados)
docker-compose down -v
```

## Casos de Teste Cobertos

### POST /faturas
- ✅ Processar PDF válido
- ✅ Rejeitar arquivo não-PDF
- ✅ Rejeitar requisição sem arquivo
- ✅ Impedir duplicatas (mesma instalação + mês)

### GET /faturas
- ✅ Listar todas as faturas
- ✅ Filtrar por número de cliente
- ✅ Filtrar por mês específico
- ✅ Filtrar por período
- ✅ Retornar dados do cliente incluídos
- ✅ Retornar erro quando cliente não existe

## Troubleshooting

**Erro de conexão com banco:**
- Verifique se o container postgres-test está rodando: `docker ps`
- Verifique se a porta 5433 está livre: `netstat -an | findstr 5433`

**Migrations não aplicadas:**
- Rode `npm run test:db:setup` novamente

**Testes falhando:**
- Verifique se as variáveis de ambiente em `.env.test` estão corretas
- Limpe o banco: `dotenv -e .env.test -- npx prisma migrate reset`
