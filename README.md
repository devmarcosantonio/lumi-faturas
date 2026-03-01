# Lumi Faturas API

Sistema de processamento e análise de faturas de energia elétrica utilizando IA para extração automática de dados de PDFs.

## Descrição

API REST desenvolvida para processar faturas de energia elétrica em formato PDF, extrair informações estruturadas usando OpenAI (GPT-4o-mini), calcular valores derivados, armazenar dados em PostgreSQL e fazer upload dos arquivos para AWS S3.

## Tecnologias Utilizadas

- **NestJS** 11.0.1 - Framework Node.js
- **TypeScript** - Linguagem de programação
- **PostgreSQL** 16 - Banco de dados relacional
- **Prisma** 7.4.1 - ORM
- **OpenAI API** - Extração de dados via GPT-4o-mini
- **AWS S3** - Armazenamento de arquivos PDF
- **pdf-parse** 2.4.5 - Extração de texto de PDFs
- **Zod** - Validação de schemas
- **Docker** - Containerização do banco de dados

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Conta AWS com S3 configurado
- Chave de API da OpenAI

## Instalação

### 1. Clonar o repositório

```bash
git clone <repository-url>
cd lumi-faturas
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://lumi:lumi@localhost:5432/lumi"
OPENAI_API_KEY="sua-chave-openai"
AWS_ACCESS_KEY_ID="sua-access-key-aws"
AWS_SECRET_ACCESS_KEY="sua-secret-key-aws"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="nome-do-bucket"
```

### 4. Iniciar banco de dados (Docker)

```bash
docker-compose up -d
```

### 5. Executar migrações do Prisma

```bash
npx prisma migrate dev
npx prisma generate
```

### 6. Iniciar aplicação

**Modo desenvolvimento:**

```bash
npm run start:dev
```

**Modo produção:**

```bash
npm run build
npm run start:prod
```

A API estará disponível em `http://localhost:3000`

## Endpoints da API

### Faturas

#### POST /faturas

Upload e processamento de fatura em PDF.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `file` (PDF, max 10MB)

**Response:**

```json
{
  "mensagem": "Fatura processada com sucesso",
  "resposta": {
    "id": "uuid",
    "clienteId": "uuid",
    "instalacao": "3004298116",
    "mes_referencia": "JAN/2026",
    "mes_referencia_data": "2026-01-01T00:00:00.000Z",
    "data_vencimento": "2026-02-10T00:00:00.000Z",
    "energia_eletrica_quantidade": 100.5,
    "energia_eletrica_valor": 50.25,
    "energia_sceee_icms_quantidade": 150.3,
    "energia_sceee_icms_valor": 75.15,
    "energia_compensada_gd_quantidade": 250.8,
    "energia_compensada_gd_valor": -125.40,
    "contrib_ilum_publica_valor": 45.50,
    "consumo_energia_eletrica_kwh": 250.8,
    "energia_compensada_kwh": 250.8,
    "valor_total_sem_gd": 170.90,
    "economia_gd": -125.40,
    "url_download_fatura": "https://bucket.s3.amazonaws.com/...",
    "resposta_json_llm": { ... },
    "cliente": { ... },
    "createdAt": "2026-03-01T22:00:00.000Z",
    "updatedAt": "2026-03-01T22:00:00.000Z"
  }
}
```

#### GET /faturas

Buscar faturas com filtros opcionais.

**Query Parameters:**

- `numero_cliente` (opcional) - Número do cliente
- `mes_referencia` (opcional) - Mês específico no formato YYYY-MM (ex: 2026-01)
- `mes_referencia_inicio` (opcional) - Data início do período YYYY-MM
- `mes_referencia_fim` (opcional) - Data fim do período YYYY-MM

**Exemplos:**

```bash
# Buscar todas as faturas
GET /faturas

# Filtrar por cliente
GET /faturas?numero_cliente=7202210726

# Filtrar por mês específico
GET /faturas?mes_referencia=2026-01

# Filtrar por período
GET /faturas?mes_referencia_inicio=2025-01&mes_referencia_fim=2025-12

# Combinar filtros
GET /faturas?numero_cliente=7202210726&mes_referencia=2026-01
```

**Response:**

```json
[
  {
    "id": "uuid",
    "clienteId": "uuid",
    "instalacao": "3004298116",
    "mes_referencia": "JAN/2026",
    "mes_referencia_data": "2026-01-01T00:00:00.000Z",
    ...
    "cliente": {
      "id": "uuid",
      "numero_cliente": "7202210726",
      "nome": "Nome do Cliente",
      "uf": "SC",
      "municipio": "Cidade",
      "cep": "12345678"
    }
  }
]
```

