-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "mes_referencia_data" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Fatura_mes_referencia_data_idx" ON "Fatura"("mes_referencia_data");
