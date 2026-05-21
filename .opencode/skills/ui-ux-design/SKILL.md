---
name: ui-ux-design
description:
  Apply UI/UX design principles, accessibility standards, and component patterns
  for the Salt Premium Stock Management system. Use when designing interfaces,
  reviewing UI code, creating design systems, or implementing responsive layouts
  with Tailwind CSS.
---

# 🎨 UI/UX Design Skill

Comprehensive guide for designing user interfaces and experiences following industry best practices, accessibility standards, and modern design patterns — with specific guidelines for the Salt Premium aesthetic used in the Stock Management module.

## 🎯 When to Use This Skill

- Designing new UI components or pages for Stock Management
- Reviewing existing UI code for usability issues
- Creating or maintaining design systems
- Implementing responsive layouts with Tailwind CSS
- Ensuring accessibility compliance (WCAG)
- Optimizing UI performance
- Conducting user research planning
- Choosing appropriate UI frameworks and patterns
- Implementing Salt Premium "tactile" interactions

---

## 🧂 Salt Premium Design System

Project-specific design system for the Stock Management module featuring a tactile, high-energy, mobile-first aesthetic.

### Design Philosophy

| Principle                      | Description                                   | Implementation                             |
| ------------------------------ | --------------------------------------------- | ------------------------------------------ |
| **Tactile First**              | Elements should feel like they can be pressed | Use `active:scale-95` on buttons and cards |
| **High Contrast, High Energy** | Deep blacks with vibrant accents              | `font-black` text with primary color pops  |
| **Whitespace as a Feature**    | Don't crowd the screen                        | Large padding (`p-6`, `p-8`) and wide gaps |
| **Glassmorphism Lite**         | Subtle transparency for context               | `backdrop-blur-md` and `bg-background/80`  |

### Core Layout Patterns

#### The Hub (Management Overview)

Used for dashboards and "choice" screens.

- **Hero Banner**: Large, rounded container (`rounded-[2.5rem]`) with gradient background (`from-primary to-primary/80`). Contains primary "Day Goal" or status.
- **Stats Grid**: Bento-box style cards with subtle background tints (`bg-primary/5`) and no borders.
- **Selection List**: Large interactive cards (`p-5`, `rounded-[2rem]`) with clear icons and "done" states in emerald green.

```jsx
<div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground">
  <h1 className="text-3xl font-black tracking-tight">Day Goal: 85%</h1>
  <p className="opacity-80">Target: 500 units</p>
</div>
```

#### Action Mode (Task Focused)

Used for data entry (like Stock Distribution).

- **Sticky Status Header**: Keeps essential context (Outlet Name, Date) visible at all times.
- **Floating Action Footer**: Sticky button at the bottom with `bg-gradient-to-t` overlay for readability.
- **Search Integration**: Prominent, rounded search bars (`rounded-2xl`) to reduce friction.

```jsx
<div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4">
  <Button className="w-full rounded-full active:scale-95 transition-transform">
    Save Distribution
  </Button>
</div>
```

### Visual Primitives

#### Colors & Gradients

| Type            | Utility Class                                                 | Usage                               |
| --------------- | ------------------------------------------------------------- | ----------------------------------- |
| **Primary**     | `bg-primary`, `text-primary`                                  | Main actions, branding              |
| **Success**     | `bg-emerald-500`, `text-emerald-600`                          | Completed status, confirmed actions |
| **Accent Hint** | `bg-primary/5`                                                | Card backgrounds, hover states      |
| **Gradient**    | `bg-gradient-to-br from-primary via-primary/90 to-primary/80` | Performance banners                 |

#### Border Radii

| Radius            | Value              | Usage                       |
| ----------------- | ------------------ | --------------------------- |
| **Super Rounded** | `rounded-[2.5rem]` | Banners, special containers |
| **Standard Card** | `rounded-[2rem]`   | Main interactive items      |
| **Control/Input** | `rounded-2xl`      | Search bars, smaller cards  |
| **Interactive**   | `rounded-full`     | Buttons, counters           |

#### Typography

```css
text-3xl font-black tracking-tight
tracking-[0.2em] font-black uppercase
text-[10px] font-black uppercase opacity-60 tracking-widest
tabular-nums
```

### Components

#### The Stock Counter (Interactive Entry)

