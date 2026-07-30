import { MetaApiError } from './meta.connector';

// A classificação do erro decide o que a interface mostra e se a conexão é
// marcada como expirada. Confundir "sem internet" com "token inválido" faria
// o painel pedir reconexão sem necessidade.
describe('classificação de erros da Meta', () => {
  it('token expirado pede reconexão', () => {
    expect(new MetaApiError('Token expirou', 190).needsReauth).toBe(true);
  });

  it('OAuthException pede reconexão mesmo sem código', () => {
    expect(new MetaApiError('Sessão inválida', undefined, 'OAuthException').needsReauth).toBe(true);
  });

  it('falha de rede NÃO pede reconexão', () => {
    const e = new MetaApiError('proxy bloqueou', undefined, undefined, true);
    expect(e.isNetwork).toBe(true);
    expect(e.needsReauth).toBe(false);
  });

  it('falha de rede com código de OAuth ainda não pede reconexão', () => {
    // Guarda contra marcar a conta como expirada quando o problema é infraestrutura.
    const e = new MetaApiError('sem conexão', 190, 'OAuthException', true);
    expect(e.needsReauth).toBe(false);
  });

  it('reconhece limite de chamadas', () => {
    expect(new MetaApiError('limite', 4).isRateLimit).toBe(true);
    expect(new MetaApiError('limite de usuário', 17).isRateLimit).toBe(true);
    expect(new MetaApiError('erro comum', 100).isRateLimit).toBe(false);
  });

  it('erro comum de permissão não é rede nem reconexão', () => {
    const e = new MetaApiError('Permissão ausente', 200);
    expect(e.isNetwork).toBe(false);
    expect(e.needsReauth).toBe(false);
    expect(e.isRateLimit).toBe(false);
  });
});
