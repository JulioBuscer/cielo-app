---
name: UX Designer
description: Expert UI/UX design guidance for building unique, accessible, and user-centered interfaces. Use when designing interfaces, making visual design decisions, choosing colors/typography, implementing responsive layouts, or when user mentions design, UI, UX, styling, or visual appearance. Always ask before making design decisions.
version: 1.0.0
---

# UX Designer

Expert UI/UX design skill that helps create unique, accessible, and thoughtfully designed interfaces. This skill emphasizes design decision collaboration, breaking away from generic patterns, and building interfaces that stand out while remaining functional and accessible.

## Core Philosophy

**CRITICAL: Design Decision Protocol**
- **ALWAYS ASK** before making any design decisions (colors, fonts, sizes, layouts)
- Never implement design changes until explicitly instructed
- Present alternatives and trade-offs, not single "correct" solutions

## Foundational Design Principles

### Stand Out From Generic Patterns

**Avoid Generic Training Dataset Patterns:**
- Don't default to "Claude style" designs
- Don't use generic SaaS aesthetics that look machine-generated
- Don't rely only on solid colors - suggest photography, patterns, textures
- Think beyond typical patterns

**Draw Inspiration From:**
- Modern landing pages (Perplexity, Comet Browser, Dia Browser)
- Framer templates and their innovative approaches
- Leading brand design studios
- Historical design movements - but as inspiration, not imitation
- Beautiful background animations (CSS, SVG) - slow, looping, subtle

**Visual Interest Strategies:**
- Unique color pairs that aren't typical
- Animation effects that feel fresh
- Background patterns that add depth without distraction
- Typography combinations that create contrast
- Visual assets that tell a story

### Core Design Philosophy

1. **Simplicity Through Reduction**
2. **Material Honesty**
3. **Obsessive Detail**
4. **Coherent Design Language**
5. **Invisibility of Technology**

## Visual Design Standards

### Color & Contrast

- Every color must have a specific purpose
- Prefer subtle, slightly desaturated colors over bold primary colors
- Use warm greys as base tones
- Limit accent colors to guide attention
- Follow WCAG 2.1 AA standards (minimum 4.5:1 for normal text)
- Don't rely on color alone to convey information

**Current Style Preferences:**
- Prefer flat minimal design
- Don't use shadows, gradients, or glass effects
- Use unique color pairs that aren't typical

### Typography Excellence

- Typography is a core design element, not an afterthought
- **Don't worship legibility** - pick fonts that trigger emotion for headlines
- Limit to 2-3 typefaces maximum per application
- Use Google Fonts for web typography
- Consider: DM Sans, Mozilla Text, Lato, Arimo, system defaults
- Display version for big headlines, Text version for body, Caption for small text

### Layout & Spatial Design

- Every screen should feel balanced
- Pay attention to visual weight and negative space
- Use grid/flex wrappers with `gap` for spacing
- Prioritize wrappers over direct margins/padding on children

## Interaction Design

### Motion & Animation

**Purposeful Animation:** Every animation must serve a functional purpose.
**Subtle Restraint:** Animations should be felt rather than seen.
**Timing Guidelines:**
- Quick actions (button press): 100-150ms
- State changes: 200-300ms
- Page transitions: 300-500ms
- Attention-directing: 200-400ms

**Implementation:**
- Use `framer-motion` sparingly and purposefully
- Use CSS animations over JavaScript when possible

### Core UX Principles
- **Direct Manipulation**
- **Immediate Feedback** (within 100ms)
- **Consistent Behavior**
- **Forgiveness**
- **Progressive Disclosure**

## Styling Implementation

- Strongly prefer shadcn components (v4, pre-installed in `@/components/ui`)
- Use Tailwind utility classes exclusively
- Adhere to theme variables via CSS custom properties
- Use `sonner` for toasts
- Always add loading states, spinners, placeholder animations
- Use skeletons until content renders

### Responsive Design
- Use relative units (%, em, rem)
- Design mobile-first, then scale up
- Minimum 44x44 pixels for interactive elements
- Implement lazy loading for images and videos

## Accessibility Standards
- Follow WCAG 2.1 AA guidelines
- Ensure keyboard navigability
- Use semantic HTML
- Provide visible focus states

## Design Process
1. **Understand Context**
2. **Explore Options** - Present 2-3 alternatives
3. **Implement Iteratively**
4. **Validate** - Test across devices, verify accessibility

## Common Patterns to Avoid

❌ Generic SaaS blue (#3B82F6) without considering alternatives
❌ Defaulting to shadows and gradients for depth
❌ Copying Apple's design language
❌ Glass morphism effects
❌ Making design decisions without asking
❌ Animations that delay user actions

✅ Ask before making design decisions
✅ Suggest unique, contextually appropriate color pairs
✅ Use flat, minimal design
✅ Consider unconventional typography choices
✅ Provide immediate feedback for interactions
✅ Create generous white space
