export enum ErrorTypes {
  Create = 'CreateException',
  Update = 'UpdateException',
  Delete = 'DeleteException',
  NotFound = 'NotFound',
  Unauthorized = 'Unauthorized',
  Internal = 'Internal',
}

export interface Error {
  /**
   * An identifier that categorizes the error
   */
  type: ErrorTypes;

  /**
   * A brief, human-readable message about the error
   */
  title: string;

  /**
   * A human-readable explanation of the error
   */
  detail: string;
}

class GeneralError {
  public readonly error: Error;
  public readonly statusCode: number;

  constructor(error: Error, statusCode: number) {
    this.error = error;
    this.statusCode = statusCode;
    console.log(error, statusCode);
  }
}

export default GeneralError;
