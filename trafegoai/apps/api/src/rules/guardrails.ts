// Guardrails de orçamento das regras de automação.
// Garante que nenhuma regra estoure piso, teto ou variação máxima por disparo.
// Funções puras — cobertas por guardrails.spec.ts.

export interface Guardrails {
  budgetFloor: number;
  budgetCap: number;
  maxChangePct: number;
}

export interface BudgetChange {
  allowed: boolean;
  finalBudget: number;
  reason?: string;
}

// Aplica uma variação percentual proposta ao orçamento atual, respeitando guardrails.
export function applyBudgetChange(
  currentBudget: number,
  proposedChangePct: number,
  g: Guardrails,
): BudgetChange {
  // 1. variação máxima por disparo
  if (Math.abs(proposedChangePct) > g.maxChangePct) {
    return {
      allowed: false,
      finalBudget: currentBudget,
      reason: `Variação ${proposedChangePct}% excede o máximo de ${g.maxChangePct}% por disparo`,
    };
  }

  let target = currentBudget * (1 + proposedChangePct / 100);

  // 2. teto
  if (g.budgetCap > 0 && target > g.budgetCap) {
    return {
      allowed: false,
      finalBudget: currentBudget,
      reason: `Orçamento alvo R$ ${round(target)} ultrapassa o teto R$ ${g.budgetCap}`,
    };
  }

  // 3. piso
  if (target < g.budgetFloor) {
    return {
      allowed: false,
      finalBudget: currentBudget,
      reason: `Orçamento alvo R$ ${round(target)} abaixo do piso R$ ${g.budgetFloor}`,
    };
  }

  return { allowed: true, finalBudget: round(target) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
