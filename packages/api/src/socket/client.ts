import { io, Socket } from 'socket.io-client';
import { IMessage, SocketEvents, SocketUsernames } from './types';
import { logger } from '@src/config/logger';

const DEFAULT_DISCONNECT_TIMEOUT_MS = parseInt(
  process.env.SOCKET_CLIENT_DISCONNECT_TIMEOUT || '30000',
); // Default => 30 seconds
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

  /**
   * Emit event when connected, then auto-disconnect after timeout to prevent memory leaks.
   *
   * @param event - Socket event name
   * @param data - Event data payload
   * @param timeoutDisconnect - Auto-disconnect timeout in milliseconds
   */
  private async _emitWhenConnectedAndDisconnect(
    event: string,
    data: any,
    timeoutDisconnect: number = DEFAULT_DISCONNECT_TIMEOUT_MS,
  ): Promise<void> {
    if (this._socket.connected) {
      logger.info({ data }, '[EMIT WHEN CONNECTED AND DISCONNECT] Emitting event');
      this._socket.emit(event, data);
    } else {
      await new Promise<void>(resolve => {
        this._socket.once('connect', () => {
          logger.info(
            { data },
            '[EMIT WHEN CONNECTED AND DISCONNECT] Emitting event',
          );
          this._socket.emit(event, data);
          resolve();
        });
      });
    }

    await new Promise(r => setTimeout(r, timeoutDisconnect));
    logger.info('[EMIT WHEN CONNECTED AND DISCONNECT] Disconnecting socket');
    this._socket.disconnect();
  }

  /**
   * Send a message to the socket server.
   * Automatically disconnects after default timeout.
   *
   * @param message - Message object conforming to IMessage
   * @param timeoutDisconnect - Optional timeout override in milliseconds
   */
  async sendMessage(message: IMessage, timeoutDisconnect?: number): Promise<void> {
    await this._emitWhenConnectedAndDisconnect(
      SocketEvents.DEFAULT,
      message,
      timeoutDisconnect,
    );
  }

  /**
   * Emit a custom event to the socket server.
   * Automatically disconnects after default timeout.
   *
   * @param event - Socket event name
   * @param data - Event data payload
   * @param timeoutDisconnect - Optional timeout override in milliseconds
   */
  async emit(event: string, data: any, timeoutDisconnect?: number): Promise<void> {
    await this._emitWhenConnectedAndDisconnect(event, data, timeoutDisconnect);
  }

  /**
   * Manual disconnect (rarely needed, auto-disconnect handles most cases).
   * Keep for edge cases where immediate disconnect is required.
   */
  disconnect(): void {
    if (this._socket) {
      this._socket.disconnect();
    }
  }

  get socket(): Socket {
    return this._socket;
  }
}
