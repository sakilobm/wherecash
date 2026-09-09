# WhereCash Developer Documentation & Learning Hub

Welcome to the **WhereCash / MoneyApp** developer knowledge repository. This directory houses architectural guides, system blueprints, and developer tutorials designed to elevate any engineer working on this codebase into a domain expert.

---

## 📚 Document Directory

### 🧮 Feature & Architecture Deep Dives
| Guide | Topics Covered | Key Source Files |
| :--- | :--- | :--- |
| [**Calculator Feature Guide**](./features/calculator-feature-guide.md) | Safe arithmetic parser without `eval()`, 2-pass operator precedence, state machine, React Native keypad ergonomics, and Android layout edge cases. | `src/utils/calculator.ts`<br>`src/components/accounts/AccountFormSheet.tsx` |

---

## 🧭 Developer Standards
1. **Zero-Side-Effect Logic**: All domain logic and arithmetic operations must reside in pure utility functions inside `src/utils/` or headless custom hooks inside `src/features/[feature]/hooks/`.
2. **Strict UI Isolation**: Presentation shell components must not perform raw mathematical parsing or direct state mutations.
3. **Cross-Platform Parity**: Always consider Android modal window constraints (such as `useKeyboardHeight`) and Android font metrics (`includeFontPadding`, `lineHeight`).
