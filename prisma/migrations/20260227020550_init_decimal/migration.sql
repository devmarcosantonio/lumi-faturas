/*
  Warnings:

  - You are about to alter the column `energia_eletrica_quantidade` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `energia_eletrica_valor` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `energia_sceee_icms_quantidade` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `energia_sceee_icms_valor` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `energia_compensada_gd_quantidade` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `energia_compensada_gd_valor` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `contrib_ilum_publica_valor` on the `Fatura` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - Added the required column `resposta_json_llm` to the `Fatura` table without a default value. This is not possible if the table is not empty.
  - Made the column `clienteId` on table `Fatura` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Fatura" DROP CONSTRAINT "Fatura_clienteId_fkey";

-- DropIndex
DROP INDEX "Cliente_cep_key";

-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "resposta_json_llm" JSONB NOT NULL,
ALTER COLUMN "energia_eletrica_quantidade" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "energia_eletrica_valor" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "energia_sceee_icms_quantidade" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "energia_sceee_icms_valor" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "energia_compensada_gd_quantidade" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "energia_compensada_gd_valor" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "contrib_ilum_publica_valor" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "clienteId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Cliente_numero_cliente_idx" ON "Cliente"("numero_cliente");

-- CreateIndex
CREATE INDEX "Fatura_clienteId_idx" ON "Fatura"("clienteId");

-- CreateIndex
CREATE INDEX "Fatura_mes_referencia_idx" ON "Fatura"("mes_referencia");

-- CreateIndex
CREATE INDEX "Fatura_clienteId_mes_referencia_idx" ON "Fatura"("clienteId", "mes_referencia");

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
