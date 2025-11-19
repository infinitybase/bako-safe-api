import { io, Socket } from 'socket.io-client';
import { IMessage, SocketEvents, SocketUsernames } from './types';

const TIMEOUT = 8 * 1000; // 8 seconds
export class SocketClient {
  _socket: Socket = null;

  constructor(sessionId: string, origin: string) {
    const auth = {
      username: SocketUsernames.API,
      data: new Date(),
      sessionId,
      origin,
    };

    const isDev = process.env.NODE_ENV === 'development';
    const URL = isDev ? process.env.SOCKET_URL : process.env.API_URL;

    this._socket = io(URL, { autoConnect: true, auth });
  }

  private async _emitWhenConnected(event: string, data: any) {
    await new Promise<void>(resolve => {
      let resolved = false;

      const resolveOnce = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        console.warn(`Socket emit timeout for event "${event}"`);
        resolveOnce();
      }, TIMEOUT);

      const send = () => {
        this._socket.emit(event, data, () => resolveOnce());
      };

      if (this._socket.connected) {
        send();
      } else {
        this._socket.once('connect', send);
      }
    });
  }

  // Método para enviar uma mensagem para o servidor
  async sendMessage(message: IMessage) {
    await this._emitWhenConnected(SocketEvents.DEFAULT, message);
  }

  async emit(event: string, data: any) {
    await this._emitWhenConnected(event, data);
  }

  // Método para desconectar do servidor Socket.IO
  disconnect() {
    this._socket.disconnect();
  }

  get socket() {
    return this._socket;
  }
}
