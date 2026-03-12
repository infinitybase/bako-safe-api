export * from "./redisHelpers";
export * from "./persistDeposits";

// Re-export getCurrentBlockHeight for convenience
export const getCurrentBlockHeight = async (): Promise<number> => {
  const response = await fetch("https://fuel.hypersync.xyz/height");
  if (!response.ok) {
    throw new Error(`Failed to get current block height: ${response.status}`);
  }
  const data = await response.json();
  return data.height ?? 0;
};
