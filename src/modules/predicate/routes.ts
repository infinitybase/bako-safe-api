import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();
const { findAll, findByAddresses, add, findById } = new PredicateController(
  predicateService,
);

router.use(authMiddleware);

// Add Predicate
router.post('/', validateAddPredicatePayload, handleResponse(add));
// List all predicates
router.get('/', handleResponse(findAll));
// List predicate by id
router.get('/:id', handleResponse(findById));
// List predicate by adresses [fuel2sa..ska0]
router.get('/by-addresses/:addresses', handleResponse(findByAddresses));

export default router;
