import { io, Socket } from 'socket.io-client';

interface IMessage {
  sessionId: string; // sessionId
  to: string; // username -> recebe a mensagem '[UI]' por exemplo
  type: string; // tipo da mensagem/evento
  data: { [key: string]: any };
  request_id: string;
}

export class SocketClient {
  socket: Socket = null;

  constructor(sessionId: string, origin: string) {
    const auth = {
      username: '[API]',
      data: new Date(),
      sessionId,
      origin,
    };

    const isDev = process.env.NODE_ENV === 'development';
    const URL = isDev ? process.env.SOCKET_URL : process.env.API_URL;

    this.socket = io(URL, { autoConnect: true, auth });
  }

  // Método para enviar uma mensagem para o servidor
  sendMessage(message: IMessage) {
    this.socket.emit('message', message);
  }

  // Método para desconectar do servidor Socket.IO
  disconnect() {
    this.socket.disconnect();
  }
}