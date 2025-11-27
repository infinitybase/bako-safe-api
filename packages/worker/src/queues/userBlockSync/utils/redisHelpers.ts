import redisClient from "@/clients/redisClient";
import {
  REDIS_KEY_LOGGED_USERS,
  REDIS_KEY_USER_BLOCK,
  REDIS_KEY_USER_LAST_LOGIN,
} from "../constants";
import type { LoggedUser, UserBlockState } from "../types";

/**
 * Register a user as logged in with their predicates
 */
export const registerLoggedUser = async (
  userId: string,
  userAddress: string,
  predicates: string[],
  lastLogin: number = Date.now()
): Promise<void> => {
  const userData: LoggedUser = {
    user_id: userId,
    user_address: userAddress,
    last_login: lastLogin,
    predicates,
  };

  await redisClient.hset(REDIS_KEY_LOGGED_USERS, userId, JSON.stringify(userData));
  await redisClient.set(REDIS_KEY_USER_LAST_LOGIN(userId), lastLogin.toString());
};

/**
 * Remove a user from logged users set
 */
export const unregisterLoggedUser = async (userId: string): Promise<void> => {
  await redisClient.hdel(REDIS_KEY_LOGGED_USERS, userId);
  await redisClient.del(REDIS_KEY_USER_LAST_LOGIN(userId));
};

/**
 * Get all logged users sorted by most recent login
 */
export const getLoggedUsersSortedByLogin = async (): Promise<LoggedUser[]> => {
  const usersData = await redisClient.hgetall(REDIS_KEY_LOGGED_USERS);

  if (!usersData || Object.keys(usersData).length === 0) {
    return [];
  }

  const users: LoggedUser[] = Object.values(usersData).map((data) =>
    JSON.parse(data)
  );

  // Sort by last_login descending (most recent first)
  return users.sort((a, b) => b.last_login - a.last_login);
};

/**
 * Get the last synced block for a user
 */
export const getUserLastBlock = async (userId: string): Promise<number> => {
  const block = await redisClient.get(REDIS_KEY_USER_BLOCK(userId));
  return block ? parseInt(block, 10) : 0;
};

/**
 * Update the last synced block for a user
 */
export const setUserLastBlock = async (
  userId: string,
  blockNumber: number
): Promise<void> => {
  await redisClient.set(REDIS_KEY_USER_BLOCK(userId), blockNumber.toString());
};

/**
 * Get full user block state
 */
export const getUserBlockState = async (
  userId: string
): Promise<UserBlockState | null> => {
  const [block, userData] = await Promise.all([
    redisClient.get(REDIS_KEY_USER_BLOCK(userId)),
    redisClient.hget(REDIS_KEY_LOGGED_USERS, userId),
  ]);

  if (!userData) {
    return null;
  }

  const user: LoggedUser = JSON.parse(userData);

  return {
    user_id: userId,
    last_block: block ? parseInt(block, 10) : 0,
    last_sync: Date.now(),
    predicates_synced: user.predicates,
  };
};

/**
 * Check if a user is currently logged in
 */
export const isUserLoggedIn = async (userId: string): Promise<boolean> => {
  const exists = await redisClient.hexists(REDIS_KEY_LOGGED_USERS, userId);
  return exists === 1;
};

/**
 * Update user's last login time (for priority refresh)
 */
export const updateUserLastLogin = async (
  userId: string,
  timestamp: number = Date.now()
): Promise<void> => {
  const userData = await redisClient.hget(REDIS_KEY_LOGGED_USERS, userId);

  if (userData) {
    const user: LoggedUser = JSON.parse(userData);
    user.last_login = timestamp;
    await redisClient.hset(REDIS_KEY_LOGGED_USERS, userId, JSON.stringify(user));
    await redisClient.set(REDIS_KEY_USER_LAST_LOGIN(userId), timestamp.toString());
  }
};

/**
 * Get count of logged users
 */
export const getLoggedUsersCount = async (): Promise<number> => {
  return await redisClient.hlen(REDIS_KEY_LOGGED_USERS);
};

/**
 * Clean up all user block sync data (for maintenance)
 */
export const cleanupUserBlockSyncData = async (userId: string): Promise<void> => {
  await Promise.all([
    redisClient.hdel(REDIS_KEY_LOGGED_USERS, userId),
    redisClient.del(REDIS_KEY_USER_BLOCK(userId)),
    redisClient.del(REDIS_KEY_USER_LAST_LOGIN(userId)),
  ]);
};
