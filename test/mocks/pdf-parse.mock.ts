// Mock simples do pdf-parse para ambiente de teste
export class PDFParse {
  constructor(private options: { data: Buffer }) {}

  async getText(): Promise<{ text: string }> {
    // Retorna texto genérico - o OpenAI mock ignora isso de qualquer forma
    return {
      text: 'Texto genérico de fatura para teste',
    };
  }

  async destroy(): Promise<void> {
    // Não faz nada - é só um mock
  }
}
