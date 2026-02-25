import test from 'node:test';
import assert from 'node:assert/strict';

import { TestEnvironment } from './utils/Setup';
import { CLITokenCoder } from '@src/modules/apiToken/service';
import { cliTokenMock } from './mocks/Tokens';
import { generateNode } from './mocks/Networks';

test('Cli token', async t => {
  const { node } = await generateNode();

  const { close } = await TestEnvironment.init(2, 1, node);
  t.after(async () => {
    await close();
  });

  const tokenCoder = new CLITokenCoder('aes-256-cbc');

  await t.test('Encode and Decode should be reversible', () => {
    const { data } = cliTokenMock;
    const encoded = tokenCoder.encode(data.apiToken, data.userId);

    assert.ok(encoded);
    assert.ok(typeof encoded === 'string');
    assert.ok(encoded.length > 0);

    const decoded = tokenCoder.decode(encoded);
    assert.deepStrictEqual(decoded, data);
  });

  await t.test('Decode with invalid token should throw', () => {
    assert.throws(() => tokenCoder.decode('invalid_token'), /Invalid token/);
  });

  await t.test('Decode with empty token should throw', () => {
    assert.throws(() => tokenCoder.decode(''), /Invalid token/);
  });

  await t.test(
    'Encode should produce different output for different inputs',
    () => {
      const encoded1 = tokenCoder.encode('token1', 'user1');
      const encoded2 = tokenCoder.encode('token2', 'user2');

      assert.notStrictEqual(encoded1, encoded2);
    },
  );
});
