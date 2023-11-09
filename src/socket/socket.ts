import { Server, ServerOptions } from 'socket.io';

import { popAuth } from '@src/socket/calbacks';

import { UserTypes, ISocketEvent, SocketEvents } from './types';

class SocketIOServer extends Server {
  //todo: upgrade this type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private io: any;

  constructor(httpServer: Express.Application, options?: Partial<ServerOptions>) {
    super(httpServer);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    //middleware de conexao
    this.io.use((socket, next) => {
      const username = socket.handshake.auth.username;
      const hasValidEvent =
        username.includes(UserTypes.WALLET) ||
        username.includes(UserTypes.POPUP_AUTH) ||
        username.includes(UserTypes.POPUP_TRANSFER);
      if (!username || !hasValidEvent) {
        return next(new Error('invalid username'));
      }

      socket.username = username;

      next();
    });

    this.io.on(SocketEvents.CONNECTION, socket => {
      //[to list all users]
      // const users: ISocketUser[] = [];
      // for (const [id, socket] of this.io.of('/').sockets) {
      //   users.push({ userID: id, username: socket.username });
      // }
      socket.broadcast.emit(SocketEvents.USER_CONNECTED, {
        userID: socket.id,
        username: socket.username,
      });
      /* 
        [WALLET]
        - complement this connection depends to event content
        - for exemple, complement payload to message to send to client
      */
      socket.on('[WALLET]', ({ content, to }: ISocketEvent) => {
        console.log('[WALLET]');
        socket.to(to).emit('[WALLET]', {
          content,
          from: socket.id,
        });
      });

      /* 
        [POPUP_TRANSFER]
        - complement this connection depends to event content
        - for exemple, complement payload to message to send to client
      */
      socket.on(
        SocketEvents.TRANSACTION_APPROVED,
        async ({ content, to }: ISocketEvent) => {
          popAuth[SocketEvents.TRANSACTION_APPROVED](socket, { content, to });
        },
      );

      /* 
        [POPUP_AUTH]
        - complement this connection depends to event content
        - for exemple, complement payload to message to send to client
      */
      socket.on(
        SocketEvents.AUTH_CONFIRMED,
        async ({ content, to }: ISocketEvent) => {
          popAuth[SocketEvents.AUTH_CONFIRMED](socket, { content, to });
        },
      );
    });

    this.io.on(SocketEvents.DISCONNECT, socket => {
      socket.broadcast.emit('user disconnected', {
        userID: socket.id,
        username: socket.username,
      });
    });
  }
}

export default SocketIOServer;
