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
  ['C', '0', '.', '+'],
];

export type CalculatorKey = string;

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
  const normalizedKey = key === '*' ? '×' : key === '/' ? '÷' : key;

  // Clear all
  if (normalizedKey === 'C') {
    return '0';
  }

  // Calculate equals
  if (normalizedKey === '=') {
    const result = evaluateExpression(current);
    return String(result);
  }

  const isOperator = ['+', '-', '×', '÷'].includes(normalizedKey);
  const lastChar = current.slice(-1);
  const lastIsOperator = ['+', '-', '×', '÷'].includes(lastChar);

  // Backspace
  if (normalizedKey === '⌫') {
    if (current.length <= 1) return '0';
    const trimmed = current.slice(0, -1).trim();
    return trimmed === '' ? '0' : trimmed;
  }

  // Decimal point
  if (normalizedKey === '.') {
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
      return current.slice(0, -1) + normalizedKey;
    }
    return current + normalizedKey;
  }

  // Double zero
  if (normalizedKey === '00') {
    if (current === '' || current === '0') return '0';
    const parts = current.split(/[+\-×÷]/);
    const lastPart = parts[parts.length - 1];
    if (lastPart === '0') return current;
    if (lastPart.includes('.')) {
      const decimals = lastPart.split('.')[1];
      if (decimals && decimals.length >= 1) return current;
    }
    return current + '00';
  }

  // Digits (0-9)
  if (current === '0') return normalizedKey;

  // Check last token
  const parts = current.split(/[+\-×÷]/);
  const lastPart = parts[parts.length - 1];
  if (lastPart === '0' && normalizedKey !== '0') {
    return current.slice(0, -1) + normalizedKey;
  }
  if (lastPart.includes('.')) {
    const decimals = lastPart.split('.')[1];
    if (decimals && decimals.length >= 2) return current;
  }

  return current + normalizedKey;
}
