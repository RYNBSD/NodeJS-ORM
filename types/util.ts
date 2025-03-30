export type UnionToIntersection<T> = (
  T extends any ? (x: T) => 0 : never
) extends (x: infer R) => 0
  ? R
  : never;

export type Prettier<T extends object> = {
  [K in keyof T]: T[K];
} & {};
