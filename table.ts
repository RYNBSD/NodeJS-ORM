import type { UnionToIntersection } from "./types/index.js";
import Column, {
  type ColumnSQLToJSType,
  type ColumnDefaultSchema,
  type ColumnName,
  type ColumnType,
} from "./column.js";

export type TableName = string;

export type TableNameInfer<T> = T extends Table<infer N, any> ? N : never;

export type TableColumnsInfer<T> = T extends Table<any, infer C> ? C : never;

export type TableColumnsNameInfer<T extends TableDefaultSchema> =
  TableColumnsInfer<T> extends Column<infer CN, any> ? CN : never;

export type TableColumnsTypeInfer<T extends TableDefaultSchema> =
  TableColumnsInfer<T> extends Column<any, infer CT> ? CT : never;

export type TableSQLToObject<T extends TableDefaultSchema> =
  UnionToIntersection<
    T extends Table<any, infer Columns>
      ? Columns extends Column<infer ColumnName, infer ColumnType>
        ? { [K in ColumnName]: ColumnSQLToJSType<ColumnType> }
        : never
      : never
  >;

export type TableDefaultSchema = Table<TableName, ColumnDefaultSchema>;

export default class Table<
  N extends TableName,
  C extends ColumnDefaultSchema = never
> {
  private readonly tableName: N;

  private columns: ColumnDefaultSchema[] = [];

  private primaryKeyColumns: string[] = [];
  private uniqueColumns: string[] = [];

  constructor(tableName: N) {
    this.tableName = tableName;
  }

  get getTableName() {
    return this.tableName;
  }

  getColumnInfo<CN extends TableColumnsNameInfer<Table<N, C>>>(columnName: CN) {
    return this.columns.find((c) => c.getColumnName === columnName)!;
  }

  addColumn<CN extends ColumnName, CT extends ColumnType>(
    column: Column<CN, CT>
  ): Table<N, C | Column<CN, CT>> {
    this.columns.push(column);

    if (column.getOptions.primaryKey)
      this.primaryKeyColumns.push(column.getColumnName);
    if (column.getOptions.unique) this.uniqueColumns.push(column.getColumnName);

    return this;
  }

  private columnBuilder(column: ColumnDefaultSchema) {
    const options = column.getOptions;

    const columnSQL = `${column.getColumnName} ${options.type} ${
      options.autoIncrement ? "AUTO_INCREMENT" : ""
    } ${options.nullable ? "NULL" : "NOT NULL"} ${
      options.default ? `DEFAULT ${options.default}` : ""
    }`;

    const cascade = options.foreignKey?.cascade
      ? options.foreignKey.cascade === "onDelete"
        ? "ON DELETE"
        : options.foreignKey.cascade === "onUpdate"
        ? "ON UPDATE"
        : options.foreignKey.cascade
      : "";

    return options.foreignKey
      ? `${columnSQL},FOREIGN KEY (${column.getColumnName}) REFERENCES ${
          options.foreignKey.table
        }(${options.foreignKey.column}) ${cascade ? `${cascade} CASCADE` : ""}`
      : columnSQL;
  }

  create() {
    const primaryKey =
      this.primaryKeyColumns.length > 0
        ? `PRIMARY KEY (${this.primaryKeyColumns.join(",")})`
        : "";

    const unique =
      this.uniqueColumns.length > 0
        ? `UNIQUE (${this.uniqueColumns.join(",")}),`
        : "";

    const columns = this.columns.map(this.columnBuilder).join(",");

    return `CREATE TABLE IF NOT EXISTS ${this.tableName} (
      ${columns}${unique || primaryKey ? "," : ""}${unique}${primaryKey}
    );`;
  }

  drop() {
    return `DROP TABLE IF EXISTS ${this.tableName};`;
  }
}
