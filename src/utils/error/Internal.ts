import GeneralError, { Error } from './GeneralError';

// -> erro de permissao [sem acesso ao recurso]
class Internal extends GeneralError {
  constructor(error: Error) {
    super(error, 500);
  }
}

export default Internal;
