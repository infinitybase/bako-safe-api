import test from 'node:test';
import assert from 'node:assert/strict';

import { TestEnvironment } from './utils/Setup';
import { CLITokenCoder } from '@src/modules/apiToken/service';
import { cliTokenMock } from './mocks/Tokens';
import { generateNode } from './mocks/Networks';

test('Cli token', async t => {
  const { provider, node } = await generateNode();

  const { close } = await TestEnvironment.init(2, 1, node);
  t.after(async () => {
    await close();
  });
  const tokenCoder = new CLITokenCoder('aes-256-cbc');
  // await t.test('Encode', () => {
  //   const { data } = cliTokenMock;
  //   const encoded = tokenCoder.encode(data.apiToken, data.userId);
  //   assert.equal(encoded, cliTokenMock.encoded);
  // });
  // await t.test('Decode', () => {
  //   const { data } = cliTokenMock;
  //   const decoded = tokenCoder.decode(cliTokenMock.encoded);
  //   assert.deepStrictEqual(decoded, data);
  // });
  // await t.test('Decode with invalid token', () => {
  //   const decode = () => tokenCoder.decode('invalid_token');
  //   assert.throws(() => decode(), /Invalid token/);
  // });
});
