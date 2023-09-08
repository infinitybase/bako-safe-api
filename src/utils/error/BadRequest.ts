import GeneralError, { Error } from './GeneralError';

class BadRequest extends GeneralError {
  constructor(error: Error | Error[]) {
    super(error, 400);
  }
}

export default BadRequest;
