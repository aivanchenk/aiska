// == Sensitive Data Guard: utils/luhn.js ==
// Luhn checksum algorithm for validating credit card numbers
function luhnCheck(numStr) {
  let sum = 0;
  let alternate = false;
  // Process digits from rightmost to leftmost
  for (let i = numStr.length - 1; i >= 0; i--) {
    let digit = parseInt(numStr.charAt(i), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}
