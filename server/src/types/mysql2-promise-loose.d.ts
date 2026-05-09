import "mysql2/promise";

/**
 * Loosen `query` row typing for checkJs: mysql2's QueryResult union is accurate
 * but forces noisy narrowing across this legacy JS codebase.
 */
declare module "mysql2/promise" {
  interface Connection {
    query(
      sql: string,
      values?: import("mysql2").QueryValues,
    ): Promise<[any, import("mysql2").FieldPacket[]]>;
    query(
      options: import("mysql2").QueryOptions,
      values?: import("mysql2").QueryValues,
    ): Promise<[any, import("mysql2").FieldPacket[]]>;
  }
}
