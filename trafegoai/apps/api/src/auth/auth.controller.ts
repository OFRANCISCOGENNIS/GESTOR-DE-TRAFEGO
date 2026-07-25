import { Body, Controller, Get, Post, UnauthorizedException, Headers } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "crypto";
import { PrismaService } from "../prisma.service";

// Auth JWT (registro/login) + /auth/me.
// PONTO DE INTEGRAÇÃO: Google OAuth e recuperação de senha por e-mail.
@Controller("auth")
export class AuthController {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private hash(pw: string) {
    return createHash("sha256").update(pw + (process.env.PW_SALT || "trafegoai")).digest("hex");
  }

  @Post("register")
  async register(@Body() body: { name: string; email: string; password: string }) {
    let org = await this.prisma.organization.findFirst();
    if (!org) org = await this.prisma.organization.create({ data: { name: `${body.name} — Agência` } });
    const user = await this.prisma.user.create({
      data: { name: body.name, email: body.email, password: this.hash(body.password), orgId: org.id },
    });
    return { token: this.jwt.sign({ sub: user.id, email: user.email }), user: { name: user.name, email: user.email } };
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user || user.password !== this.hash(body.password)) throw new UnauthorizedException("Credenciais inválidas");
    return { token: this.jwt.sign({ sub: user.id, email: user.email }), user: { name: user.name, email: user.email } };
  }

  @Get("me")
  async me(@Headers("authorization") auth?: string) {
    try {
      const payload = this.jwt.verify((auth || "").replace("Bearer ", ""));
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { org: true } });
      if (user) return { name: user.name, email: user.email, plan: user.org.plan };
    } catch {/* fallthrough */}
    const org = await this.prisma.organization.findFirst();
    return { name: "Gestor", email: "demo@trafegoai.com", plan: org?.plan || "pro" };
  }
}
