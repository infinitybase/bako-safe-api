import { bindMethods, Responses, successful } from '@src/utils';
import { error } from '@src/utils/error';

import {
  IRequestCreateSwap,
  IRequestDestination,
  IRequestLimits,
  IRequestQuote,
} from './types';
import { LayersSwapServiceFactory } from './service';

export default class LayersSwapController {
  constructor(private _factory: typeof LayersSwapServiceFactory) {
    bindMethods(this);
  }

  async getDestinations(request: IRequestDestination) {
    try {
      const { from_network, from_token } = request.query;
      const net = request.network;

      const service = this._factory.fromNetwork(net);

      const destinations = await service.getDestinations({
        from_network,
        from_token,
      });
      return successful(destinations, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getLimits(request: IRequestLimits) {
    try {
      const query = request.query;
      const net = request.network;

      const service = this._factory.fromNetwork(net);
      const limits = await service.getLimits(query);
      return successful(limits, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async getQuotes(request: IRequestQuote) {
    try {
      const query = request.query;
      const net = request.network;

      const service = this._factory.fromNetwork(net);
      const quotes = await service.getQuotes(query);
      return successful(quotes, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }

  async createSwap(request: IRequestCreateSwap) {
    try {
      const net = request.network;

      const service = this._factory.fromNetwork(net);
      const swap = await service.createSwap(request.body);
      return successful(swap, Responses.Ok);
    } catch (err) {
      return error(err.error, err.statusCode);
    }
  }
}
