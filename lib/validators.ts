export const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
