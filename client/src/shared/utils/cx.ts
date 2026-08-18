/**
 * Ghép class name, bỏ qua giá trị rỗng/false/undefined.
 * Trả về `undefined` khi không có class nào để React không render `class=""`.
 */
export const cx = (...values: readonly (string | false | null | undefined)[]): string | undefined => {
  const classes = values.filter((value): value is string => typeof value === 'string' && value !== '');
  return classes.length > 0 ? classes.join(' ') : undefined;
};
