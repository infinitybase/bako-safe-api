import { EmailTemplateType, sendMail } from '@src/utils/EmailSender';

describe('[MAIL_NOTIFICATIONS]', () => {
  const to = process.env.MAIL_TESTING_NOTIFICATIONS;
  const data = {
    summary: {
      vaultName: 'Vault Name',
      transactionName: 'Transaction Name',
      name: 'Tester',
    },
  };

  test('Send email notifications on transaction creation', async () => {
    expect(
      await sendMail(EmailTemplateType.TRANSACTION_CREATED, { to, data }),
    ).not.toThrow();
  });

  test('Send email notifications when transaction is completed', async () => {
    expect(
      await sendMail(EmailTemplateType.TRANSACTION_COMPLETED, { to, data }),
    ).not.toThrow();
  });

  test('Send email notifications when transaction is declined', async () => {
    expect(
      await sendMail(EmailTemplateType.TRANSACTION_DECLINED, { to, data }),
    ).not.toThrow();
  });

  test('Send email notifications when transaction is signed', async () => {
    expect(
      await sendMail(EmailTemplateType.TRANSACTION_SIGNED, { to, data }),
    ).not.toThrow();
  });

  test('Send email notifications when transaction is signed', async () => {
    expect(
      await sendMail(EmailTemplateType.VAULT_CREATED, { to, data }),
    ).not.toThrow();
  });
});
