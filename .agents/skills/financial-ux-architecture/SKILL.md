---
name: financial-ux-architecture
description: >-
  Architectural and UX blueprint for engineering high-performance, minimalist,
  and accessible financial screens (Budget, Accounts, Dashboard) in WhereCash / MoneyApp.
  Enforces <150 lines lean view shells, headless UI hooks, 60/120fps Reanimated worklets,
  and progressive disclosure ergonomics.
---

# Financial UX & Screen Architecture Standard

This skill defines the strict architectural and user experience standards for designing, building, and refactoring financial screens in WhereCash.

---

## 1. The Core UX Principles

### A. Progressive Disclosure over Information Overload
- **Never overwhelm on initial render**: A user opening a financial screen (e.g., Budget) wants to answer one primary question in under 3 seconds: *"Am I on track or overspending?"*
- Secondary details (sub-category breakdowns, bill schedules, historical logs) must be neatly partitioned using:
  - Focused segmented tabs (`Categories` vs `Planned Bills`).
  - Collapsible drawers/accordions (`isExpanded` toggles with animated chevrons).
  - Clean bottom sheets for editing.

### B. One-Tap Accessibility & Minimal Friction
- Avoid requiring users to dig into 3 layers of menus to set a budget or mark a bill as paid.
- Common actions must be accessible via direct 1-tap chips, swipe gestures, or primary action buttons.
- Every financial input modal must include:
  - On-demand calculator keypad for quick additions/multiplications.
  - Quick amount presets (`+₹500`, `+₹1,000`, `+₹5,000`).
  - Android native keyboard lift (`useKeyboardHeight`).

---

## 2. Strict Clean Architecture (3-Tier Rule)

Every screen in `src/app/` must strictly comply with:

```
src/app/(tabs)/[screen].tsx          <── LEAN VIEW SHELL (STRICTLY < 150 LINES)
        │
        ├── Reads single contract from:
        ▼
src/features/[feature]/hooks/use[Feature]Screen.ts  <── HEADLESS LOGIC HOOK
        │
        ├── Orchestrates state, filters, haptics, store actions
        ├── Returns { data, state, toggles, handlers }
        ▼
src/features/[feature]/components/   <── ATOMIC PRESENTATION WIDGETS
        │
        └── Pure visual cards, lists, dials, sheets (using Design Tokens only)
```

### Prohibited in `src/app/` View Shells:
- ❌ Direct store subscriptions (`useTransactionStore`, `useBudgetStore`, etc.).
- ❌ More than 1 local `useState` (all UI states belong in the headless hook).
- ❌ Raw array transformations or inline data filtering inside render loops.
- ❌ Hardcoded color hexes or raw numeric margins/padding.

---

## 3. 60/120 FPS Performance Standards

1. **Reanimated 3 Native Worklets**:
   - Progress bar fills, chevron rotations, and modal slide-ins must execute on the **Native UI Thread** via `useSharedValue` and `useAnimatedStyle`.
2. **Memoized Row Items**:
   - All repeating list items (categories, transaction rows, bill timeline cards) must be wrapped in `React.memo` with stable `useCallback` press handlers.
3. **No Layout Shifts or Artificial Loading Jumps**:
   - Never use artificial `requestIdleCallback` timeouts that cause blank screen flashes when data is already hydrated in local Zustand stores.

---

## 4. Native Android Ergonomics Guardrails

1. **Modal Windows**:
   - Android `<Modal>` components must always bind `paddingBottom: insets.bottom + kbH` using `useKeyboardHeight()`.
2. **Numeric Typography**:
   - All balance and monetary values must use `variant="numeric"` with explicit `lineHeight: 44` and `paddingVertical: 4` to eliminate top/bottom edge digit clipping.
