import { DApp } from '@src/models';

import { error } from '@utils/error';
import { Responses, bindMethods, successful } from '@utils/index';

import { IDAppsService, IDappRequest } from './types';

export class DappController {
  private _dappService: IDAppsService;

  constructor(dappService: IDAppsService) {
    this._dappService = dappService;
    bindMethods(this);
  }

  async currentAccount({ params, headers }: IDappRequest) {
    try {
      const a = await this._dappService.findBySessionID(
        params.sessionId,
        headers.origin || headers.Origin,
      );
      return successful(a.currentVault.predicateAddress, Responses.Ok);
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
      const a = await this._dappService.findBySessionID(
        params.sessionId,
        headers.origin || headers.Origin,
      );
      return successful(a.currentVault.provider, Responses.Ok);
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
}
