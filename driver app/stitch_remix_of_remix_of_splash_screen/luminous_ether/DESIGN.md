# Design System Strategy: The Luminous Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Ethereal Curator."** We are moving away from the rigid, boxed-in constraints of traditional SaaS dashboards toward a high-end editorial experience. This system should feel like a digital boutique—spacious, calm, and intellectually sophisticated. 

By utilizing the updated, muted lavender (`primary: #6c5681` derived from the #C0A6D6 palette), we evoke a sense of "quiet luxury." We break the "template" look through **Intentional Asymmetry**: hero elements should overlap container boundaries, and typography should utilize dramatic scale shifts to create a rhythmic, melodic reading experience.

## 2. Colors & Tonal Depth
The palette is rooted in a soft, atmospheric violet. It is designed to be felt rather than seen.

*   **Primary (#6c5681):** Used for high-intent actions and brand moments.
*   **Surface & Background (#fff7fd):** A warm, tinted white that prevents the clinical "bleached" look of standard hex-white.
*   **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a soft, natural edge.
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of fine paper. 
    *   *Level 1:* `surface` (The Base)
    *   *Level 2:* `surface-container-low` (Secondary sections)
    *   *Level 3:* `surface-container-highest` (Floating cards or interactive modals)
*   **The Glass & Gradient Rule:** For main CTAs or Hero backgrounds, use a subtle linear gradient transitioning from `primary` to `primary-container`. For floating navigation or headers, use **Glassmorphism**: `surface` at 70% opacity with a `20px` backdrop-blur.

## 3. Typography
Our typography pairing balances the structural precision of **Manrope** with the literary elegance of **Newsreader**.

*   **The Display Scale (Newsreader):** Use `display-lg` (3.5rem) and `display-md` (2.75rem) with generous tracking. These are not just titles; they are "statements." Use them to break the grid, often overlapping image containers or bleeding into margins.
*   **The Headline Scale (Newsreader):** `headline-lg` through `headline-sm` provide a serif warmth that guides the user through the narrative of the page.
*   **The Functional Scale (Manrope):** `body-lg` (1rem) and `title-md` (1.125rem) handle the heavy lifting. Manrope’s geometric clarity ensures readability against the softer lavender backgrounds.
*   **Visual Hierarchy:** Always maintain a minimum 2:1 ratio between headline and body text to ensure the editorial "punch" is never lost.

## 4. Elevation & Depth
In this system, depth is a result of light and shadow, not lines and boxes.

*   **Tonal Layering:** Stacking is our primary tool. Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
*   **Ambient Shadows:** When a "floating" effect is required (e.g., a dropdown), use extra-diffused shadows: `box-shadow: 0 12px 40px rgba(108, 86, 129, 0.08)`. Note the tint—never use pure black for shadows; always use a desaturated version of your `on-surface` color.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` at 15% opacity. It should be felt as a whisper, not a scream.
*   **Roundedness:** We use a "Soft-Hard" contrast. Elements use `md` (0.375rem) for a modern, architectural feel, while "Full" (9999px) is reserved exclusively for pills and selection chips to create organic flow.

## 5. Components

### Buttons
*   **Primary:** A gradient fill from `primary` to `primary-dim`. Typography: `label-md` (Manrope) in all-caps with 0.05em letter spacing.
*   **Secondary:** No fill. A "Ghost Border" (15% opacity `outline`) with `on-surface` text.
*   **Tertiary:** Pure text with a 2px underline in `primary-fixed-dim`, offset by 4px.

### Input Fields
*   **Text Inputs:** No bottom line or full border. Use `surface-container-low` as a subtle background fill. The label (Manrope `label-sm`) sits 8px above the field. On focus, the background shifts to `surface-container-high`.

### Cards & Lists
*   **Forbid Dividers:** Never use a horizontal rule to separate list items. Use the spacing scale (`spacing-4` or `1.4rem`) to create "Active Negative Space."
*   **The "Editorial Card":** Large imagery with a `display-sm` title overlapping the top-left corner of the image by `spacing-2`.

### Additional Components: The "Aura" Loader
*   Instead of a spinning circle, use a pulsing radial gradient of `primary_container` that expands and fades, mimicking a breathing rhythm.

## 6. Do’s and Don'ts

### Do:
*   **Do** use asymmetrical margins. A container that is `spacing-12` from the left but `spacing-24` from the right creates an editorial, "un-templated" feel.
*   **Do** lean into the lavender. Use `primary-container` for large background washes to soften the user's eye.
*   **Do** use `Newsreader` for any text that is meant to be "read" rather than "scanned."

### Don't:
*   **Don't** use 1px solid borders (`#CCCCCC` or similar). It kills the ethereal aesthetic immediately.
*   **Don't** use pure black `#000000`. Use `on-surface` (#363039) for all "black" text to maintain the violet-tinted harmony.
*   **Don't** crowd the layout. If you think there is enough white space, add `spacing-4` more.