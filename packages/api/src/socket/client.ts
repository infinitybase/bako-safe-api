import { io, Socket } from 'socket.io-client';
import { IMessage, SocketEvents, SocketUsernames } from './types';

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
    if (this._socket.connected) {
      this._socket.emit(event, data);
    } else {
      await new Promise<void>(resolve => {
        this._socket.once('connect', () => {
          resolve();
        });
      });
      this._socket.emit(event, data);
    }
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
