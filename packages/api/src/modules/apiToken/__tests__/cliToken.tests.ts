import { CLITokenCoder } from '@modules/apiToken/service';

describe('[CLI_TOKEN]', () => {
  const tokenCoder = new CLITokenCoder('aes-256-cbc');
  const cliTokenMock = {
    data: {
      apiToken: '2c2435a6acd4f47196c6c165b0ab2748',
      userId: '897540b5-d9eb-4071-8837-4005ac0c3d5c',
    },
    encoded:
      'e88e265ff2fb9fc299aac944d767b3f0d6237a8f4b7d5476362fd75ef03ecb803b8b98318a2f7f132789bda4642c63cdbfeebba04fc45efa0dcf92e8cd9c06c072545993e6fb827390e0cfc38e676bff',
  };

  test('Encode', () => {
    const { data } = cliTokenMock;
    const encoded = tokenCoder.encode(data.apiToken, data.userId);
    expect(encoded).toBe(cliTokenMock.encoded);
  });

  test('Decode', () => {
    const { data } = cliTokenMock;
    const decoded = tokenCoder.decode(cliTokenMock.encoded);
    expect(decoded).toStrictEqual(data);
  });

  test('Decode with invalid token', () => {
    const decode = () => tokenCoder.decode('invalid_token');
    expect(decode).toThrow('Invalid token');
  });
});
