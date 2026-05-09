import "express";
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface IRouter {
    api?: Record<string, any>;
  }
}

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      user?: {
        id: string;
        role?: string;
        permissions?: string[];
        isSuperAdmin?: boolean;
        roleCodes?: string[];
      };
    }

    interface Response {
      success: (data?: unknown, message?: string) => void;
      fail: (code?: number, message?: string) => void;
      paginate: (list: unknown[], total: number, page: number, pageSize: number) => void;
    }
  }
}

export {};