## Estrutura do Projeto

```
src/
├── clientes/          # Módulo de clientes
│   ├── clientes.controller.ts
│   ├── clientes.service.ts
│   ├── clientes.repository.ts
│   └── clientes.module.ts
├── faturas/           # Módulo de faturas (principal)
│   ├── faturas.controller.ts
│   ├── faturas.service.ts
│   ├── faturas.repository.ts
│   └── faturas.module.ts
├── open-ai/           # Integração OpenAI
│   ├── open-ai.service.ts
│   └── open-ai.module.ts
├── prisma/            # Configuração Prisma
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── s3/                # Integração AWS S3
│   └── s3.service.ts
├── utils/             # Utilitários
│   └── date.utils.ts
├── app.module.ts
└── main.ts

prisma/
├── schema.prisma      # Schema do banco de dados
└── migrations/        # Migrações
```

## Fluxo de Processamento de Faturas

1. **Upload PDF**: Usuário envia arquivo PDF via endpoint POST /faturas
2. **Extração de Texto**: Sistema usa pdf-parse para extrair texto do PDF
3. **Análise IA**: OpenAI (GPT-4o-mini) extrai dados estruturados em JSON
4. **Validação**: Zod valida schema dos dados extraídos
5. **Gerenciamento de Cliente**: Busca ou cria cliente no banco de dados
6. **Verificação de Duplicatas**: Valida se fatura já existe (cliente + mês)
7. **Cálculos Derivados**: Calcula valores agregados
8. **Upload S3**: Faz upload do PDF para AWS S3 (opcional)
9. **Persistência**: Salva fatura e dados relacionados no PostgreSQL
10. **Resposta**: Retorna fatura processada ao cliente

## Campos Calculados Automaticamente

- **consumo_energia_eletrica_kwh**: Energia Elétrica + Energia SCEE
- **energia_compensada_kwh**: Valor da Energia Compensada GD
- **valor_total_sem_gd**: Energia Elétrica + Energia SCEE + Contrib. Iluminação
- **economia_gd**: Valor da compensação (geralmente negativo)

## Validações de Duplicatas

O sistema impede o cadastro de faturas duplicadas verificando:

- Mesmo número de cliente
- Mesmo mês de referência

## Schema do Banco de Dados

### Cliente

- id (UUID)
- numero_cliente (String, único)
- nome (String)
- uf (String)
- municipio (String)
- cep (String)
- createdAt / updatedAt

### Fatura

- id (UUID)
- clienteId (UUID, FK)
- instalacao (String)
- mes_referencia (String - formato: JAN/2026)
- mes_referencia_data (DateTime - primeiro dia do mês)
- data_vencimento (DateTime)
- energia_eletrica_quantidade / valor (Decimal)
- energia_sceee_icms_quantidade / valor (Decimal)
- energia_compensada_gd_quantidade / valor (Decimal)
- contrib_ilum_publica_valor (Decimal)
- consumo_energia_eletrica_kwh (Decimal, calculado)
- energia_compensada_kwh (Decimal, calculado)
- valor_total_sem_gd (Decimal, calculado)
- economia_gd (Decimal, calculado)
- url_download_fatura (String, nullable)
- resposta_json_llm (JSON)
- createdAt / updatedAt

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Produção
npm run start:prod

# Testes
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e

# Linting e formatação
npm run lint
npm run format

# Prisma
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

## Tratamento de Erros

A API retorna erros no formato:

```json
{
  "statusCode": 500,
  "message": "Descrição do erro",
  "error": "Internal Server Error"
}
```

**Códigos HTTP:**

- 200: Sucesso
- 400: Bad Request (arquivo inválido, campos obrigatórios faltando)
- 500: Internal Server Error (erro no processamento, OpenAI, S3, etc)

## Observações Importantes

- O upload para S3 é opcional - se falhar, o processamento continua sem a URL
- A IA pode retornar `null` para campos não encontrados no PDF
- O sistema valida apenas campos obrigatórios (cliente, instalação, mês, vencimento)
- Valores monetários usam 2 casas decimais, quantidades (kWh) usam 3 casas
- O filtro de período usa o campo `mes_referencia_data` para buscas eficientes

## Licença

UNLICENSED