```jsx
<div className="flex items-center gap-3">
  <Button
    variant="outline"
    size="icon"
    className="rounded-full active:scale-95 transition-transform"
  >
    <Minus className="h-4 w-4" />
  </Button>
  <div className="relative">
    <Input
      className="text-center font-bold tabular-nums w-20 rounded-2xl"
      value={quantity}
    />
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-60">
      unit
    </span>
  </div>
  <Button
    variant="outline"
    size="icon"
    className="rounded-full active:scale-95 transition-transform"
  >
    <Plus className="h-4 w-4" />
  </Button>
</div>
```

#### Value Badges

```jsx
<Badge variant="outline" className="bg-primary/5 border-primary/20">
  {value}
</Badge>
```

### Micro-Interactions

#### Entrance Animation

```jsx
<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
  {/* Content */}
</div>
```

#### Button Feedback

```css
.btn-interactive {
  @apply active:scale-95 transition-all duration-150;
}
.btn-elevate {
  @apply hover:shadow-lg hover:-translate-y-0.5 transition-all;
}
```

---

## 📐 Core UI/UX Principles

### 1. Visual Hierarchy

```
Priority Levels:
├── Primary (H1, main CTA, key metrics) - Highest contrast, largest size
├── Secondary (H2, secondary actions) - Medium contrast
├── Tertiary (H3, supporting text) - Lower contrast
└── Quaternary (metadata, captions) - Lowest contrast
```

### 2. Consistency

| Aspect     | Guideline                             |
| ---------- | ------------------------------------- |
| Spacing    | Use 4px or 8px grid system            |
| Typography | Limit to 2-3 font families, 5-7 sizes |
| Colors     | Define semantic color tokens          |
| Components | Reuse patterns, don't reinvent        |

### 3. Feedback & Responsiveness

```javascript
const states = {
  default: "Base appearance",
  hover: "Cursor change + subtle elevation/color shift",
  focus: "Visible outline (2-3px) for keyboard users",
  active: "Pressed/depressed appearance",
  disabled: "Reduced opacity + no pointer events",
  loading: "Spinner/skeleton + disabled state",
};
```

---

## ♿ Accessibility Guidelines (WCAG 2.1 AA)

| Requirement          | Implementation                                    |
| -------------------- | ------------------------------------------------- |
| Text Alternatives    | `alt` text for images, `aria-label` for icons     |
| Color Contrast       | Minimum 4.5:1 for normal text, 3:1 for large text |
| Keyboard Access      | All functionality via keyboard                    |
| Focus Visible        | Never remove outline without replacement          |
| Skip Links           | Provide "Skip to main content" link               |
| Error Identification | Clearly describe form errors                      |

### Quick Checklist

```markdown
- [ ] All images have alt text
- [ ] Color contrast meets 4.5:1 minimum
- [ ] Focus states visible on all interactive elements
- [ ] Form labels associated with inputs
- [ ] Error messages linked to inputs
- [ ] Skip navigation link present
- [ ] Page has proper heading hierarchy
- [ ] Interactive elements accessible via keyboard
```

---

## 📱 Responsive Design

### Breakpoints

```css
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

### Touch Targets

Minimum: 44x44 pixels. Spacing between targets: 8px minimum.

Primary actions: Bottom 1/3 of screen.

---

## 🎨 Design System Tokens

### Color System

```json
{
  "colors": {
    "semantic": {
      "success": "#22c55e",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    }
  }
}
```

### Typography Scale

```css
:root {
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
}
```

### Spacing Scale

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
}
```

---

## ⚡ Performance Optimization

```javascript
const performanceBudget = {
  firstContentfulPaint: "< 1.5s",
  largestContentfulPaint: "< 2.5s",
  timeToInteractive: "< 3.5s",
  cumulativeLayoutShift: "< 0.1",
  totalPageSize: "< 500KB",
};
```

### CSS Optimization

```css
<style>/* Above-the-fold styles */</style>
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
.component {
  contain: layout style paint;
}
.animated {
  will-change: transform, opacity;
}
```

---

## 🖱 Animation Guidelines

```css
:root {
  --ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
  --ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
}
/* Instant: 0-100ms | Fast: 100-300ms | Normal: 300-500ms | Slow: 500ms+ */
```

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🛠 Tools & Resources

- **Accessibility**: axe DevTools, WAVE, Stark
- **Performance**: Lighthouse, WebPageTest, Chrome DevTools
- **Design**: Figma, Penpot
- **Testing**: BrowserStack, Responsively
