import {
  ITransactionResponse,
  ITransactionHistory,
} from '@src/modules/transaction/types';
import { SocketClient } from './client';
import { SocketEvents } from './types';

const { API_URL } = process.env;

export type TransactionEvent = {
  sessionId: string;
  to: string;
  type: string;
  transaction: ITransactionResponse;
  history: ITransactionHistory[];
};

export type BalanceOutdatedUserEvent = {
  sessionId: string;
  to: string;
  type: SocketEvents;
  workspaceId: string;
  outdatedPredicateIds: string[];
};

export type BalanceOutdatedPredicateEvent = {
  sessionId: string;
  to: string;
  type: SocketEvents;
  predicateId: string;
  workspaceId: string;
};

export function emitTransaction(userId: string, data: TransactionEvent) {
  const socketClient = new SocketClient(userId, API_URL);
  socketClient.socket.emit(SocketEvents.TRANSACTION, data);
}

export function emitBalanceOutdatedUser(
  userId: string,
  data: BalanceOutdatedUserEvent,
) {
  const socketClient = new SocketClient(userId, API_URL);
  socketClient.socket.emit(SocketEvents.BALANCE_OUTDATED_USER, data);
}

export function emitBalanceOutdatedPredicate(
  userId: string,
  data: BalanceOutdatedPredicateEvent,
) {
  const socketClient = new SocketClient(userId, API_URL);
  socketClient.socket.emit(SocketEvents.BALANCE_OUTDATED_PREDICATE, data);
}
