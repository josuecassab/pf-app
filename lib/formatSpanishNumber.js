export function formatSpanishNumber(num) {
  const isNegative = num < 0;
  const absoluteNum = Math.abs(num);

  const parts = absoluteNum.toString().split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  let result = formattedInteger;
  if (decimalPart) {
    result += "," + decimalPart;
  }

  return isNegative ? "-" + result : result;
}
