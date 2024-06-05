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

    //todo: move this URL to a .env file
    const URL = process.env.SOCKET_URL ?? 'http://localhost:3001';

    console.log('Conectando ao servidor Socket.IO:', {
      auth,
      URL,
    });

    this.socket = io(URL, { autoConnect: true, auth });
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
