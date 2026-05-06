const { ValidationError } = require('../errors/AppError');

const PARTS = ['body', 'query', 'params'];

function formatIssues(issues) {
  return issues
    .map((iss) => {
      const path = iss.path && iss.path.length ? iss.path.map((p) => String(p)).join('.') : '(root)';
      return `${path}: ${iss.message}`;
    })
    .join('；');
}

function validate(spec) {
  return function validateMiddleware(req, _res, next) {
    try {
      for (const part of PARTS) {
        const schema = spec[part];
        if (!schema) continue;
        const result = schema.safeParse(req[part]);
        if (!result.success) {
          const issues = result.error.issues;
          throw new ValidationError(formatIssues(issues), { part, issues });
        }
        Object.defineProperty(req, part, {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  validate,
};
