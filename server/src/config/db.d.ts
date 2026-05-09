import type { FieldPacket, Pool } from "mysql2/promise";

/**
 * mysql2's QueryResult union is correct for the driver but too strict for this
 * legacy JS codebase under checkJs. Treat the first tuple element as untyped rows.
 */
type AppPool = Omit<Pool, "query"> & {
  query(sql: string, values?: unknown): Promise<[any, FieldPacket[]]>;
};

declare const pool: AppPool;
export = pool;
