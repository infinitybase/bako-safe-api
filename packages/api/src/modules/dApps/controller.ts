import { TransactionStatus } from 'bakosafe';
import { addMinutes } from 'date-fns';

import { DApp, Predicate, RecoverCodeType, User } from '@src/models';
import { SocketClient } from '@src/socket/client';

import { error } from '@utils/error';
import { Responses, TokenUtils, bindMethods, successful } from '@utils/index';

import { PredicateService } from '../predicate/services';
import { RecoverCodeService } from '../recoverCode/services';
import { TransactionService } from '../transaction/services';
import { DAppsService } from './service';
import {
  ICreateRecoverCodeRequest,
  ICreateRequest,
  IDAppsService,
  IDappRequest,
} from './types';
import { ITransactionResponse } from '../transaction/types';
import app from '@src/server/app';

const { API_URL, FUEL_PROVIDER } = process.env;

export class DappController {
  private _dappService: IDAppsService;

  constructor(dappService: IDAppsService) {
    this._dappService = dappService;
    bindMethods(this);
  }

  async connect({ body }: ICreateRequest) {
    try {
      const { vaultId, sessionId, name, origin, userAddress, request_id } = body;
      const predicate = await Predicate.findOne({ where: { id: vaultId } });
      let dapp = await new DAppsService().findBySessionID(sessionId, origin);
      const user = await User.findOne({ where: { address: userAddress } });
      const { network } = await TokenUtils.getTokenByUser(user.id);
      if (!dapp) {
        dapp = await new DAppsService().create({
          sessionId,
          name: name ?? ``,
          origin,
          vaults: [predicate],
          currentVault: predicate,
          user,
          network,
        });
      }

      const isIncludedVault = dapp.vaults.find(v => v.id === vaultId);

      if (!isIncludedVault) {
        dapp.vaults = [...dapp.vaults, predicate];
      }
      dapp.currentVault = predicate;
      dapp.network = network;

      await dapp.save();
      const socket = new SocketClient(sessionId, API_URL);

      socket.sendMessage({
        sessionId,
        to: '[CONNECTOR]',
        request_id,
        type: '[AUTH_CONFIRMED]',
        data: {
          connected: true,
        },
      });

      return successful(true, Responses.Created);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async currentAccount({ params, headers }: IDappRequest) {
    try {
      const account = await this._dappService.findBySessionID(
        params.sessionId,
        headers.origin ?? headers.Origin,
      );
      const response = account?.currentVault.predicateAddress ?? null;
      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async disconnect({ params, headers }: IDappRequest) {
    try {
      const { sessionId } = params;
      const origin = headers.origin || headers.Origin;

      const dapp = await new DAppsService().findDAppUserBySessionIdAndOrigin(
        sessionId,
        origin,
      );

      if (!dapp) {
        return successful(null, Responses.NoContent);
      }

      const { user } = dapp;

      const userToken = await TokenUtils.getTokenByUser(user.id);
      await new DAppsService().delete(sessionId, origin);
      await app._sessionCache.removeSession(userToken?.token);
      return successful(null, Responses.NoContent);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async createConnectorCode({ body, headers, params }: ICreateRecoverCodeRequest) {
    try {
      const { sessionId, vaultAddress, txId } = params;
      const { origin } = headers;

      const pendingTransactions = await new TransactionService()
        .filter({
          status: [TransactionStatus.AWAIT_REQUIREMENTS],
          predicateAddress: vaultAddress,
        })
        .list()
        .then((data: ITransactionResponse[]) => {
          return data.length > 0;
        });

      const { predicateAddress, id, name } = await new PredicateService()
        .filter({
          address: vaultAddress,
        })
        .list()
        .then((data: Predicate[]) => data[0]);

      const dapp = await new DAppsService().findBySessionID(sessionId, origin);

      const code = await new RecoverCodeService().create({
        owner: dapp.user,
        type: RecoverCodeType.AUTH_ONCE,
        origin,
        validAt: addMinutes(new Date(), 5), //todo: change this number to dynamic
        metadata: {
          uses: 0, // todo: increment this number on each use
          txId,
          vault: {
            id,
            address: predicateAddress,
            name: name,
          },
        },
        network: {
          url: '',
          chainId: 0,
        },
      });

      return successful(
        {
          code: code.code,
          validAt: code.validAt,
          tx_blocked: pendingTransactions,
          metadata: code.metadata,
          user_address: dapp.user.address,
        },
        Responses.Created,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async current({ params }: IDappRequest) {
    try {
      const currentVaultId = await this._dappService.findCurrent(params.sessionId);
      return successful(currentVaultId, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async currentNetwork({ params, headers }: IDappRequest) {
    try {
      const dapp = await this._dappService.findBySessionID(
        params.sessionId,
        headers.origin || headers.Origin,
      );

      if (!dapp?.network) {
        return successful(null, Responses.Ok);
      }

      const result = dapp.network?.url ?? null;

      return successful(result, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async accounts({ params, headers }: IDappRequest) {
    try {
      return successful(
        await this._dappService
          .findBySessionID(params.sessionId, headers.origin || headers.Origin)
          .then((data: DApp) => data.vaults.map(vault => vault.predicateAddress)),
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async state({ params, headers }: IDappRequest) {
    try {
      return successful(
        await this._dappService
          .findBySessionID(params.sessionId, headers.origin || headers.Origin)
          .then((data: DApp) => {
            return !!data;
          }),
        Responses.Ok,
      );
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async selectNetwork({ body, headers, params }: IDappRequest) {
    try {
      const { networkUrl } = body;
      const { sessionId } = params;
      const origin = headers.origin || headers.Origin;

      const dapp = await new DAppsService().findBySessionID(sessionId, origin);

      // set on connector
      if (!dapp) return successful(false, Responses.Ok);
      dapp.network = networkUrl;
      await dapp.save();

      // TODO: VERIFY HERE
      // set on bakosafesession
      await TokenUtils.changeNetwork(dapp.user.id, networkUrl);

      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
