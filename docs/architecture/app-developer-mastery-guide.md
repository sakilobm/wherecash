# WhereCash Architecture: The Complete Mobile App Developer Mastery Blueprint

> **Mission**: This master document distills every critical architectural paradigm, design pattern, native trap, and performance optimization utilized in the WhereCash / MoneyApp codebase.  
> **Target Level**: Mid-to-Senior React Native / Mobile Engineers striving for **Staff / Principal Architect** mastery.

---

## Table of Contents
1. [Core Architectural Paradigm: Headless UI & Feature-Sliced Architecture](#1-core-architectural-paradigm-headless-ui--feature-sliced-architecture)
2. [State Management & Data Flow Architecture (Zustand)](#2-state-management--data-flow-architecture-zustand)
3. [The UI Thread Animation Engine (Reanimated 3 Worklets)](#3-the-ui-thread-animation-engine-reanimated-3-worklets)
4. [Native Android Traps & How We Conquered Them](#4-native-android-traps--how-we-conquered-them)
5. [Financial Domain Integrity & Arithmetic Safety](#5-financial-domain-integrity--arithmetic-safety)
6. [Design System & Multi-Theme Token Architecture](#6-design-system--multi-theme-token-architecture)
7. [The Senior Engineer's Mental Checklist for New Features](#7-the-senior-engineers-mental-checklist-for-new-features)

---

## 1. Core Architectural Paradigm: Headless UI & Feature-Sliced Architecture

### The Anti-Pattern (What Junior Devs Do)
Most mobile apps fail to scale because developers place API calls, form state, animation drivers, device haptics, and UI rendering into a single monster 800-line screen file.
- Testing is impossible.
- Reusability is zero.
- Re-renders cascade uncontrollably, dropping frames below 60fps.

### The WhereCash Standard: 3-Tier Layering
We strictly enforce a three-layer model:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VIEW SHELL  (src/app/...)                                │
│    - File size limit: strictly < 150 lines                  │
│    - Consumes headless custom hook                          │
│    - Pure declarative JSX orchestration                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. HEADLESS LOGIC HOOKS  (src/features/[feature]/hooks/...) │
│    - Business logic, form states, validation                │
│    - Device haptics & modal/sheet toggles                   │
│    - Data transformations & store selectors                 │
│    - Returns a clean contract: { state, handlers, data }    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. ATOMIC PRESENTATION (src/components/[feature]/...)       │
│    - Visual cards, buttons, swatches, modals                │
│    - Strictly "dumb": accepts props, emits callbacks        │
│    - Pure styling with Design System tokens                 │
└─────────────────────────────────────────────────────────────┘
```

#### The Golden Rule of Headless Hooks:
A headless hook must never return JSX. It exposes a predictable contract:
```ts
export function useAccountsScreen() {
  // 1. Data / Selectors
  // 2. Modals & Sheet Toggles
  // 3. Form States
  // 4. Action Handlers with Haptic Feedback
  return {
    accounts,
    totalBalance,
    isFormOpen,
    openCreateForm,
    closeForm,
    handleSaveAccount,
  };
}
```
Now, `src/app/accounts.tsx` simply plugs this contract into atomic visual components. If you ever need to change the UI from a List to a Carousel or Grid, the business logic remains **100% untouched**.

---

## 2. State Management & Data Flow Architecture (Zustand)

### Why Zustand Over Redux or React Context?
1. **Zero Provider Boilerplate**: Context API requires wrapping providers that trigger whole-tree re-renders whenever context values change. Redux requires excessive actions/reducers/dispatch ceremony.
2. **Selective Subscriptions**: Zustand allows granular selector subscriptions:
   ```ts
   // Only re-renders when user.currency changes, ignoring all other auth state changes!
   const currency = useAuthStore((s) => s.user?.currency);
   ```
3. **Decoupled Stores**:
   - `authStore`: User session, profile, primary currency.
   - `accountsStore`: Account entities, account roles, balances.
   - `transactionStore`: Income, expense, transfers, ledger relations.
   - `preferencesStore`: UI toggles, hide-balance privacy mode, theme settings.

### Offline-First Persistence
All stores are designed to write through to local durable storage (SQLite / Async Storage). The UI never awaits remote networks to update the local screen — writes are **optimistic**, immediate, and reactive.

---

## 3. The UI Thread Animation Engine (Reanimated 3 Worklets)

### JavaScript Thread vs UI Thread
In React Native, JavaScript runs on a single background thread. If the JS thread is busy parsing data, calculating numbers, or mounting a heavy component:
- Standard animations stutter and drop frames.
- Touches feel sluggish.

### The Worklet Solution
WhereCash uses **React Native Reanimated 3**:
```ts
const slideY = useSharedValue(440);

const sheetStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: slideY.value }],
}));
```
- `useSharedValue` and `useAnimatedStyle` run on the **Native UI Thread (60/120 FPS)** via compiled C++ worklets.
- Even if the JS thread is heavily occupied, sheet entrances, gestures, and bounces remain butter-smooth.

---

## 4. Native Android Traps & How We Conquered Them

Mobile developers who only test on iOS always run into severe bugs on Android. Here are the 3 major native Android traps solved in WhereCash:

### Trap 1: Android Modal Window Keyboard Inset Failure
- **The Issue**: On Android, `<Modal>` creates a separate Android OS `Window`. Because of this, React Native's `<KeyboardAvoidingView>` **fails to receive window resize events** inside modals. The soft keyboard pops up directly over bottom sheets and covers inputs!
- **The Fix**: We built [`useKeyboardHeight()`](../../src/hooks/useKeyboardHeight.ts). It subscribes directly to native `keyboardDidShow` / `keyboardDidHide` events and dynamically offsets the bottom footer:
  ```ts
  paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 14) + kbH : insets.bottom;
  ```

### Trap 2: Android Native Font Clipping (The "Hidden Digits" Bug)
- **The Issue**: On Android, text rendering engines use strict vertical font bounding boxes. If you set `includeFontPadding: false` on an `<AppText>` or `<TextInput>` with a large font size (e.g. 32px or 36px) without explicit `lineHeight`, Android slices off the top and bottom pixels of numbers (like `8`, `9`, `6`, `0`).
- **The Fix**:
  1. Always provide an explicit `lineHeight` proportionally larger than `fontSize` (e.g., `fontSize: 34`, `lineHeight: 44`).
  2. For inputs, use `textAlignVertical: 'center'` and `minHeight`.
  3. Use `variant="numeric"` which applies calibrated tabular typography tokens.

### Trap 3: Hardware Back Button Handling
In multi-step wizards or bottom sheets, Android users expect the hardware back button to step back in the flow rather than closing the entire app. Always wire `onRequestClose` to handle wizard step rollbacks (`setStep(1)` before `onClose()`).

---

## 5. Financial Domain Integrity & Arithmetic Safety

### The IEEE-754 Precision Trap
In JavaScript:
```js
0.1 + 0.2 === 0.30000000000000004 // true!
```
In a financial ledger, a floating-point leak can corrupt balances.
**The WhereCash Law**:
All arithmetic computations must be rounded to exactly 2 decimals before being stored:
```ts
Math.round(result * 100) / 100
```

### Pure Calculator State Machine
Instead of dangerous `eval()`, all calculations run through our pure 2-pass math parser in [`src/utils/calculator.ts`](../../src/utils/calculator.ts):
- Evaluates `*` and `/` first.
- Evaluates `+` and `-` second.
- Protects against division by zero.
- Replaces solitary leading zeroes (`05` -> `5`) and swaps consecutive operators (`20+×` -> `20×`).

---

## 6. Design System & Multi-Theme Token Architecture

### No Hardcoded Colors or Arbitrary Spacing
Never write `padding: 17` or `color: '#123456'` directly in styles. WhereCash enforces centralized token imports from `@constants/index`:

1. **Colors (`useTheme()`)**:
   - `colors.background.primary / secondary / card`
   - `colors.text.primary / secondary / tertiary`
   - `colors.status.income / expense / warning`
   - `colors.glass.background / border`
2. **Spacing**: `Spacing['1']` (4px), `Spacing['2']` (8px), `Spacing['4']` (16px), etc.
3. **Radius**: `Radius.sm`, `Radius.md`, `Radius.lg`, `Radius.xl`, `Radius.full`.
4. **Typography**: Headings, labels, and `variant="numeric"` for monetary amounts.

---

## 7. The Senior Engineer's Mental Checklist for New Features

Before submitting any code or pull request, run through this mental quality gate:

- [ ] **Layer Check**: Did I keep `src/app/` under 150 lines? Is all business logic in a custom hook?
- [ ] **Android Keyboard Check**: If this screen has a modal with inputs, did I account for `useKeyboardHeight()`?
- [ ] **Text Clipping Check**: Did I test large numbers on Android to ensure ascenders/descenders are not clipped?
- [ ] **Haptics Check**: Did I add subtle haptics (`Haptics.impactAsync`) to primary buttons, switches, and tabs?
- [ ] **Theme Check**: Does this screen render flawlessly in both Dark Mode and Light Mode?
- [ ] **Pure Utility Check**: Is mathematical or transformation logic isolated in pure functions with zero React dependencies?

---

*Master these 7 pillars, and you will not only write impeccable code in WhereCash, but operate at the top tier of mobile software engineering anywhere in the industry.*
