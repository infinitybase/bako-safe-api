function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function keysToCamel<T>(input: any): T {
  if (Array.isArray(input)) {
    return input.map(item => keysToCamel(item)) as any;
  } else if (input !== null && typeof input === 'object') {
    return Object.keys(input).reduce((acc, key) => {
      const camelKey = toCamelCase(key);
      (acc as any)[camelKey] = keysToCamel(input[key]);
      return acc;
    }, {} as T);
  }
  return input;
}
