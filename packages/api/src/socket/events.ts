// import { ITransactionResponse } from "@src/modules/transaction/types";
import { SocketClient } from "./client";
import { SocketEvents } from "./types";

const { API_URL } = process.env;

export type TransactionEvent = {
  sessionId: string;
  to: string;
  type: string;
  transaction: any;
}

export function emitTransaction(userId: string, data: TransactionEvent) {
  const socketClient = new SocketClient(userId, API_URL);
  socketClient.socket.emit(SocketEvents.TRANSACTION, data);
}
