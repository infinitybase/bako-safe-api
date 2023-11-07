import { Server, ServerOptions } from 'socket.io';

import { popAuth } from '@src/socket/popupAuth';

import { SocketChannels, ISocketEvent } from './types';

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
      ...options,
    });

    //middleware de conexao
    this.io.use((socket, next) => {
      const username = socket.handshake.auth.username;
      const hasValidEvent =
        username.includes(SocketChannels.WALLET) ||
        username.includes(SocketChannels.POPUP_AUTH) ||
        username.includes(SocketChannels.POPUP_TRANSFER);
      if (!username || !hasValidEvent) {
        return next(new Error('invalid username'));
      }

      console.log('[user_connectted]:', username);
      socket.username = username;
      next();
    });

    this.io.on('connection', socket => {
      //[to list all users]
      // const users: ISocketUser[] = [];
      // for (const [id, socket] of this.io.of('/').sockets) {
      //   users.push({ userID: id, username: socket.username });
      // }

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
      socket.on('[POPUP_TRANSFER]', ({ content, to }: ISocketEvent) => {
        console.log('[POPUP_TRANSFER]');
        socket.to(to).emit('[POPUP_TRANSFER]', {
          content,
          from: socket.id,
        });
      });

      /* 
        [POPUP_AUTH]
        - complement this connection depends to event content
        - for exemple, complement payload to message to send to client
      */
      socket.on(
        SocketChannels.POPUP_AUTH,
        async ({ content, to }: ISocketEvent) => {
          const { type } = content;
          popAuth[type](socket, { content, to });
        },
      );
    });

    this.io.on('disconnect', socket => {
      socket.broadcast.emit('user disconnected', {
        userID: socket.id,
        username: socket.username,
      });
    });
  }
}

export default SocketIOServer;
