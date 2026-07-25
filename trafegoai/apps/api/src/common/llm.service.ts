import { Injectable, Logger } from "@nestjs/common";

// Camada de IA. Usa Claude (Anthropic) quando há ANTHROPIC_API_KEY;
// caso contrário, cai num fallback heurístico determinístico.
//
// PONTO DE INTEGRAÇÃO: substitua `callClaude` por uma chamada real à Messages API.
// Prompts documentados abaixo. Modelo recomendado: claude-sonnet-5.
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey = process.env.ANTHROPIC_API_KEY;

  get hasKey(): boolean {
    return !!this.apiKey;
  }

  // Prompt de diagnóstico:
  //   "Você é um gestor de tráfego pago sênior. Analise as métricas a seguir
  //    (JSON) e escreva, em português do Brasil e linguagem simples: o que vai
  //    bem, o que queima verba e por quê, e 1 recomendação principal."
  async diagnose(summary: any): Promise<string> {
    if (this.hasKey) return this.callClaude("diagnose", summary);
    const { spend, revenue, roas } = summary;
    return (
      `Nos últimos 30 dias você investiu R$ ${fmt(spend)} e gerou R$ ${fmt(revenue)} — ROAS de ${roas}. ` +
      `O que vai bem: remarketing sustenta o ROAS acima da média. O que queima verba: prospecção fria com CPA alto e criativos com fadiga. ` +
      `Recomendo realocar verba para as vencedoras e trocar os criativos cansados desta semana.`
    );
  }

  async chat(question: string, summary: any): Promise<string> {
    if (this.hasKey) return this.callClaude("chat", { question, summary });
    if (/roas/i.test(question)) return `Seu ROAS consolidado é ${summary.roas}. Escale as campanhas acima de 4 e revise as abaixo de 1,5.`;
    if (/cpa|custo/i.test(question)) return `Seu CPA médio é R$ ${fmt(summary.cpa)}. O maior ofensor é a prospecção fria — pausar ou trocar o criativo derruba a média.`;
    return `Investimento R$ ${fmt(summary.spend)}, receita R$ ${fmt(summary.revenue)}, ROAS ${summary.roas}. Posso detalhar por campanha se quiser.`;
  }

  private async callClaude(_task: string, _payload: any): Promise<string> {
    // TODO(integração): POST https://api.anthropic.com/v1/messages
    //   headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' }
    //   body: { model: 'claude-sonnet-5', max_tokens: 800, messages: [...] }
    this.logger.warn("callClaude não implementado — usando fallback");
    return this.diagnose(_payload?.summary ?? _payload);
  }
}

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}
