# Deep Dive: Financial Calculator Engine & Mobile Keypad Architecture

> **Target Audience**: Software Engineers & Architects seeking senior/expert-level mastery of client-side arithmetic engines, state machines, and React Native mobile input ergonomics.  
> **Source Files**: 
> - Pure Engine: [`src/utils/calculator.ts`](../../src/utils/calculator.ts)
> - Presentation & Integration: [`src/components/accounts/AccountFormSheet.tsx`](../../src/components/accounts/AccountFormSheet.tsx)

---

## 1. The Real-World Engineering Problem

In financial applications (such as Ivy Wallet, Revolut, or WhereCash), users rarely enter simple round integers. In real life, users need to:
1. **Split or aggregate sums** before creating an account or logging an expense (e.g. `1200 + 450 + 75`).
2. **Compute multiplications or shares** (e.g. `20 * 23` shares or hourly rates).
3. **Avoid the dreaded soft-keyboard UX pitfall**:
   - On iOS and Android, software keyboards occupy **40% to 50%** of the screen viewport.
   - Inside bottom sheet modals (`<Modal>`), native software keyboards cover primary buttons, force awkward scroll jumps, and provide no native arithmetic operations (`+`, `-`, `×`, `÷`).

### The Solution: An On-Demand Ivy Wallet-Inspired Hybrid
Instead of forcing a heavy, permanent calculator or relying exclusively on the native keyboard, we engineered an **on-demand hybrid**:
- **Default State**: Clean, minimalist currency display with normal keyboard capability.
- **On-Demand State**: When the user taps the `[ 🧮 Calculator ]` button, the system keyboard is dismissed, and a high-performance, haptic-enhanced custom keypad emerges with live evaluation and an explicit `=` button.

---

## 2. Architecture & Layer Separation

We follow a strict **Separation of Concerns (SoC)** principle:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│        (src/components/accounts/AccountFormSheet.tsx)       │
│                                                             │
│  - Animated bottom sheet view & On-Demand toggling          │
│  - 4x4 Grid + Prominent Row 5 keypad render                 │
│  - Real-time live result banner (e.g. "= ₹460.00")          │
│  - Haptics feedback (Expo Haptics) & Android Keyboard lift  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches key string ('7', '+', '=', etc.)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN / UTILITY LAYER                  │
│                   (src/utils/calculator.ts)                 │
│                                                             │
│  - applyCalculatorKey(current, key): Pure State Machine      │
│  - evaluateExpression(expr): 2-Pass Operator Precedence     │
│  - Zero side effects, Zero React hooks, 100% Testable       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. The Math Engine: Why `eval()` is Forbidden & How We Solve It

### The Danger of `eval()` or `new Function()`
Many junior developers attempt arithmetic evaluation using:
```js
// ❌ DANGEROUS & UNACCEPTABLE IN PRODUCTION:
const total = eval(expression.replace(/×/g, '*'));
```
Why this is strictly forbidden in enterprise finance apps:
1. **Arbitrary Code Execution (XSS / Injection)**: If any user input or paste injects malicious JavaScript, `eval` executes it with full application privileges.
2. **Hermes Engine / Strict Mode Crashes**: React Native’s modern Hermes engine optimizes out dynamic scope analysis; `eval` breaks JIT optimizations and throws CSP errors.
3. **Floating-Point Imprecision**: `0.1 + 0.2` produces `0.30000000000000004` in standard IEEE-754 floating point arithmetic.

---

### The 2-Pass Precedence Algorithm in `evaluateExpression`

To evaluate expressions like `10 + 20 × 2 - 5` without external dependencies, we implemented a custom, lightweight token-based parser honoring standard **BODMAS / PEMDAS** precedence (Multiplication & Division before Addition & Subtraction).

#### Step 1: Normalization & Sanitization
```ts
// 1. Convert human-friendly UI glyphs to standard math symbols
const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');

// 2. Strip any trailing dangling operators or decimal points (e.g. "20+" -> "20")
const trimmed = sanitized.replace(/[+\-*/.]+$/, '');
```

#### Step 2: Tokenization
We use a targeted regular expression:
```ts
const tokens = trimmed.match(/(\d+(\.\d+)?|[+\-*/])/g);
// Example: "20+5*4" -> ["20", "+", "5", "*", "4"]
```

#### Step 3: Pass 1 — Multiplication & Division
We iterate through the tokens. When a `*` or `/` is encountered, we pop the previous operand, multiply or divide it by the next operand, and push the result back:
```ts
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
      intermediate.push(next !== 0 ? prev / next : 0); // Division by zero protection
    }
  } else {
    intermediate.push(token);
  }
  i++;
}
// Example after Pass 1: ["20", "+", 20]
```

#### Step 4: Pass 2 — Addition & Subtraction
With all multiplication and division resolved, Pass 2 sequentially folds addition and subtraction from left to right:
```ts
let result = Number(intermediate[0]);
let j = 1;
while (j < intermediate.length) {
  const op = intermediate[j];
  const next = Number(intermediate[j + 1]);
  if (op === '+') result += next;
  else if (op === '-') result -= next;
  j += 2;
}
```

