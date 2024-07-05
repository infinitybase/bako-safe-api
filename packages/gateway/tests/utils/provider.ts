import { Provider } from 'fuels';

export class GatewayProvider extends Provider {
  constructor(url: string) {
    super(url);
  }

  static connect(apiToken: string) {
    const url = `${process.env.GATEWAY_URL}?api_token=${apiToken}`;
    return super.create(url);
  }
}