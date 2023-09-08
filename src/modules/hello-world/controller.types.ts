import {
  ContainerTypes,
  ValidatedRequest,
  ValidatedRequestSchema,
} from 'express-joi-validation';

interface ValidatePayload extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    name: string;
  };
}

export type ExampleRequest = ValidatedRequest<ValidatePayload>;
