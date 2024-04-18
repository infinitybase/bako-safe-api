import { BSAFEConnectorEvents } from 'bsafe';
import { Socket, Server, ServerOptions } from 'socket.io';

import { popAuth } from '@src/socket/calbacks';

import { UserTypes, ISocketEvent } from './types';

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
        username.includes(UserTypes.WALLET) ||
        username.includes(UserTypes.POPUP_AUTH) ||
        username.includes(UserTypes.POPUP_TRANSFER);
      if (!username || !hasValidEvent) {
        return next(new Error('invalid username'));
      }

      socket.username = username;

      next();
    });
    this.io.on(BSAFEConnectorEvents.CONNECTION, (socket: Socket) => {
      const { origin, sessionId } = socket.handshake.auth;

      const room = `${sessionId}:${origin}`;
      console.log('[USER_CONNECTED]: ', room);
      socket.join(room);
    });

    this.io.on(BSAFEConnectorEvents.CONNECTION, socket => {
      const { origin, sessionId, username } = socket.handshake.auth;
      const room = `${sessionId}:${origin}`;

      console.log(BSAFEConnectorEvents.CONNECTION, room, `${username}_connected`);
      socket.to(room).emit(BSAFEConnectorEvents.DEFAULT, {
        type: `${username}_connected`,
        data: [true],
      });

      /*
        [AVISA PARA O DAPP QUE A TRASACAO FOI CRIADA NA BSAFE: POPUP_TRANSFER -> DAPP]
        - envia o tx hash da transacao criada na BSAFEAPI
      */
      socket.on(
        BSAFEConnectorEvents.TRANSACTION_CREATED,
        async ({ content, to }: ISocketEvent) => {
          console.log(BSAFEConnectorEvents.TRANSACTION_CREATED, content, to);
          popAuth[BSAFEConnectorEvents.TRANSACTION_CREATED](socket, {
            content,
            to,
          });
        },
      );
      /*
        [REPASSA TRANSACAO PARA A POPUP: DAPP -> POPUP_TRANSFER]
      */
      socket.on(
        BSAFEConnectorEvents.TRANSACTION_SEND,
        async ({ content, to }: ISocketEvent) => {
          console.log(BSAFEConnectorEvents.TRANSACTION_SEND, content, to);
          popAuth[BSAFEConnectorEvents.TRANSACTION_SEND](socket, { content, to });
        },
      );

      /*
        [CONFIRMA QUE O USUÁRIO ESCOLHEU UM VAULT: POPUP_AUTH -> DAPP]
        - verifica se existe uma conexão do vault com o dapp
        - setta o vault escolhido para current vault
      */
      socket.on(
        BSAFEConnectorEvents.AUTH_CONFIRMED,
        async ({ content, to }: ISocketEvent) => {
          console.log(BSAFEConnectorEvents.AUTH_CONFIRMED, content, to);
          popAuth[BSAFEConnectorEvents.AUTH_CONFIRMED](socket, { content, to });
        },
      );

      /*
        [REMOVE CONEXÃO COM O DAPP: DAPP -> DAPP]
        - remove as contas conectas ao dapp
        - envia mensagens de conexão inválidando o auth
          - isConnected
          - accounts
          - currentAccount
      */
      socket.on(
        BSAFEConnectorEvents.AUTH_DISCONECT_DAPP,
        async ({ content, to }: ISocketEvent) => {
          console.log(BSAFEConnectorEvents.AUTH_DISCONECT_DAPP, content, to);
          popAuth[BSAFEConnectorEvents.AUTH_DISCONECT_DAPP](socket, {
            content,
            to,
          });
        },
      );
    });

    //todo: implementar, atualmente esse evento não é disparado
    // this.io.on(BSAFEConnectorEvents.DISCONNECT, socket => {
    //   socket.broadcast.emit('user disconnected', {
    //     userID: socket.id,
    //     username: socket.username,
    //   });
    // });
  }
}

export default SocketIOServer;
