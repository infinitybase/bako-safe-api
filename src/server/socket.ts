import { Server, ServerOptions } from 'socket.io';

export interface ISocketUser {
  userID: string;
  username: string;
}

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
      if (!username) {
        return next(new Error('invalid username'));
      }
      socket.emit('user', username);
      console.log('[user_connectted]:', username);
      socket.username = username;
      next();
    });

    this.io.on('connection', socket => {
      const users: ISocketUser[] = [];
      for (const [id, socket] of this.io.of('/').sockets) {
        users.push({ userID: id, username: socket.username });
      }
      //socket.emit('users', users);
      socket.on('[WALLET]', ({ content, to }) => {
        console.log('[WALLET], content, to', content, to);
        socket.to(to).emit('[WALLET`]', {
          content,
          from: socket.id,
        });
      });

      socket.broadcast.emit('user connected', {
        userID: socket.id,
        username: socket.username,
      });

      socket.on('disconnect', () => {
        socket.broadcast.emit('user disconnected', socket.id);
      });
    });
  }
}

export default SocketIOServer;
