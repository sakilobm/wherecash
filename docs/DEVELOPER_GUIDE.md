# WhereCash Complete Developer & Feature Architecture Master Guide

> **Single Source of Truth**: All developer mastery standards, core system architecture, and detailed feature guides for the WhereCash / MoneyApp codebase are consolidated in this single document.

---

# Table of Contents
- [PART 1: Full-Stack Mobile Architecture & Mastery Blueprint](#part-1-full-stack-mobile-architecture--mastery-blueprint)
  - [1. 3-Tier Layering & Headless UI Contract](#1-3-tier-layering--headless-ui-contract)
  - [2. Zustand State Management & Selective Subscriptions](#2-zustand-state-management--selective-subscriptions)
  - [3. Native UI Thread Animations (Reanimated 3 Worklets)](#3-native-ui-thread-animations-reanimated-3-worklets)
  - [4. Native Android Traps & Proven Fixes](#4-native-android-traps--proven-fixes)
  - [5. Financial Domain Integrity & Arithmetic Safety](#5-financial-domain-integrity--arithmetic-safety)
  - [6. Design System Tokens & Dual-Theme Architecture](#6-design-system-tokens--dual-theme-architecture)
  - [7. Senior Engineer's Mental Quality Gate](#7-senior-engineers-mental-quality-gate)
- [PART 2: Feature Deep Dive — Financial Calculator & Safe Parser](#part-2-feature-deep-dive--financial-calculator--safe-parser)
  - [1. The UX Problem & On-Demand Keypad](#1-the-ux-problem--on-demand-keypad)
  - [2. The 2-Pass Operator Precedence Parser (No `eval()`)](#2-the-2-pass-operator-precedence-parser-no-eval)
  - [3. Keypad State Machine Rules](#3-keypad-state-machine-rules)
  - [4. Ivy Wallet Ergonomics & Dedicated Row 5](#4-ivy-wallet-ergonomics--dedicated-row-5)
- [PART 3: Feature Deep Dive — Collapsible Quick Accounts Dropdown](#part-3-feature-deep-dive--collapsible-quick-accounts-dropdown)
  - [1. Progressive Disclosure in Mobile UI](#1-progressive-disclosure-in-mobile-ui)
  - [2. Reanimated 3 Worklet Chevron Rotation](#2-reanimated-3-worklet-chevron-rotation)
  - [3. Negative Margin Edge-to-Edge Carousel Pattern](#3-negative-margin-edge-to-edge-carousel-pattern)
- [PART 4: Feature Deep Dive — Budget Screen Refactoring Masterclass](#part-4-feature-deep-dive--budget-screen-refactoring-masterclass)
  - [1. The Mistakes in the Old Code (Ena Mistake Pannom?)](#1-the-mistakes-in-the-old-code-ena-mistake-pannom)
  - [2. How We Fixed It (Epdi Fix Pannom?)](#2-how-we-fixed-it-epdi-fix-pannom)
  - [3. Senior Developer Mental Models & Rules of Thumb](#3-senior-developer-mental-models--rules-of-thumb)

---

# PART 1: Full-Stack Mobile Architecture & Mastery Blueprint

## 1. 3-Tier Layering & Headless UI Contract

We strictly prevent monolithic 800-line screen files by enforcing 3 distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VIEW SHELL  (src/app/...)                                │
│    - Rule: Strictly < 150 lines                             │
│    - Role: Declarative JSX only, consumes headless hooks    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. HEADLESS LOGIC HOOKS  (src/features/[feature]/hooks/...) │
│    - Role: State, device haptics, validation, store access  │
│    - Rule: NEVER return JSX. Return { state, actions, data }│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. ATOMIC PRESENTATION (src/components/[feature]/...)       │
│    - Role: Dumb presentation components, cards, sheets      │
│    - Rule: Design tokens only, callbacks emitted to hooks   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Zustand State Management & Selective Subscriptions
- **Why not Redux / Context?**: Redux introduces massive boilerplate. Context API triggers full sub-tree re-renders on every value update.
- **Granular Selectors**:
  ```ts
  // Only re-renders if user.currency changes, ignoring other auth mutations!
  const currency = useAuthStore((s) => s.user?.currency);
  ```
- **Store Division**: `authStore`, `accountStore`, `transactionStore`, `preferencesStore`, `plannedPaymentsStore`, `budgetStore`.

## 3. Native UI Thread Animations (Reanimated 3 Worklets)
- JavaScript executes on a single background thread in React Native. Heavy CPU tasks drop frames if animations run on JS.
- Using `useSharedValue` and `useAnimatedStyle` compiles worklets to C++ executing directly on the **Native UI Thread (60/120 FPS)**.

## 4. Native Android Traps & Proven Fixes
1. **Modal Keyboard Overlap**: `<Modal>` in Android is a separate native Window. Normal `<KeyboardAvoidingView>` fails. We use `useKeyboardHeight()` to listen directly to `keyboardDidShow`/`keyboardDidHide` and apply manual `paddingBottom: insets.bottom + kbH`.
2. **Text Clipping**: Android EditText/Text clips top and bottom edges of numbers (like `8`, `9`, `6`, `0`) when `includeFontPadding: false` is paired with large fonts without explicit `lineHeight`. We always pair `fontSize: 34` with `lineHeight: 44` and `variant="numeric"`.
3. **Hardware Back Button**: Handle nested wizard step rollbacks via `onRequestClose` before dismissing modals.

## 5. Financial Domain Integrity & Arithmetic Safety
- **IEEE-754 Floating-Point Bug**: `0.1 + 0.2 === 0.30000000000000004`. All monetary math must be rounded: `Math.round(val * 100) / 100`.
- **Zero `eval()` Policy**: Never use `eval()` or `new Function()`. Use deterministic token-based parsing.

## 6. Design System Tokens & Dual-Theme Architecture
- Import exclusively from `@constants/index`: `colors` via `useTheme()`, `Spacing`, `Radius`, `FontFamily`.
- Never hardcode raw hex codes or magic padding numbers.

## 7. Senior Engineer's Mental Quality Gate
Before finishing any screen or component:
- [ ] View Shell `< 150 lines`?
- [ ] Logic isolated in a headless hook?
- [ ] Android modal keyboard tested with `useKeyboardHeight()`?
- [ ] No clipped numbers on Android?
- [ ] Haptic feedback integrated on primary actions?
- [ ] Flawless in both Dark and Light modes?

---

# PART 2: Feature Deep Dive — Financial Calculator & Safe Parser

> **Source**: [`src/utils/calculator.ts`](../src/utils/calculator.ts), [`src/components/accounts/AccountFormSheet.tsx`](../src/components/accounts/AccountFormSheet.tsx)

## 1. The UX Problem & On-Demand Keypad
Users splitting bills or calculating sums (e.g. `20 * 23`) face a bad experience if forced to switch apps or use mobile soft keyboards that cover 50% of the screen.
- **Default State**: Clean currency display with standard typing.
- **On-Demand State**: Clicking `[ 🧮 Calculator ]` dismisses soft keyboard and opens a custom haptic keypad with live evaluation and an explicit `=` button.

## 2. The 2-Pass Operator Precedence Parser (No `eval()`)
Tokenizes the expression string using regex `(\d+(\.\d+)?|[+\-*/])`:
- **Pass 1 (Multiplication & Division)**: Resolves `*` and `/` first, handling division by zero gracefully.
- **Pass 2 (Addition & Subtraction)**: Resolves `+` and `-` sequentially from left to right.
- **Rounding**: Formats the final number to max 2 decimals.

## 3. Keypad State Machine Rules
- **Leading Zeroes**: `'0' + '5'` becomes `'5'` (avoids `'05'`).
- **Operator Swap**: Entering `'20+'` then `'×'` cleanly swaps to `'20×'` (avoids `'20+×'`).
- **Single Decimal**: Enforces max 1 decimal point per number token.
- **Max Decimals**: Enforces max 2 decimals for currency inputs.
- **Backspace & Clear**: `'⌫'` trims or resets to `'0'`. `'C'` resets completely.
- **Equals (`=`)**: Evaluates the full expression and sets balance.

## 4. Ivy Wallet Ergonomics & Dedicated Row 5
Layout: 4x4 matrix (`7,8,9,÷`, `4,5,6,×`, `1,2,3,-`, `C,0,.,+`) plus a dedicated Row 5:
- Left: `⌫` (flex: 1) for quick thumb deletions.
- Right: `= Total` (flex: 3, account theme color) showing live evaluated total (e.g. `= 460`).

---

# PART 3: Feature Deep Dive — Collapsible Quick Accounts Dropdown

> **Source**: [`src/features/dashboard/components/HomeAccountsBar.tsx`](../src/features/dashboard/components/HomeAccountsBar.tsx), [`src/app/(tabs)/index.tsx`](../src/app/(tabs)/index.tsx)

## 1. Progressive Disclosure in Mobile UI
Users opening the app primarily want to see their **Total Net Worth** and log quick expenses. Having every bank account permanently visible wastes 30px of vertical space.
- **Default (Collapsed)**: Minimalist 32px interactive pill `[ 💳 ACCOUNTS (3) ▾ ]` and `[ Manage → ]`.
- **Expanded**: Tapping smoothly reveals horizontal carousel pills (`All`, `HDFC`, `Cash`, `+ New`).

## 2. Reanimated 3 Worklet Chevron Rotation
```ts
const toggleExpand = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const next = !isExpanded;
  setIsExpanded(next);
  chevronRotation.value = withTiming(next ? 180 : 0, { duration: 220 });
};
const chevronStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${chevronRotation.value}deg` }],
}));
```
Runs on Native UI Thread for 60/120fps responsiveness.

## 3. Negative Margin Edge-to-Edge Carousel Pattern
Inside a parent with `paddingHorizontal: Spacing['5']`:
```ts
scrollView: { marginHorizontal: -Spacing['5'] },
scrollContent: { paddingHorizontal: Spacing['5'], gap: 8 },
```
Ensures the carousel pills scroll edge-to-edge across the screen without being clipped by the page container padding.

---

# PART 4: Feature Deep Dive — Budget Screen Refactoring Masterclass

> **Source Files**:
> - View Shell: [`src/app/(tabs)/budget.tsx`](../src/app/(tabs)/budget.tsx) (144 lines, strictly < 150)
> - Headless Hook: [`src/features/budget/hooks/useBudgetScreen.ts`](../src/features/budget/hooks/useBudgetScreen.ts)
> - Hero Component: [`src/features/budget/components/BudgetOverviewHero.tsx`](../src/features/budget/components/BudgetOverviewHero.tsx)
> - Segmented Tabs: [`src/features/budget/components/BudgetSegmentedTabs.tsx`](../src/features/budget/components/BudgetSegmentedTabs.tsx)
> - Limit & Calculator Modal: [`src/components/budget/AddBudgetLimitSheet.tsx`](../src/components/budget/AddBudgetLimitSheet.tsx)

---

## 1. The Mistakes in the Old Code (Ena Mistake Pannom?)

### Mistake 1: Massive 376-Line Monolithic View Shell
- **Problem**: `budget.tsx` had 376 lines containing layout, calculations, multiple modals, sheet visibility states, filter states, and styles all lumped together.
- **Why it hurt**: Breaches the clean architecture rule (`< 150 lines`). When a single file handles both layout and data transformations, debugging becomes a nightmare and testability is destroyed.

### Mistake 2: 6 Raw `useState` Calls and Array Filtering in the Render Body
- **Problem**:
  ```tsx
  // BAD: Executed on EVERY single render cycle!
  const filteredPayments = selectedCategory === 'all'
    ? payments
    : payments.filter((p) => p.category === selectedCategory);

  let filteredBreakdown = selectedCategory === 'all'
    ? spendingBreakdown
    : spendingBreakdown.filter((b) => b.category === selectedCategory);
  ```
- **Why it hurt**: Whenever a user tapped anything (or an animation ticked), array allocations, loops, and condition checks ran repeatedly in JavaScript thread execution context, triggering Garbage Collection (GC) pauses and frame drops.

### Mistake 3: Artificial `requestIdleCallback` Blank Screen Flash
- **Problem**:
  ```tsx
  // BAD: Artificially delays rendering even when Zustand / SQLite data is ready!
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const handle = requestIdleCallback(() => setIsReady(true));
    return () => cancelIdleCallback(handle);
  }, []);
  ```
- **Why it hurt**: If local Zustand data was already hydrated in memory, the screen still displayed an `ActivityIndicator` spinner for several frames, creating a visual flash and making the app feel slow and glitchy.

### Mistake 4: UX Cognitive Overload (2000px Continuous Scroll)
- **Problem**: The old screen stacked Overview Card, Capsule/Grid toggle, Category filter pills, Category list, Planned Bills timeline, and FAB in a single giant vertical scroll view.
- **Why it hurt**: The user had to scroll continuously to see if they had pending bills. Mixing categorized limits with upcoming bill timelines on a single page breaks mental hierarchy.

---

## 2. How We Fixed It (Epdi Fix Pannom?)

### Fix 1: Extraction of Headless Logic Hook (`useBudgetScreen.ts`)
We moved ALL state, filtering, and handlers into `useBudgetScreen.ts`:
- Encapsulated all 6 states (`activeTab`, `selectedCategory`, `viewMode`, `limitCategory`, `addBudgetVisible`, `addPaymentVisible`, `activePartialPayment`).
- Memoized calculations with `useMemo`:
  ```ts
  const filteredPayments = useMemo(() => {
    if (selectedCategory === 'all') return payments;
    return payments.filter((p) => p.category === selectedCategory);
  }, [payments, selectedCategory]);
  ```
- Memoized handlers with `useCallback` and native device haptic feedback (`Haptics.impactAsync`).
- Reduced `src/app/(tabs)/budget.tsx` to a declarative View Shell of **144 lines**!

### Fix 2: Elimination of Artificial Delay
We removed the `requestIdleCallback` hack completely. The screen now renders instantly using reactive Zustand state with zero dummy loading spinners.

### Fix 3: Progressive Disclosure via Segmented Tabs (`BudgetSegmentedTabs.tsx`)
Instead of an endless page, we split the experience into 2 focused views:
1. `📊 Categories ({count})`: Focus on monthly spending caps, capsule vs. grid views, and category progress bars.
2. `📅 Planned Bills ({count})`: Focus on upcoming recurring bills, partial payments, and settling payments.

Live count badges in each tab inform the user of active items before they even switch tabs!

### Fix 4: Circular 90px Progress Ring Hero (`BudgetOverviewHero.tsx`)
- Circular SVG gauge with animated stroke offset.
- Dynamic color transitions:
  - `< 85%`: Healthy green / brand primary.
  - `85% - 100%`: Amber warning state.
  - `> 100%`: Rose/red over-budget alert.
- Displays Total Spent, Total Limit, and Remaining balance in high-contrast numeric typography (`variant="numericLG"`).
- If no budget exists, provides an immediate 1-tap "Set Limit" button.

### Fix 5: Modern Ivy-Wallet Styled Limit Sheet with On-Demand Calculator (`AddBudgetLimitSheet.tsx`)
- **Category Selector Carousel**: Allows switching the target category directly within the modal.
- **Quick Increment Presets**: 1-tap pills (`+₹500`, `+₹1,000`, `+₹5,000`) for effortless adjustment.
- **On-Demand Calculator Keypad**: Users can tap "Calculator" to switch from the text input to an arithmetic keypad (`+`, `-`, `×`, `÷`, `⌫`, `=`) using our safe 2-pass parser.
- **Android Keyboard Clearance**: Wrapped in `KeyboardAvoidingSheet` to automatically lift form actions above soft keyboards.

---

## 3. Senior Developer Mental Models & Rules of Thumb

### Mental Model 1: "The View Shell is an Air Traffic Controller, Not the Engine"
> **Rule**: An `app/` screen file should only say **WHAT** is rendered, never **HOW** calculations are done.
>
> If you see `array.filter`, `array.reduce`, math operations, or `useState` inside `src/app/`, immediately extract them into `useFeatureScreen.ts`.

### Mental Model 2: "Progressive Disclosure Over Infinite Scrolling"
> **Rule**: Mobile screens have limited vertical real estate. Stacking 5 different types of information creates cognitive fatigue.
>
> Partition related features using **Segmented Tabs** or **Collapsible Drawers**. Show high-priority overviews first, and let the user drill into specific sub-domains.

### Mental Model 3: "Never Throttle Hydrated Local State"
> **Rule**: If data is already local (Zustand / SQLite / MMKV), do not wrap rendering in timers or `requestIdleCallback`.
>
> Present the UI immediately. Skeletons and spinners should ONLY be used when an asynchronous network/database fetch is genuinely in-flight.

### Mental Model 4: "Financial Inputs Must Minimize Typing"
> **Rule**: Typing numeric amounts on mobile keyboards is error-prone and tedious.
>
> Always offer **Quick Preset Chips** (`+500`, `+1000`) and an **On-Demand Calculator** so users can compute totals without jumping out to an external calculator app.

