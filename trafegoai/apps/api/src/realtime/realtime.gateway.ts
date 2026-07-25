import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Server } from "socket.io";
import Redis from "ioredis";

// Tempo real via Socket.IO com relay por Redis pub/sub: eventos do worker
// (regras agendadas) e de qualquer réplica da API chegam a todos os clientes.
@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class RealtimeGateway implements OnModuleInit {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() server: Server;
  private sub?: Redis;

  onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) return;
    this.sub = new Redis(url);
    this.sub.subscribe("trafegoai:events");
    this.sub.on("message", (_ch, msg) => {
      try {
        const evt = JSON.parse(msg);
        this.server.emit(evt.type, evt.payload);
      } catch (e) {
        this.logger.warn(`evento inválido: ${msg}`);
      }
    });
  }

  emitLocal(type: string, payload: unknown) {
    this.server?.emit(type, payload);
  }
}

// Publisher usado pelo worker (processo separado) para relayar via Redis.
export class RealtimeRedisPublisher {
  private pub?: Redis;
  constructor() {
    if (process.env.REDIS_URL) this.pub = new Redis(process.env.REDIS_URL);
  }
  async publish(type: string, payload: unknown) {
    if (!this.pub) return;
    await this.pub.publish("trafegoai:events", JSON.stringify({ type, payload }));
  }
}
