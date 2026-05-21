# Server Testing

## Unit tests

Run tests that do not require a writable database:

```bash
npm test
```

This maps to `npm run test:unit`.

## Database integration tests

Create a separate AWS/RDS database for tests, for example:

```sql
CREATE DATABASE click_send_shop_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Create a database user with access only to this test database. Do not reuse production credentials.

Then copy the example file:

```bash
cp .env.test.example .env.test
```

Set these values in `.env.test`:

```env
DB_HOST=<aws-test-db-endpoint>
DB_PORT=3306
DB_USER=<test-db-user>
DB_PASSWORD=<test-db-password>
DB_NAME=click_send_shop_test
```

Run integration tests:

```bash
npm run test:integration
```

If `.env.test` does not exist, this command skips DB integration tests and exits successfully. This keeps local checks from accidentally connecting to `server/.env` or production.

Run smoke tests:

```bash
npm run test:smoke
```

The integration test loader refuses to run unless `.env.test` exists. It also refuses database names that do not include `test`, `ci`, `dev`, or `staging`, unless `ALLOW_PRODUCTION_DB_TESTS=1` is explicitly set.
