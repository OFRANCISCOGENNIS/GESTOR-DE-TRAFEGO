import { normalizeMetaInsight, normalizeMetaInsights, pickPurchase } from './meta.normalize';

describe('normalização da Meta Marketing API', () => {
  it('converte uma linha completa para o schema comum', () => {
    const r = normalizeMetaInsight({
      date_start: '2026-07-20',
      campaign_id: '1234',
      campaign_name: 'Remarketing Julho',
      spend: '150.75',
      impressions: '20000',
      clicks: '450',
      frequency: '2.4',
      actions: [
        { action_type: 'link_click', value: '450' },
        { action_type: 'purchase', value: '12' },
      ],
      action_values: [{ action_type: 'purchase', value: '3600.50' }],
    });
    expect(r.date).toBe('2026-07-20');
    expect(r.externalCampaignId).toBe('1234');
    expect(r.spend).toBe(150.75);
    expect(r.revenue).toBe(3600.5);
    expect(r.impressions).toBe(20000);
    expect(r.clicks).toBe(450);
    expect(r.conversions).toBe(12);
    expect(r.frequency).toBe(2.4);
  });

  it('trata campos ausentes como zero, sem quebrar', () => {
    const r = normalizeMetaInsight({ date_start: '2026-07-21' });
    expect(r.spend).toBe(0);
    expect(r.revenue).toBe(0);
    expect(r.conversions).toBe(0);
    expect(r.impressions).toBe(0);
    expect(r.externalCampaignId).toBeNull();
  });

  it('ignora eventos que não são compra ao somar conversões', () => {
    const r = normalizeMetaInsight({
      date_start: '2026-07-22',
      actions: [
        { action_type: 'page_engagement', value: '900' },
        { action_type: 'landing_page_view', value: '300' },
      ],
    });
    expect(r.conversions).toBe(0);
  });

  it('não conta a mesma compra duas vezes quando a Meta repete o evento', () => {
    // A Meta costuma devolver omni_purchase e o evento de pixel para a mesma venda.
    const dupes = [
      { action_type: 'omni_purchase', value: '10' },
      { action_type: 'purchase', value: '10' },
      { action_type: 'offsite_conversion.fb_pixel_purchase', value: '10' },
    ];
    expect(pickPurchase(dupes)).toBe(10);
  });

  it('usa o evento de pixel quando não há omni_purchase', () => {
    expect(pickPurchase([{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '7' }])).toBe(7);
  });

  it('aceita valores numéricos além de string', () => {
    const r = normalizeMetaInsight({
      date_start: '2026-07-23',
      spend: 99.9,
      impressions: 1000,
      actions: [{ action_type: 'purchase', value: 3 }],
    });
    expect(r.spend).toBe(99.9);
    expect(r.conversions).toBe(3);
  });

  it('descarta linhas sem data e normaliza a lista inteira', () => {
    const rows = normalizeMetaInsights([
      { date_start: '2026-07-24', spend: '10' },
      { date_start: '', spend: '20' } as any,
      null as any,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].spend).toBe(10);
  });

  it('arredonda gasto e receita para duas casas', () => {
    const r = normalizeMetaInsight({
      date_start: '2026-07-25',
      spend: '10.999',
      action_values: [{ action_type: 'purchase', value: '20.005' }],
    });
    expect(r.spend).toBe(11);
    expect(r.revenue).toBe(20.01);
  });
});
