import { TTL_CONFIG } from "../constants";

// Todo[Erik] - Implementar tipagem no @/types para o retorno das dos predicates.
interface Predicate {
  token_user_id?: string | null;
  updated_at?: string | Date | null;
  id: string;
}

export async function getDynamicTTL(predicate: Predicate, lastUpdated?: Date | null): Promise<number> {
  const isActive = Boolean(predicate.token_user_id);

  if (isActive) {
    return TTL_CONFIG.ACTIVE;
  }

  if (lastUpdated) {
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate < 1) {
      return 60 * 5;
    } else if (hoursSinceUpdate < 5) {
      return 60 * 30;
    }
  }

  return TTL_CONFIG.INACTIVE;
}