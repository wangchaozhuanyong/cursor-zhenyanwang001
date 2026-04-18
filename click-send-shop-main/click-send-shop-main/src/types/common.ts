/** 统一 API 响应 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

/** 分页请求参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 分页响应 */
export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 分页响应别名 */
export type PageResponse<T> = PaginatedData<T>;

/** 通用选项 */
export interface Option {
  label: string;
  value: string;
}

/** 通用时间戳 */
export interface Timestamps {
  created_at: string;
  updated_at: string;
}

/** 统一 API 错误 */
export class ApiError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
}
