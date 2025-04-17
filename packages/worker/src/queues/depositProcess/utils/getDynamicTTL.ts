import { TTL_CONFIG } from "../constants";

// Todo[Erik] - Implementar tipagem no @/types para o retorno das dos predicates.
interface Predicate {
  token_user_id?: string | null;
  updated_at?: string | Date | null;
  id: string;
}

function getHoursSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

export async function getDynamicTTL(predicate: Predicate, lastUpdated?: Date | null): Promise<number> {
  const isActive = Boolean(predicate.token_user_id);
  if (isActive) return TTL_CONFIG.ACTIVE;

  if (!lastUpdated) return TTL_CONFIG.IMMEDIATELY;

  const hoursSinceUpdate = getHoursSince(lastUpdated);

  if (hoursSinceUpdate < 1) return TTL_CONFIG.RECENTLY_UPDATED;
  if (hoursSinceUpdate < 5) return TTL_CONFIG.MODERATELY_UPDATED;

  return TTL_CONFIG.INACTIVE;
}