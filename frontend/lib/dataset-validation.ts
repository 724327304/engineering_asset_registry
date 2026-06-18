const DATA_SIZE_MAX_INTEGER_DIGITS = 10;
const DATA_SIZE_MAX_DECIMAL_DIGITS = 2;
const DATA_SIZE_MAX_VALUE = 9999999999.99;

export const DATA_SIZE_LIMIT_HINT =
  "最多 10 位整数和 2 位小数，最大 9,999,999,999.99";

export function getDataSizeError(value: string | number) {
  const raw = String(value).trim();
  if (!raw) return null;

  if (!/^\d+(\.\d*)?$/.test(raw)) {
    return "数据大小只能输入非负数字。";
  }

  const [integerPart, decimalPart = ""] = raw.split(".");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");

  if (normalizedInteger.length > DATA_SIZE_MAX_INTEGER_DIGITS) {
    return "数据大小整数部分最多 10 位，不能超过 9,999,999,999.99。";
  }

  if (decimalPart.length > DATA_SIZE_MAX_DECIMAL_DIGITS) {
    return "数据大小最多保留 2 位小数。";
  }

  if (Number(raw) > DATA_SIZE_MAX_VALUE) {
    return "数据大小不能超过 9,999,999,999.99。";
  }

  return null;
}
