import { io, Socket } from 'socket.io-client';

interface IMessage {
  room: string; // sessionId
  to: string; // username -> recebe a mensagem '[UI]' por exemplo
  type: string; // tipo da mensagem/evento
  data: { [key: string]: any };
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

    //todo: move this URL to a .env file
    const URL = 'http://localhost:3000';
    this.socket = io(URL, { autoConnect: false, auth });
    this.socket.connect();
  }

  // Método para enviar uma mensagem para o servidor
  sendMessage(message: IMessage) {
    this.socket.emit('message', message);
    console.log('Mensagem enviada para o servidor:', message);
  }

  // Método para desconectar do servidor Socket.IO
  disconnect() {
    this.socket.disconnect();
  }
}
