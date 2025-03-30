export type SQLString =
  | `VARCHAR(${number})`
  | `TEXT(${number})`
  | "TINYTEXT"
  | "MEDIUMTEXT"
  | "LONGTEXT";

export type SQLNumber = "INT" | "FLOAT";

export type SQLBoolean = "BOOL";

export type SQLDate = "TIMESTAMP";

export type SQLBuffer =
  | "TINYBLOB"
  | `BLOB(${number})`
  | "MEDIUMBLOB"
  | "LONGBLOB";

export type SQLOrderBy = "ASC" | "DESC";

export type SQLOperations =
  | "="
  | "<>"
  | ">="
  | "<="
  | ">"
  | "<"
  | (string & {});
