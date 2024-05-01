import { Router } from 'express';
import { PredicateVersionService } from './services';
import { PredicateVersionController } from './controller';
import { handleResponse } from '@src/utils';

const router = Router();
const predicateVersionService = new PredicateVersionService();
const {
  create,
  list,
  findByRootAddress,
  findCurrentVersion,
} = new PredicateVersionController(predicateVersionService);

router.post('/', handleResponse(create));
router.get('/', handleResponse(list));
router.get('/current', handleResponse(findCurrentVersion));
router.get('/:rootAddress', handleResponse(findByRootAddress));

export default router;
