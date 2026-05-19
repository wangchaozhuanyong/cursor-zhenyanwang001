const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const smsOtp = require('../src/modules/auth/services/smsOtp.adapter');
const { ValidationError } = require('../src/errors');

function withEnv(vars, fn) {
  const snapshot = {};
  Object.keys(vars).forEach((key) => {
    snapshot[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  });

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      Object.keys(vars).forEach((key) => {
        if (snapshot[key] === undefined) delete process.env[key];
        else process.env[key] = snapshot[key];
      });
    });
}

test('production SMS OTP is disabled unless explicitly enabled', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      SMS_LOGIN_ENABLED: undefined,
      SMS_PROVIDER: undefined,
      SMS_HTTP_URL: undefined,
      SMS_HTTP_BODY_TEMPLATE: undefined,
    },
    async () => {
      await assert.rejects(
        () => smsOtp.sendLoginOtp({ phoneE164: '+60123456789', code: '123456' }),
        ValidationError,
      );
    },
  );
});

test('production SMS OTP sends through generic HTTP provider', async () => {
  let receivedBody = '';
  const server = http.createServer((req, res) => {
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      receivedBody += chunk;
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    await withEnv(
      {
        NODE_ENV: 'production',
        SMS_LOGIN_ENABLED: '1',
        SMS_PROVIDER: 'http',
        SMS_HTTP_URL: `http://127.0.0.1:${port}/send`,
        SMS_HTTP_METHOD: 'POST',
        SMS_HTTP_HEADERS_JSON: '{"X-Test":"otp"}',
        SMS_HTTP_BODY_TEMPLATE: '{"to":"{{phone}}","message":"{{message}}","code":"{{code}}"}',
        SMS_HTTP_SUCCESS_REGEX: '"success"\\s*:\\s*true',
        SMS_OTP_MESSAGE_TEMPLATE: 'Code {{code}} for {{phone}}',
      },
      async () => {
        const result = await smsOtp.sendLoginOtp({ phoneE164: '+60123456789', code: '654321' });
        assert.deepEqual(result, { ok: true });
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  assert.match(receivedBody, /\+60123456789/);
  assert.match(receivedBody, /654321/);
  assert.match(receivedBody, /Code 654321 for \+60123456789/);
});
