-- CreateTable
CREATE TABLE "Fatura" (
    "id" TEXT NOT NULL,
    "numero_cliente" TEXT NOT NULL,
    "instalacao" TEXT NOT NULL,
    "mes_referencia" TEXT NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "energia_eletrica_quantidade" DOUBLE PRECISION NOT NULL,
    "energia_eletrica_valor" DOUBLE PRECISION NOT NULL,
    "energia_sceee_icms_quantidade" DOUBLE PRECISION NOT NULL,
    "energia_sceee_icms_valor" DOUBLE PRECISION NOT NULL,
    "energia_compensada_gd_quantidade" DOUBLE PRECISION NOT NULL,
    "energia_compensada_gd_valor" DOUBLE PRECISION NOT NULL,
    "contrib_ilum_publica_valor" DOUBLE PRECISION NOT NULL,
    "url_download_fatura" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "numero_cliente" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_numero_cliente_key" ON "Cliente"("numero_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cep_key" ON "Cliente"("cep");

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
