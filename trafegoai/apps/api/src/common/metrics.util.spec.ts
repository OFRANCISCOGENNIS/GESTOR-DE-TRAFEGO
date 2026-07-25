import { deriveKpi, sumMetrics, pctChange, zScores, detectAnomaly } from "./metrics.util";

describe("metrics.util — métricas derivadas", () => {
  it("deriva ROAS, ROI, CPA, CPC, CPM, CTR e taxa de conversão", () => {
    const k = deriveKpi({ spend: 1000, revenue: 3000, impressions: 100000, clicks: 2000, conversions: 100 });
    expect(k.roas).toBe(3);
    expect(k.roi).toBe(200);
    expect(k.cpa).toBe(10);
    expect(k.cpc).toBe(0.5);
    expect(k.cpm).toBe(10);
    expect(k.ctr).toBe(2);
    expect(k.convRate).toBe(5);
  });

  it("não divide por zero (retorna 0 nas derivadas)", () => {
    const k = deriveKpi({ spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 });
    expect(k.roas).toBe(0);
    expect(k.cpa).toBe(0);
    expect(k.cpc).toBe(0);
    expect(k.cpm).toBe(0);
    expect(k.ctr).toBe(0);
  });

  it("soma métricas de várias entidades", () => {
    const total = sumMetrics([
      { spend: 100, revenue: 200, impressions: 1000, clicks: 50, conversions: 5 },
      { spend: 50, revenue: 150, impressions: 500, clicks: 25, conversions: 3 },
    ]);
    expect(total.spend).toBe(150);
    expect(total.revenue).toBe(350);
    expect(total.conversions).toBe(8);
  });

  it("calcula variação percentual vs período anterior", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(80, 100)).toBe(-20);
    expect(pctChange(100, 0)).toBe(100);
    expect(pctChange(0, 0)).toBe(0);
  });

  it("z-score é 0 quando a série é constante", () => {
    expect(zScores([5, 5, 5, 5])).toEqual([0, 0, 0, 0]);
  });

  it("detecta anomalia quando o último ponto extrapola o threshold", () => {
    const spike = detectAnomaly([10, 11, 9, 10, 10, 60], 2);
    expect(spike).not.toBeNull();
    expect(spike!.z).toBeGreaterThan(2);
  });

  it("não sinaliza anomalia em série estável", () => {
    expect(detectAnomaly([10, 11, 9, 10, 12, 10], 2.5)).toBeNull();
  });
});
