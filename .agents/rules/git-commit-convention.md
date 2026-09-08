# Git Commit Message Convention

Always follow the user's custom git commit message convention strictly. Do NOT use conventional commits like `feat: ...`, `fix: ...`, `chore: ...`.

## Format Rule
`[Category] : [Location / Module] -> [What Changes Were Made]`

## Rules:
1. **Category**: Use `New` for new features, `Major` for major changes, `Minor` for minor changes, `Minor UI` / `Major UI` for UI-specific changes.
2. **Title Case**: Capitalize the first letter of each word in the message.
3. **Module / Location**: Clearly state the component, page, or module being changed (e.g. `Admin`, `Navbar`, `Invoice`, `Mailer`, `Invoices Table`).
4. **Separator**: Always use `->` to separate the module from the description of changes.

## Examples:
- `New : Admin -> Quotation Creator & Live Preview Modal Added`
- `Major : Admin -> Document Status & Email Dispatch Engine Improved`
- `Minor UI : Navbar -> Modern Animated Burger Menu & Mobile Responsive Layout Polished`
- `Minor : Mailer -> SMTP Config Architecture Updated`
