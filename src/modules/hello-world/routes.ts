import { Router } from 'express';

import handleResponse from '@utils/handleResponse';

import { hello, notFound, badRequest, validatePayload } from './controller';
import { validatePayloadExample } from './routes.validators';

const router = Router();

router.get('/world', handleResponse(hello));
router.get('/not-found', handleResponse(notFound));
router.get('/bad-request', handleResponse(badRequest));

router.post(
  '/validate-payload',
  validatePayloadExample,
  handleResponse(validatePayload),
);

export default router;
