import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { UserService } from '../configs/user/service';
import { AddressBookController } from './controller';
import { AddressBookService } from './services';
import {
  validateCreateAddressBookPayload,
  validateUpdateAddressBookPayload,
} from './validations';

const router = Router();
const addressBookService = new AddressBookService();
const userService = new UserService();
const { create, update, list, delete: deleteContact } = new AddressBookController(
  addressBookService,
  userService,
);

router.use(authMiddleware);

router.post('/', validateCreateAddressBookPayload, handleResponse(create));
router.put('/:id', validateUpdateAddressBookPayload, handleResponse(update));
router.delete('/:id', handleResponse(deleteContact));
router.get('/', handleResponse(list));

export default router;
