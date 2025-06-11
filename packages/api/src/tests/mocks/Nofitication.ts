import { Notification, NotificationTitle, Predicate } from '@src/models';
import { TestUser } from '../utils/Setup';
import { ErrorTypes, Internal } from '@src/utils/error';
import { DeepPartial } from 'typeorm';
import { Provider } from 'fuels';

export async function createNofitications(
  predicate: Predicate,
  user: TestUser,
  provider: Provider,
) {
  const titles = [
    NotificationTitle.TRANSACTION_CREATED,
    NotificationTitle.TRANSACTION_COMPLETED,
    NotificationTitle.TRANSACTION_DECLINED,
    NotificationTitle.TRANSACTION_SIGNED,
    NotificationTitle.NEW_VAULT_CREATED,
  ];

  for (const title of titles) {
    const maxRepeatTitle = 2;

    for (let repeat = 0; repeat < maxRepeatTitle; repeat++) {
      const notifyContent = {
        vaultId: predicate.id,
        vaultName: predicate.name,
      };

      const payload = {
        title,
        user_id: user.id,
        summary: notifyContent,
        network: {
          url: provider.url,
          chainId: await provider.getChainId(),
        },
      };

      const partialPayload: DeepPartial<Notification> = payload;

      await Notification.create(partialPayload)
        .save()
        .catch(e => {
          throw new Internal({
            type: ErrorTypes.Internal,
            title: 'Error on notification creation',
            detail: e,
          });
        });
    }
  }
}
