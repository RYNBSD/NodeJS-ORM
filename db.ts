import mysql from "mysql";
import type { Prettier, SQLOperations, SQLOrderBy } from "./types/index.js";
import type { ColumnDefaultSchema } from "./column.js";
import Table, {
  type TableColumnsNameInfer,
  type TableSQLToObject,
  type TableDefaultSchema,
  type TableName,
} from "./table.js";

export type DataBaseTablesName<D> = D extends DataBase<infer T>
  ? T extends TableDefaultSchema
    ? T["getTableName"]
    : never
  : never;

export type DataBaseTableInferByName<
  DB extends DataBase,
  TableName extends string
> = DB extends DataBase<infer Tables>
  ? Tables extends TableDefaultSchema
    ? Tables["getTableName"] extends TableName
      ? Tables
      : never
    : never
  : never;

export type DataBaseExcludeTable<
  T extends TableDefaultSchema,
  TableName extends string
> = T extends TableDefaultSchema
  ? T["getTableName"] extends TableName
    ? never
    : T
  : never;

export type DataBaseSelectOptions<Table extends TableDefaultSchema> = {
  columns?: TableColumnsNameInfer<Table>[] | "*";
  where?: [
    columnName: TableColumnsNameInfer<Table>,
    operation: SQLOperations,
    operation: any
  ][];
  orderBy?: [columnName: TableColumnsNameInfer<Table>, operation: SQLOrderBy][];
  groupBy?: TableColumnsNameInfer<Table>[];
  limit?: number | { limit: number; offset: number };
};

export type DataBaseInsertOptions<Table extends TableDefaultSchema> = Prettier<
  Partial<TableSQLToObject<Table>>
>;

export type DataBaseUpdateOptions<Table extends TableDefaultSchema> = {
  sets: Prettier<Partial<TableSQLToObject<Table>>>;
  where?: [
    columnName: TableColumnsNameInfer<Table>,
    operation: SQLOperations,
    operation: any
  ][];
};

export type DataBaseDeleteOptions<Table extends TableDefaultSchema> = {
  where?: [
    columnName: TableColumnsNameInfer<Table>,
    operation: SQLOperations,
    operation: any
  ][];
};

global.isDev = process.env.NODE_ENV === "development";

export default class DataBase<T extends TableDefaultSchema = never> {
  private readonly connection: mysql.Connection;

  private tables: TableDefaultSchema[] = [];

  constructor(arg: mysql.ConnectionConfig | mysql.Connection) {
    this.connection =
      "config" in arg
        ? arg
        : mysql.createConnection({
            ...arg,
            multipleStatements: true,
            debug: global.isDev,
          });
  }

  /* Init */

  addTable<TN extends TableName, TC extends ColumnDefaultSchema>(
    table: Table<TN, TC>
  ) {
    const isTableAlreadyAdded = this.tables.find((t) => {
      return t.getTableName === table.getTableName;
    });
    if (isTableAlreadyAdded) throw new Error("Node ORM: Table already added");

    this.tables.push(table);
    return this as DataBase<T | Table<TN, TC>>;
  }

  async createTables() {
    if (this.tables.length === 0) return;

    const sql = this.tables.map((table) => table.create()).join("");

    if (global.isDev) {
      console.log("-".repeat(32));
      console.log("Create Tables: ", sql);
      console.log("-".repeat(32));
    }

    await this.query({ sql });
  }

  async dropTables() {
    if (this.tables.length === 0) return this as DataBase<never>;

    const sql = this.tables.map((table) => table.drop()).join(";");
    await this.query({ sql });

    this.tables = [];
    return this as DataBase<never>;
  }

  async dropTable<TN extends DataBaseTablesName<DataBase<T>>>(tableName: TN) {
    const table = this.tables.find((t) => t.getTableName === tableName)!;
    await this.query({ sql: table.drop() });
    return this as DataBase<DataBaseExcludeTable<T, TN>>;
  }

