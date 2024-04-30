import { Router } from 'express';
import { PredicateVersionService } from './services';
import { PredicateVersionController } from './controller';
import { handleResponse } from '@src/utils';

const router = Router();
const predicateVersionService = new PredicateVersionService();
const { findCurrentVersion } = new PredicateVersionController(
  predicateVersionService,
);

router.get('/current', handleResponse(findCurrentVersion));

export default router;
