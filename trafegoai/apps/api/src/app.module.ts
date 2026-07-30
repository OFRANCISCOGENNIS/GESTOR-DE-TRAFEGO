import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";
import { MetricsService } from "./metrics/metrics.service";
import { LlmService } from "./common/llm.service";
import { RealtimeGateway } from "./realtime/realtime.gateway";
import { AuthController } from "./auth/auth.controller";
import {
  DashboardController, CampaignsController, InsightsController,
  RulesController, RadarController,
} from "./api.controllers";
import { MiscController } from "./misc.controllers";
import { ConnectionsController } from "./connections/connections.controller";
import { MetaSyncService } from "./connections/meta.sync.service";
import { MetaConnector } from "./connectors/meta.connector";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "trafegoai-dev-secret",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [
    AuthController, DashboardController, CampaignsController,
    InsightsController, RulesController, RadarController,
    ConnectionsController, MiscController,
  ],
  providers: [
    PrismaService, MetricsService, LlmService, RealtimeGateway,
    MetaConnector, MetaSyncService,
  ],
})
export class AppModule {}
