import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Express from 'express';
import http from 'http';
import morgan from 'morgan';
import { Socket, Server } from 'socket.io';

import { PredicateService } from '@src/modules/predicate/services';
import { router } from '@src/routes';

import { handleErrors } from '@middlewares/index';

import SocketIOServer from '../socket/socket';

const { API_PORT, PORT } = process.env;

class App {
  private readonly app: Express.Application;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpServer!: any;
  socketServer!: Server;

  constructor() {
    this.app = Express();
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandler();
  }

  async init() {
    // App
    const port = API_PORT || PORT || 3333;
    console.log('[APP] Starting application.');
    this.httpServer = http.createServer(this.app);
    this.httpServer.listen(port, () => {
      console.log(`[APP] Application running in http://localhost:${port}`);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socketServer = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.socketServer.on('connection', (socket: Socket) => {
      const room = `${socket.handshake.query.sessionId}:${socket.handshake.headers.origin}`;
      console.log('--->>>>', room);
      socket.join(room);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connections: any = {};

    router.get('/connections/:uuid/accounts', (req, res) => {
      try {
        const sessionId = req.params.uuid;
        const origin = req.header('origin') || req.header('Origin');

        console.log(connections);

        if (!connections[`${sessionId}:${origin}`]) {
          return res.status(400).send({
            message: 'Not authorized for connection',
          });
        }

        res.send({
          data: connections[`${sessionId}:${origin}`].accounts,
        });
      } catch (e) {
        console.log(e);
      }
    });

    router.get('/connections/:uuid/currentAccount', (req, res) => {
      const sessionId = req.params.uuid;
      const origin = req.header('origin') || req.header('Origin');

      if (!connections[`${sessionId}:${origin}`]) {
        return res.status(400).send({
          message: 'Not authorized for connection',
        });
      }

      res.send({
        data: connections[`${sessionId}:${origin}`].accounts[0],
      });
    });

    router.get('/connections/:uuid/state', (req, res) => {
      const sessionId = req.params.uuid;
      const origin = req.header('origin');
      res.send({
        data: !!connections[`${sessionId}:${origin}`],
      });
    });

    // TODO:
    // - Add mid auth
    router.post('/connections/:uuid', async (req, res) => {
      const sessionId = req.params.uuid;
      const { origin, vaultId } = req.body;
      const { predicateAddress: address } = await new PredicateService().findById(
        vaultId,
      );
      connections[`${sessionId}:${origin}`] = {
        origin,
        vaultId,
        accounts: [address],
      };

      this.socketServer.to(`${sessionId}:${origin}`).emit('message', {
        type: 'connection',
        data: [true],
      });
      this.socketServer.to(`${sessionId}:${origin}`).emit('message', {
        type: 'accounts',
        data: [[address]],
      });
      this.socketServer.to(`${sessionId}:${origin}`).emit('message', {
        type: 'currentAccount',
        data: [address],
      });

      res.send({
        mesage: 'hellow',
      });
    });
  }

  private initMiddlewares() {
    this.app.use(bodyParser.urlencoded({ limit: '100mb', extended: false })); // Parse application/x-www-form-urlencoded
    this.app.use(bodyParser.json({ limit: '100mb' })); // Parse application/json
    this.app.use(cookieParser());
    this.app.use(Express.json());
    this.app.use(cors());
    this.app.use(morgan('dev'));
  }

  private initRoutes() {
    this.app.use(router);
    this.app.set('socketServer', this.socketServer);
  }

  private initErrorHandler() {
    this.app.use(handleErrors);
  }

  get serverApp() {
    return this.app;
  }
}

export default App;
