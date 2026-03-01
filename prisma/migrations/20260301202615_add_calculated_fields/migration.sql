/*
  Warnings:

  - Added the required column `consumo_energia_eletrica_kwh` to the `Fatura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `economia_gd` to the `Fatura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `energia_compensada_kwh` to the `Fatura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor_total_sem_gd` to the `Fatura` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "consumo_energia_eletrica_kwh" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "economia_gd" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "energia_compensada_kwh" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "valor_total_sem_gd" DECIMAL(12,2) NOT NULL;
