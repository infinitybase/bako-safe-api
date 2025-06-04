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

  // Método para enviar uma mensagem para o servidor
  sendMessage(message: IMessage) {
    this._socket.emit(SocketEvents.DEFAULT, message);
  }

  // Método para desconectar do servidor Socket.IO
  disconnect() {
    this._socket.disconnect();
  }

  get socket() {
    return this._socket;
  }
}