  /* Use */
  async select<
    TN extends DataBaseTablesName<DataBase<T>>,
    SQLObject extends TableSQLToObject<
      DataBaseTableInferByName<DataBase<T>, TN>
    >
  >(
    tableName: TN,
    options?: { columns?: "*" } & Omit<
      DataBaseSelectOptions<DataBaseTableInferByName<DataBase<T>, TN>>,
      "columns"
    >
  ): Promise<SQLObject[]>;
  async select<
    TN extends DataBaseTablesName<DataBase<T>>,
    SQLObject extends TableSQLToObject<
      DataBaseTableInferByName<DataBase<T>, TN>
    >,
    C extends keyof SQLObject
  >(
    tableName: TN,
    options: { columns: C[] } & Omit<
      DataBaseSelectOptions<DataBaseTableInferByName<DataBase<T>, TN>>,
      "columns"
    >
  ): Promise<Pick<SQLObject, C>[]>;
  async select<
    TN extends DataBaseTablesName<DataBase<T>>,
    SQLObject extends TableSQLToObject<
      DataBaseTableInferByName<DataBase<T>, TN>
    >
  >() {
    const tableName = arguments[0] as TN;
    const {
      columns = "*",
      where = [],
      orderBy = [],
      groupBy = [],
      limit = undefined,
    } = (arguments[1] ?? {}) as DataBaseSelectOptions<
      DataBaseTableInferByName<DataBase<T>, TN>
    >;

    const sql = [
      `SELECT ${
        columns === "*" ? columns : columns.join(",")
      } FROM ${tableName}`,
    ];

    if (where.length > 0) {
      const conditions = where.map(
        (params) => `${params[0]} ${params[1]} ${mysql.escape(params[2])}`
      );
      sql.push(`WHERE ${conditions.join(",")}`);
    }

    if (orderBy.length > 0) {
      const conditions = orderBy.map((params) => `${params[0]} ${params[1]}`);
      sql.push(`ORDER BY ${conditions.join(",")}`);
    }

    if (groupBy.length > 0) {
      sql.push(`GROUP BY ${groupBy.join(",")}`);
    }

    if (typeof limit !== "undefined") {
      if (typeof limit === "number") sql.push(`LIMIT ${limit}`);
      else sql.push(`LIMIT ${limit.limit} OFFSET ${limit.offset}`);
    }

    return this.query<SQLObject>({ sql: sql.join(" ") });
  }

  async update<TN extends DataBaseTablesName<DataBase<T>>>(
    tableName: TN,
    {
      sets,
      where = [],
    }: DataBaseUpdateOptions<DataBaseTableInferByName<DataBase<T>, TN>>
  ) {
    const sql = [`UPDATE ${tableName}`];

    const updates = Object.entries(sets as object)
      .map(([key, value]) => `${key}=${mysql.escape(value)}`)
      .join(",");
    sql.push(`SET ${updates}`);

    if (where.length > 0) {
      const conditions = where.map(
        (params) => `${params[0]} ${params[1]} ${mysql.escape(params[2])}`
      );
      sql.push(`WHERE ${conditions.join(",")}`);
    }

    await this.query({ sql: sql.join(" ") });
  }

  async insert<TN extends DataBaseTablesName<DataBase<T>>>(
    tableName: TN,
    options: DataBaseInsertOptions<DataBaseTableInferByName<DataBase<T>, TN>>
  ) {
    const sql = [`INSERT INTO ${tableName}`];

    const columns: string[] = [];
    const values: any[] = [];

    Object.entries(options as object).forEach(([key, value]) => {
      columns.push(key);
      values.push(mysql.escape(value));
    });

    if (columns.length > 0) {
      sql.push(`(${columns.join(",")})`);
    }

    sql.push(`VALUES (${values.join(",")})`);

    await this.query({ sql: sql.join(" ") });
  }

  async delete<TN extends DataBaseTablesName<DataBase<T>>>(
    tableName: TN,
    {
      where = [],
    }: DataBaseDeleteOptions<DataBaseTableInferByName<DataBase<T>, TN>> = {}
  ) {
    const sql = [`DELETE FROM ${tableName}`];

    if (where.length > 0) {
      const conditions = where.map(
        (params) => `${params[0]} ${params[1]} ${mysql.escape(params[2])}`
      );
      sql.push(`WHERE ${conditions.join(",")}`);
    }

    await this.query({ sql: sql.join(" ") });
  }

  /* Core */

  async query<P>(options: mysql.QueryOptions) {
    return new Promise<P>((resolve, reject) => {
      this.connection.query(options, (err, result, fields) => {
        if (err) return reject(err);

        if (global.isDev) {
          console.debug("---------------------------------------");
          console.debug(`SQL QUERY: ${options.sql}`);
          console.debug("Fields:", fields);
          console.debug("---------------------------------------");
        }

        resolve(result);
      });
    });
  }

  async transaction<T>(callback: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      this.connection.beginTransaction((err) => {
        if (err) return reject(err);

        callback().then(
          (value) => {
            this.connection.commit((err) => {
              if (err) return reject(err);
              resolve(value);
            });
          },
          (error) => {
            this.connection.rollback((err) => {
              if (err) return reject(err);
              reject(error);
            });
          }
        );
      });
    });
  }

  async connect() {
    if (this.connection.state === "connected") return;
    return new Promise<void>((resolve, reject) => {
      this.connection.connect((err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  async disconnect() {
    if (this.connection.state === "disconnected") return;
    return new Promise<void>((resolve, reject) => {
      this.connection.end((err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }
}
