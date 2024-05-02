import { Router } from 'express';
import { PredicateVersionService } from './services';
import { PredicateVersionController } from './controller';
import { handleResponse } from '@src/utils';

const router = Router();
const predicateVersionService = new PredicateVersionService();
const {
  list,
  findByRootAddress,
  findCurrentVersion,
} = new PredicateVersionController(predicateVersionService);

router.get('/', handleResponse(list));
router.get('/current', handleResponse(findCurrentVersion));
router.get('/:rootAddress', handleResponse(findByRootAddress));

export default router;
