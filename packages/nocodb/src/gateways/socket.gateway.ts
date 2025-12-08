import crypto from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Server } from 'socket.io';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnModuleInit } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { Observable, lastValueFrom } from 'rxjs';
import { T } from '~/utils';
import { JwtStrategy } from '~/strategies/jwt.strategy';
import { TelemetryService } from '~/services/telemetry.service';
import { getApiTokenFromHeader } from '~/helpers';

function getHash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

const url = new URL(
  process.env.NC_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || '8080'}/`,
);
let namespace = url.pathname;
namespace += namespace.endsWith('/') ? '' : '/';

@WebSocketGateway({
  cors: {
    origin: '*',
    allowedHeaders: ['xc-auth', 'xc-token', 'authorization'],
    credentials: true,
  },
  namespace,
})
@Injectable()
export class SocketGateway implements OnModuleInit {
  // private server: HttpServer;
  private clients: { [id: string]: Socket } = {};
  private _jobs: { [id: string]: { last_message: any } } = {};
  @WebSocketServer()
  private _io: Server;

  constructor(
    private jwtStrategy: JwtStrategy,
    private telemetryService: TelemetryService,
    @Inject(HttpAdapterHost) private httpAdapterHost: HttpAdapterHost,
  ) {}

  @WebSocketServer()
  server: Server;

  /**
   * Helper method to extract boolean value from guard result (following GlobalGuard pattern)
   */
  private async extractBoolVal(
    canActivate: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (canActivate instanceof Observable) {
      return lastValueFrom(canActivate);
    } else if (
      typeof canActivate === 'boolean' ||
      canActivate instanceof Promise
    ) {
      return canActivate;
    }
    return false;
  }

  /**
   * WebSocket authentication middleware following NocoDB's authentication patterns
   */
  private async authenticateWebSocket(socket: Socket, next: (err?: Error) => void) {
    try {
      const handshake = socket.handshake as any;
      const context = new ExecutionContextHost([handshake]);
      let isAuthenticated = false;

      // First try JWT authentication (xc-auth header)
      if (handshake.headers?.['xc-auth']) {
        try {
          const guard = new (AuthGuard('jwt'))(context);
          const result = await this.extractBoolVal(guard.canActivate(context));
          if (result) {
            isAuthenticated = true;
            console.log('WebSocket: JWT authentication successful for user:', handshake.user?.id);
          }
        } catch (error) {
          console.log('WebSocket: JWT authentication failed:', error.message);
          if (error.message === 'Token Expired. Please login again.') {
            return next(new Error('Token Expired. Please login again.'));
          }
        }
      }

      // Fallback to API token authentication (xc-token header or Bearer token)
      if (!isAuthenticated && getApiTokenFromHeader({ headers: handshake.headers })) {
        try {
          const guard = new (AuthGuard('authtoken'))(context);
          const result = await this.extractBoolVal(guard.canActivate(context));
          if (result) {
            isAuthenticated = true;
            console.log('WebSocket: API token authentication successful');
          }
        } catch (error) {
          console.log('WebSocket: API token authentication failed:', error.message);
        }
      }

      // Check if authentication succeeded
      if (isAuthenticated) {
        next();
      } else {
        console.log('WebSocket: Authentication required - no valid credentials found');
        next(new Error('Authentication required'));
      }
    } catch (error) {
      console.log('WebSocket: Authentication middleware error:', error.message);
      next(new Error('Authentication failed'));
    }
  }

  async onModuleInit() {
    this.server
      .use((socket, next) => this.authenticateWebSocket(socket, next))
      .on('connection', (socket) => {
        this.clients[socket.id] = socket;
        const id = getHash(
          (process.env.NC_SERVER_UUID || T.id) +
            (socket?.handshake as any)?.user?.id,
        );

        console.log('WebSocket: Authenticated connection established:', socket.id);

        socket.on('page', (args) => {
          // T.page({ ...args, id });
          this.telemetryService.sendEvent({
            evt_type: '$pageview',
            ...args,
            id,
          });
        });
        socket.on('event', ({ event, ...args }) => {
          // T.event({ ...args, id });
          this.telemetryService.sendEvent({ evt_type: event, ...args, id });
        });

        socket.on('disconnect', () => {
          console.log('WebSocket: Connection disconnected:', socket.id);
          delete this.clients[socket.id];
        });
      });
  }

  public get io() {
    return this.server;
  }
}
