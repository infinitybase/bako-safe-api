import { Modules } from './types';

function PermissionsMiddleware(module: Modules) {
  return true;
}

export { PermissionsMiddleware };
