/**
 * @file calculator.ts
 * @architecture Utilities Layer
 * @description Safe, lightweight arithmetic calculator and keypad handler for financial inputs.
 *   Evaluates expressions (+, -, ×, ÷) with operator precedence without using eval().
 *   Provides numpad key matrix and input state machine.
 */

export const CALCULATOR_KEYS: string[][] = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  ['.', '0', '⌫', '+'],
];

export type CalculatorKey = typeof CALCULATOR_KEYS[number][number];

/**
 * Safely evaluates an arithmetic expression containing numbers and +, -, *, /
 * Respects operator precedence (* and / before + and -).
 */
export function evaluateExpression(expr: string): number {
  if (!expr || expr.trim() === '') return 0;

  // Normalize symbols: convert × to * and ÷ to /
  const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
  // Strip trailing operators or decimal points
  const trimmed = sanitized.replace(/[+\-*/.]+$/, '');
  if (!trimmed) return 0;

  try {
    const tokens = trimmed.match(/(\d+(\.\d+)?|[+\-*/])/g);
    if (!tokens || tokens.length === 0) return 0;

    // Pass 1: Process multiplication and division
    const intermediate: (string | number)[] = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === '*' || token === '/') {
        const prev = Number(intermediate.pop());
        const next = Number(tokens[++i]);
        if (token === '*') {
          intermediate.push(prev * next);
        } else {
          intermediate.push(next !== 0 ? prev / next : 0);
        }
      } else {
        intermediate.push(token);
      }
      i++;
    }

    // Pass 2: Process addition and subtraction
    let result = Number(intermediate[0]);
    let j = 1;
    while (j < intermediate.length) {
      const op = intermediate[j];
      const next = Number(intermediate[j + 1]);
      if (op === '+') {
        result += next;
      } else if (op === '-') {
        result -= next;
      }
      j += 2;
    }

    return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * State machine for handling calculator button presses.
 */
export function applyCalculatorKey(current: string, key: string): string {
  const isOperator = ['+', '-', '×', '÷'].includes(key);
  const lastChar = current.slice(-1);
  const lastIsOperator = ['+', '-', '×', '÷'].includes(lastChar);

  // Backspace
  if (key === '⌫') {
    if (current.length <= 1) return '0';
    // Remove space + operator + space if operator
    return current.slice(0, -1).trim();
  }

  // Decimal point
  if (key === '.') {
    // Extract last number token
    const parts = current.split(/[+\-×÷]/);
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('.')) return current;
    if (lastIsOperator || current === '') return current + '0.';
    return current + '.';
  }

  // Operators (+, -, ×, ÷)
  if (isOperator) {
    if (current === '' || current === '0') return '0';
    if (lastIsOperator) {
      // Replace last operator
      return current.slice(0, -1) + key;
    }
    return current + key;
  }

  // Digits (0-9)
  if (current === '0') return key;

  // Enforce max 2 decimals on active number token
  const parts = current.split(/[+\-×÷]/);
  const lastPart = parts[parts.length - 1];
  if (lastPart.includes('.')) {
    const decimals = lastPart.split('.')[1];
    if (decimals && decimals.length >= 2) return current;
  }

  return current + key;
}
