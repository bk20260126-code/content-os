import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { basicCredentialsMatch } from '../lib/access-control';
import { middleware } from '../middleware';

test('Basic credentials reject missing and incorrect values', async () => {
  assert.equal(await basicCredentialsMatch(null, 'owner', 'secret'), false);
  assert.equal(await basicCredentialsMatch(`Basic ${btoa('owner:wrong')}`, 'owner', 'secret'), false);
});

test('middleware rejects unauthenticated state API calls and accepts valid credentials', async () => {
  const previousUsername = process.env.APP_ACCESS_USERNAME;
  const previousPassword = process.env.APP_ACCESS_PASSWORD;
  process.env.APP_ACCESS_USERNAME = 'owner';
  process.env.APP_ACCESS_PASSWORD = 'secret';

  try {
    const unauthorized = await middleware(new NextRequest('https://content-os.example/api/state'));
    assert.equal(unauthorized.status, 401);
    assert.match(unauthorized.headers.get('www-authenticate') ?? '', /^Basic /);

    const authorized = await middleware(new NextRequest('https://content-os.example/api/state', {
      headers: { authorization: `Basic ${btoa('owner:secret')}` },
    }));
    assert.equal(authorized.status, 200);
    assert.equal(authorized.headers.get('x-middleware-next'), '1');
  } finally {
    if (previousUsername === undefined) delete process.env.APP_ACCESS_USERNAME;
    else process.env.APP_ACCESS_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.APP_ACCESS_PASSWORD;
    else process.env.APP_ACCESS_PASSWORD = previousPassword;
  }
});
