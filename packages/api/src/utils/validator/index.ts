import { createValidator } from 'express-joi-validation';

const validator = createValidator({
  // This option forces validation to pass any errors to the express
  // error handler instead of generating a TEXT only 400 error
  passError: true,
});

export { AddressValidator } from './address';

export { validator };
