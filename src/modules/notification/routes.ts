import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';
import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

import { handleResponse } from '@utils/index';

import { NotificationController } from './controller';
import { NotificationService } from './services';

const router = Router();
const notificationService = new NotificationService();
const { readAll, list } = new NotificationController(notificationService);

// ENDPOINT TO VALIDATE EMAIL SENDING
router.get('/mail', async (_, res) => {
  const to = process.env.MAIL_TESTING_NOTIFICATIONS;
  const data = {
    summary: {
      vaultName: 'Vault Name',
      transactionName: 'Transaction Name',
      name: 'Tester',
    },
  };

  try {
    await sendMail(EmailTemplateType.TRANSACTION_CREATED, { to, data });
    await sendMail(EmailTemplateType.TRANSACTION_COMPLETED, { to, data });
    await sendMail(EmailTemplateType.TRANSACTION_DECLINED, { to, data });
    await sendMail(EmailTemplateType.TRANSACTION_SIGNED, { to, data });
    await sendMail(EmailTemplateType.VAULT_CREATED, { to, data });
  } catch (error) {
    console.log('🚀 ~ router.get ~ error:', error);
  }

  res.status(200).json();
});

router.use(authMiddleware);

router.get('/', handleResponse(list));
router.put('/read-all', handleResponse(readAll));

export default router;
