import { BadRequest, ErrorTypes, NotFound } from '@utils/error';
import successful, { Responses } from '@utils/successful';

import { ExampleRequest } from './controller.types';

export const hello = async () => {
  const result = {
    testing: 'Hello, world!',
  };

  return successful(result, Responses.Ok);
};

export const notFound = async () => {
  throw new NotFound({
    type: ErrorTypes.Create,
    title: 'Não encontramos essa rota.',
    detail: 'Verifique e tente novamente.',
  });
};

export const badRequest = async () => {
  throw new BadRequest({
    type: ErrorTypes.Delete,
    title: 'Bad request bem interessante',
    detail: 'Provavelmente vc está enviando dados incorretos.',
  });
};

export const validatePayload = async (req: ExampleRequest) => {
  const { body } = req;

  return successful(
    {
      testing: 'Payload válido. Parabéns.',
      body,
    },
    Responses.Created,
  );
};
