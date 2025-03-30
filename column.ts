import type {
  SQLBoolean,
  SQLBuffer,
  SQLDate,
  SQLNumber,
  SQLString,
} from "./types/index.js";

export type ColumnName = string;

export type ColumnType =
  | SQLString
  | SQLNumber
  | SQLBoolean
  | SQLDate
  | SQLBuffer;

export type ColumnForeignKey = {
  table: string;
  column: string;
  cascade?: "onDelete" | "onUpdate" | (string & {});
};

export type ColumnSQLToJSType<T extends ColumnType> = T extends SQLString
  ? string
  : T extends SQLNumber
  ? number
  : T extends SQLBoolean
  ? boolean
  : T extends SQLDate
  ? Date
  : T extends SQLBuffer
  ? Buffer
  : never;

export type ColumnOptions<T extends ColumnType> = {
  type: T;
  primaryKey?: boolean;
  autoIncrement?: T extends SQLNumber ? boolean : never;
  nullable?: boolean;
  default?: string;
  unique?: boolean;
  foreignKey?: ColumnForeignKey;
};

export type ColumnDefaultSchema = Column<ColumnName, ColumnType>;

export default class Column<N extends ColumnName, T extends ColumnType> {
  private readonly columnName: N;
  private readonly options: ColumnOptions<T>;

  constructor(columnName: N, options: ColumnOptions<T>) {
    this.columnName = columnName;
    this.options = options;
  }

  get getColumnName() {
    return this.columnName;
  }

  get getOptions() {
    return { ...this.options };
  }
}
