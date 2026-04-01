# Design System Specification: The Ethereal Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Luminous Layer."** 

This is not a standard utility-first framework; it is a high-end editorial experience designed to feel like a digital gallery. We move away from the "boxed-in" nature of traditional web design by embracing a soft, breathable aesthetic. The goal is to create depth through tonal shifts rather than structural lines, using intentional asymmetry and generous whitespace to guide the user’s eye. 

The system prioritizes a "Soft Minimalism" that feels expensive and custom. We achieve this by layering white surfaces over a light lavender foundation, creating a "frosted glass" effect that feels light to the touch but authoritative in its execution.

## 2. Colors & Surface Logic

This system relies on a sophisticated palette of purples and violets, balanced by high-contrast typography.

### Core Palette
*   **Surface (Background):** `#F5F0FF` (Light Lavender) — The canvas for all content.
*   **Primary (CTA/Action):** `#7C3AED` (Deep Purple-Violet) — To be used for high-impact interactions.
*   **Secondary (Accent):** `#A78BFA` (Medium Lavender) — Used for supportive interactive elements.
*   **Neutral (Text):** `#1E1B2E` (Deep Indigo-Black) — Provides the editorial weight.
*   **Subtext:** `#6B7280` — For metadata and secondary information.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections or containers. 
In this design system, boundaries are defined exclusively through:
1.  **Background Color Shifts:** Placing a `surface_container_lowest` (#FFFFFF) card on a `surface` (#F5F0FF) background.
2.  **Tonal Transitions:** Moving from `surface` to `surface_container_low` to denote a change in content context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy for depth:
*   **Level 0 (Base):** `surface` (#F5F0FF) - The furthest layer back.
*   **Level 1 (Sections):** `surface_container_low` (#F6F1FF) - Sub-sections within a page.
*   **Level 2 (Active Elements):** `surface_container_lowest` (#FFFFFF) - Cards and input fields that "pop" forward.

### The "Glass & Gradient" Rule
To elevate the experience beyond flat design, use **Glassmorphism** for floating elements (navbars, modals). Apply a backdrop-blur (12px-20px) to semi-transparent surface colors. For Primary CTAs, use a subtle linear gradient from `primary` (#7C3AED) to `primary_container` (#630ED4) at a 135-degree angle to add visual "soul."

## 3. Typography: Editorial Authority

We use **Inter** to bridge the gap between technical precision and editorial elegance.

*   **Display (lg/md/sm):** Used for hero sections. These should be set with a slight negative letter-spacing (-0.02em) to feel tighter and more premium.
*   **Headlines:** The "voice" of the brand. Use `headline-lg` (2rem) for major content buckets.
*   **Body (lg/md):** Primary reading weight. Ensure a line height of at least 1.6 for maximum readability and "breathability."
*   **Labels:** Use `label-md` (0.75rem) in uppercase with +0.05em letter spacing for metadata and chips to provide an "archival" feel.

The hierarchy is designed to allow large "Display" type to dominate the page, creating a high-contrast relationship with the "Body" text, mimicking a luxury fashion magazine.

## 4. Elevation & Depth: Tonal Layering

We reject traditional drop shadows in favor of **Ambient Shadows** and **Tonal Nesting.**

*   **The Layering Principle:** Place a white card (`#FFFFFF`) on the lavender background (`#F5F0FF`) to create a natural "lift." The color contrast itself provides the elevation.
*   **Signature Shadows:** When a card requires a floating effect, use the "Soft Lavender Shadow": `rgba(124,58,237,0.08)` with a Blur of 32px and a Y-offset of 16px. Avoid dark grey shadows; they "muddy" the lavender aesthetic.
*   **The "Ghost Border" Fallback:** If a border is essential for accessibility (e.g., in high-density data), use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
*   **Nesting Depth:** An inner container should always be one level "lighter" or "darker" than its parent, never the same color.

## 5. Components

### Buttons
*   **Primary:** 12px (`md`) radius. Gradient fill (`primary` to `primary_container`). White text. No border.
*   **Secondary:** 12px radius. `surface_container_highest` background with `primary` text.
*   **Interaction:** On hover, the primary button should shift 2px upward with a slightly intensified lavender shadow.

### Cards & Inputs
*   **Base:** White (#FFFFFF), 16px (`lg`) radius. 
*   **Shadow:** `rgba(124,58,237,0.08)`.
*   **Inputs:** Use a "Glass" approach for inactive states—subtle `outline_variant` (20%) with a white background. On focus, transition to a `primary` ghost border (2px).

### Lists & Layouts
*   **Forbid Dividers:** Do not use horizontal lines to separate list items. Use the **Spacing Scale** (Value 6 / 1.5rem) to create separation through whitespace.
*   **Selection Chips:** 9999px (`full`) radius. Use `secondary_container` for the background and `on_secondary_container` for the text.

### Floating Action Elements
*   Use a backdrop-blur (16px) on a `surface_container_lowest` background with 80% opacity to create a "frosted lavender" navigation bar that stays pinned to the top.

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts where text blocks are offset from images to create an editorial feel.
*   **Do** use the Lavender shadow for all elevated elements; it maintains the "soft" brand vibe.
*   **Do** allow for "Dead Space." Whitespace is a luxury—use it generously.
*   **Do** use `primary_fixed_dim` for subtle hover states on purple elements.

### Don't:
*   **Don't** use 100% black (#000000) for text. Use `on_background` (#1C1A25).
*   **Don't** use "Drop Shadows" that are grey or high-opacity.
*   **Don't** use hard 1px borders for card containment.
*   **Don't** crowd the corners. With a 16px corner radius, internal padding should be at least 24px (Value 6) or 32px (Value 8).