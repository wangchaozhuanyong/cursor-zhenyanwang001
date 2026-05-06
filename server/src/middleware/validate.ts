/**
 * 统一 Zod 校验中间件
 *
 * 用法：
 *   const { validate } = require('../../middleware/validate');
 *   router.post('/login', validate({ body: loginSchema }), ctrl.login);
 *
 * 通过的请求会用 schema 解析后的值覆写 req.body / req.query / req.params，
 * 让 controller / service 拿到的就是“受信任、已规范化”的对象。
 *
 * 校验失败抛 ValidationError，统一被 errorHandler 处理。
 */
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';

interface ValidateSpec {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

type RequestPart = 'body' | 'query' | 'params';
const PARTS: ReadonlyArray<RequestPart> = ['body', 'query', 'params'];

function formatIssues(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): string {
  return issues
    .map((iss) => {
      const path = iss.path.length ? iss.path.map((p) => String(p)).join('.') : '(root)';
      return `${path}: ${iss.message}`;
    })
    .join('；');
}

/**
 * 创建 Zod 校验中间件（同步）。
 */
export function validate(spec: ValidateSpec) {
  return function validateMiddleware(req: Request, _res: Response, next: NextFunction): void {
    try {
      for (const part of PARTS) {
        const schema = spec[part];
        if (!schema) continue;
        const result = schema.safeParse(req[part]);
        if (!result.success) {
          const issues = result.error.issues;
          throw new ValidationError(formatIssues(issues), { part, issues });
        }
        // 规范化后的安全值覆写
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

export default { validate };
