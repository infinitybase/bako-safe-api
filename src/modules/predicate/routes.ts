import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();
const { findAll, findByAddresses, add, findById } = new PredicateController(
  predicateService,
);

// Add Predicate
router.post('/', authMiddleware, validateAddPredicatePayload, handleResponse(add));
// List all predicates
router.get('/', authMiddleware, handleResponse(findAll));
// List predicate by id
router.get('/:id', authMiddleware, handleResponse(findById));
// List predicate by adresses [fuel2sa..ska0]
router.get(
  '/by-addresses/:addresses',
  authMiddleware,
  handleResponse(findByAddresses),
);

export default router;
