import { AxiosError } from 'axios';

class CatchError extends Error {
  constructor() {
    super('Expected an error');
  }
}

export const catchApplicationError = async (fn: Promise<unknown>) => {
  try {
    await fn;
    throw new CatchError();
  } catch (error) {
    if (error instanceof AxiosError) {
      return error.response.data;
    }

    throw error;
  }
};

export class TestError {
  static expectUnauthorized(error: any) {
    expect(error.origin).toBeDefined();
    expect(error.errors).toBeDefined();
    expect(error.errors.type).toBe('Unauthorized');
  }

  static expectNotFound(error: any) {
    expect(error.origin).toBeDefined();
    expect(error.errors).toBeDefined();
    expect(error.errors.type).toBe('NotFound');
  }

  static expectValidation(
    error: any,
    expected: { field: string; type: string; origin: 'body' | 'params' },
  ) {
    expect(error.origin).toBe(expected.origin);
    expect(error.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: expected.type,
          title: expect.stringContaining(expected.field),
          detail: expect.stringContaining(expected.field),
        }),
      ]),
    );
  }
}
