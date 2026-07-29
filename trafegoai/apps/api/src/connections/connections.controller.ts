// Fluxo de conexão de contas de anúncios.
// Hoje implementa a Meta de ponta a ponta; Google e TikTok entram no mesmo formato.
import { Body, Controller, Get, Param, Post, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { MetaConnector } from '../connectors/meta.connector';
import { MetaSyncService } from './meta.sync.service';
import { encryptToken } from '../common/crypto.util';

// Guarda o estado do OAuth por poucos minutos (protege contra CSRF).
const pending = new Map<string, { clientId: string; at: number }>();
const TEN_MIN = 10 * 60 * 1000;
function cleanup() {
  const now = Date.now();
  pending.forEach((v, k) => { if (now - v.at > TEN_MIN) pending.delete(k); });
}

@Controller('connections')
export class ConnectionsController {
  constructor(
    private prisma: PrismaService,
    private meta: MetaConnector,
    private sync: MetaSyncService,
  ) {}

  @Get()
  async list() {
    const conns = await this.prisma.connection.findMany({ include: { client: true } });
    return conns.map((c) => ({
      id: c.id, platform: c.platform, accountName: c.accountName, status: c.status,
      lastSync: c.lastSync, clientId: c.clientId, clientName: c.client?.name,
      externalAccountId: c.externalAccountId,
    }));
  }

  /** Diz ao frontend quais plataformas já têm credenciais configuradas. */
  @Get('status')
  status() {
    return {
      meta: {
        configured: this.meta.isConfigured,
        comoConfigurar: this.meta.isConfigured
          ? null
          : 'Defina META_APP_ID e META_APP_SECRET no ambiente da API. Veja INTEGRACAO_APIS.md.',
      },
      google: { configured: false, comoConfigurar: 'Depende do token de desenvolvedor do Google Ads.' },
      tiktok: { configured: false, comoConfigurar: 'Depende da aprovação do app no TikTok for Business.' },
    };
  }

  /** Passo 1: devolve a URL de autorização da Meta. */
  @Post('meta/authorize')
  authorize(@Body() body: { clientId: string }) {
    if (!this.meta.isConfigured)
      throw new BadRequestException('Meta não configurada. Defina META_APP_ID e META_APP_SECRET.');
    if (!body?.clientId) throw new BadRequestException('Informe o cliente que receberá a conta.');
    cleanup();
    const state = randomBytes(16).toString('hex');
    pending.set(state, { clientId: body.clientId, at: Date.now() });
    return { authUrl: this.meta.buildAuthUrl(state) };
  }

  /** Passo 2: a Meta redireciona para cá com o código. */
  @Get('meta/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const web = process.env.WEB_ORIGIN || 'http://localhost:3000';
    const entry = state ? pending.get(state) : null;
    if (!code || !entry) return res.redirect(`${web}/connections?erro=autorizacao_invalida`);
    pending.delete(state);

    try {
      const short = await this.meta.exchangeCode(code);
      const long = await this.meta.exchangeForLongLived(short.accessToken);
      const accounts = await this.meta.listAdAccounts(long.accessToken);
      if (!accounts.length) return res.redirect(`${web}/connections?erro=sem_contas`);

      // Cria uma conexão por conta de anúncios encontrada.
      for (const acc of accounts) {
        const existing = await this.prisma.connection.findFirst({
          where: { platform: 'meta', externalAccountId: acc.id },
        });
        const data = {
          accountName: acc.name || acc.id,
          externalAccountId: acc.id,
          accessToken: encryptToken(long.accessToken),
          status: 'active',
          lastSync: new Date(),
          clientId: entry.clientId,
        };
        if (existing) await this.prisma.connection.update({ where: { id: existing.id }, data });
        else await this.prisma.connection.create({ data: { ...data, platform: 'meta' } });
      }

      await this.prisma.auditLog.create({
        data: { action: 'Conectou contas da Meta', target: `${accounts.length} conta(s)`, user: 'você' },
      });
      return res.redirect(`${web}/connections?conectado=${accounts.length}`);
    } catch (e) {
      return res.redirect(`${web}/connections?erro=${encodeURIComponent((e as Error).message)}`);
    }
  }

  /** Puxa as métricas agora. */
  @Post(':id/sync')
  async syncNow(@Param('id') id: string, @Body() body: { days?: number }) {
    return this.sync.syncConnection(id, body?.days ?? 30);
  }

  @Post(':id/disconnect')
  async disconnect(@Param('id') id: string) {
    const c = await this.prisma.connection.findUnique({ where: { id } });
    if (!c) throw new BadRequestException('Conexão não encontrada');
    await this.prisma.connection.update({
      where: { id },
      data: { accessToken: null, refreshToken: null, status: 'expired' },
    });
    await this.prisma.auditLog.create({
      data: { action: 'Desconectou conta', target: c.accountName, user: 'você' },
    });
    return { ok: true };
  }
}