#### Step 5: Financial Precision Rounding
To prevent IEEE-754 precision artifacts (`0.1 + 0.2 = 0.30000000000000004`):
```ts
return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100;
```

---

## 4. The Keypad State Machine: `applyCalculatorKey`

When a user taps a button, how should the input string change?
The state machine in `applyCalculatorKey(current, key)` governs all legal transitions:

| Key Type | Input Example | Action Taken | Output Result | Why It Matters |
| :--- | :--- | :--- | :--- | :--- |
| **Digit (`0-9`)** | `'0'`, Key=`'5'` | Replaces solitary leading zero | `'5'` | Prevents ugly strings like `'05'`. |
| **Digit (`0-9`)** | `'20+0'`, Key=`'3'` | Replaces trailing zero after operator | `'20+3'` | Prevents invalid operand `'20+03'`. |
| **Operator (`+,-,×,÷`)** | `'20+'`, Key=`'×'` | Swaps previous operator | `'20×'` | User changed their mind; avoids `'20+×'`. |
| **Decimal (`.`)** | `'25.5'`, Key=`'.'` | No-op (checks current token) | `'25.5'` | Prevents invalid floats like `'25.5.2'`. |
| **Decimal (`.`)** | `'20+'`, Key=`'.'` | Appends `'0.'` | `'20+0.'` | Guarantees syntactically valid float token. |
| **Max Decimals** | `'12.34'`, Key=`'5'` | Rejects 3rd decimal place | `'12.34'` | Currency values cannot exceed 2 decimal digits. |
| **Backspace (`⌫`)** | `'25'`, Key=`'⌫'` | Removes last character | `'2'` | Standard text editing behavior. |
| **Backspace (`⌫`)** | `'4'`, Key=`'⌫'` | Fallback to `'0'` | `'0'` | Avoids empty string state. |
| **Clear (`C`)** | `'1845.50'`, Key=`'C'`| Immediate reset | `'0'` | Fast purge. |
| **Equals (`=`)** | `'20×23'`, Key=`'='` | Invokes `evaluateExpression` | `'460'` | Calculates and displays total in place. |

---

## 5. Mobile UX & React Native Ergonomics

### A. Keypad Layout Architecture
Standard 4-column calculators cram the `=` button into a corner. In mobile banking apps, computing the total is the **primary user goal**.

We engineered a **4x4 matrix + dedicated Row 5**:
```
┌──────┬──────┬──────┬──────┐
│  7   │  8   │  9   │  ÷   │  Row 1
├──────┼──────┼──────┼──────┤
│  4   │  5   │  6   │  ×   │  Row 2
├──────┼──────┼──────┼──────┤
│  1   │  2   │  3   │  -   │  Row 3
├──────┼──────┼──────┼──────┤
│  C   │  0   │  .   │  +   │  Row 4
├──────┴──────┬──────┴──────┤
│    ⌫ (1x)   │  = Total (3x) │  Row 5 (Wide, High-Contrast Action Bar)
└─────────────┴─────────────┘
```
- **Backspace (`⌫`)**: `flex: 1` — easily reachable with thumb.
- **Equals (`= Total`)**: `flex: 3` — painted with the user's selected account theme color (`form.color`).
- When an operator is active (e.g. `20×23`), the `=` button dynamically displays the evaluated total right inside it: `= 460`!

### B. Live Real-Time Result Banner
Users should not have to guess what their math equals before tapping `=`:
```tsx
{hasOperation && (
  <Pressable
    onPress={() => set('balance', applyCalculatorKey(form.balance, '='))}
    style={[s.liveResultRow, { backgroundColor: form.color + '12' }]}
  >
    <AppText variant="caption">TOTAL</AppText>
    <AppText style={[s.liveResultText, { color: form.color }]}>
      = {currentSymbol}{evaluatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </AppText>
    <AppText variant="caption">Tap = to apply</AppText>
  </Pressable>
)}
```

### C. Android Modal Keyboard Avoidance Trap
Inside React Native on Android:
- Android `<Modal>` components live in a **separate native Window**.
- React Native’s `<KeyboardAvoidingView>` **does not receive window insets** inside modals on Android!
- **The Fix**: We use [`useKeyboardHeight()`](../../src/hooks/useKeyboardHeight.ts) which listens directly to `keyboardDidShow` / `keyboardDidHide` native events and dynamically offsets `paddingBottom: insets.bottom + kbH`.

---

## 6. Senior Developer Checklist for Feature Extensions

When modifying or extending this calculator engine (e.g. adding percentages `%` or parentheses `()`):

1. **Keep `src/utils/calculator.ts` Pure**: Never import React, React Native, or state stores into `calculator.ts`. It must remain 100% platform-agnostic.
2. **Never Break Financial Precision**: Always round evaluated totals with `Math.round(val * 100) / 100`.
3. **Handle Trailing Operators on Save**: If the user leaves the input as `500 +`, the save handler must evaluate `500 +` to `500` before persisting to SQLite/Zustand.
4. **Trigger Haptics on Button Press**:
   - Standard digits: `Haptics.ImpactFeedbackStyle.Light`
   - Equals / Compute: `Haptics.ImpactFeedbackStyle.Medium`
   - Form Save: `Haptics.NotificationFeedbackType.Success`
