import { applyBudgetChange } from "./guardrails";

const G = { budgetFloor: 50, budgetCap: 500, maxChangePct: 20 };

describe("guardrails — orçamento das regras de automação", () => {
  it("permite variação dentro dos limites", () => {
    const r = applyBudgetChange(200, 20, G);
    expect(r.allowed).toBe(true);
    expect(r.finalBudget).toBe(240);
  });

  it("bloqueia variação acima do máximo por disparo", () => {
    const r = applyBudgetChange(200, 40, G);
    expect(r.allowed).toBe(false);
    expect(r.finalBudget).toBe(200);
    expect(r.reason).toMatch(/máximo/);
  });

  it("bloqueia quando ultrapassa o teto de orçamento", () => {
    const r = applyBudgetChange(490, 5, G); // 514,5 > 500
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/teto/);
  });

  it("bloqueia quando cai abaixo do piso", () => {
    const r = applyBudgetChange(55, -15, G); // 46,75 < 50
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/piso/);
  });

  it("permite redução dentro do piso e do limite de variação", () => {
    const r = applyBudgetChange(100, -20, G); // 80 >= 50
    expect(r.allowed).toBe(true);
    expect(r.finalBudget).toBe(80);
  });

  it("ignora teto quando budgetCap = 0 (sem teto)", () => {
    const r = applyBudgetChange(1000, 10, { budgetFloor: 0, budgetCap: 0, maxChangePct: 20 });
    expect(r.allowed).toBe(true);
    expect(r.finalBudget).toBe(1100);
  });
});
