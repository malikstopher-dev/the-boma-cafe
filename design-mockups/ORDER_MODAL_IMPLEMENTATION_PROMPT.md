# ORDER MODAL REDESIGN — IMPLEMENTATION PROMPT

> **Scope:** Frontend only. Do NOT touch any API routes, database schema, backend logic, middleware, or server-side code. Do NOT modify any files outside `src/components/ui/CartButton.tsx` and `src/components/ui/CartButton.module.css`.

---

## Goal

Transform the current single-column scrolling order modal into a **three-column no-scroll modal on desktop** and a **compact single-column modal on mobile**. All content must fit on one screen without scrolling on desktop (≥992px viewport).

## Files to Modify

| File | Action |
|------|--------|
| `src/components/ui/CartButton.tsx` | Restructure JSX into 3-column grid |
| `src/components/ui/CartButton.module.css` | Add desktop 3-column layout, keep mobile as-is |

**DO NOT touch:** `src/app/`, `src/lib/`, `src/api/`, `src/inventory/`, `src/middleware.ts`, `next.config.js`, `package.json`, or any other file.

---

## Business Rules (unchanged — just enforcing existing behavior)

| Order Type | Table Number | Delivery Address | Waiter |
|------------|-------------|-----------------|--------|
| **Pickup** | ❌ Not shown | ❌ Not shown | ❌ Not assigned |
| **Delivery** | ❌ Not shown | ✅ Required | ❌ Not assigned |
| **Dine-in** | ✅ Required | ❌ Not shown | ❌ Not assigned (admin assigns later) |

Table assignment is **only for dine-in**. Waiter assignment is handled by admin after the order is placed — the modal does NOT ask for a waiter.

## Desktop Layout (≥992px viewport)

Three horizontal columns inside the modal. All content visible at once — **no scrolling**.

```
┌─────────────────────────────────────────────────────────────────┐
│  🛒 Your Order                                            ✕   │
├───────────────────────┬───────────────────────┬─────────────────┤
│                       │                       │                 │
│  Column 1: Items      │  Column 2: Details    │  Column 3: Pay  │
│                       │                       │                 │
│  Your Order           │  👤 Your Details      │  Total          │
│                       │                       │                 │
│  ┌─────────────────┐  │  Name: stopher        │     R250        │
│  │ − 1 +  Marg  R90│  │  Phone: 099999999     │                 │
│  └─────────────────┘  │                       │  Order Method   │
│                       │  How to receive?      │                 │
│  ┌─────────────────┐  │  [Pickup][Delivery]   │  [WhatsApp]     │
│  │ − 2 + Wing R160│  │      [Dine-In]        │                 │
│  └─────────────────┘  │                       │  [Online Order] │
│                       │  Address: 127b Wrox.. │                 │
│  ⚠️ Warning about     │  Time: 7:30 PM        │                 │
│  alcohol dine-in      │  Notes: optional       │                 │
│                       │                       │                 │
├───────────────────────┴───────────────────────┴─────────────────┤
```

### CSS for desktop

```css
@media (min-width: 992px) {
  .modal {
    max-width: 960px;
    max-height: 85vh;
    border-radius: 20px;
    padding: 0;
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    min-height: 0;
  }

  .col {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;  /* critical — no scroll */
  }

  .col-left  { border-right: 1px solid var(--cream); }
  .col-mid   { border-right: 1px solid var(--cream); }
  .col-right { justify-content: space-between; }

  /* Remove the itemsList overflow-y on desktop */
  .itemsList {
    max-height: none;
    overflow-y: visible;
  }
}
```

## Mobile Layout (<992px viewport)

Single column, compact. Stack order: Items → Details → Total → Actions. Keep the existing mobile styling (bottom sheet with rounded top corners, full-width inputs, touch-friendly buttons).

```
┌───────────────────────┐
│ 🛒 Your Order      ✕ │
├───────────────────────┤
│ − 1 + Margarita   R90│
│ − 2 + Wings      R160│
│                       │
│ ⚠️ Alcohol warning    │
│                       │
│ 👤 Your Details       │
│ [stopher          ]   │
│ [099999999        ]   │
│ [Pickup][Delivery]...│
│ [127b Wroxham Rd   ]  │
│ [7:30 PM            ] │
│ [Additional notes   ] │
│                       │
│ Total:           R250 │
│ [💬 WhatsApp        ] │
│ [🌐 Online Order    ] │
└───────────────────────┘
```

## JSX Structure

Restructure the `{/* Cart Items */}` through `{/* Order method selection */}` section into this hierarchy:

```tsx
{/* Desktop: 3-column grid. Mobile: stacked flex. */}
<div className={styles.columns}>

  {/* Column 1: Order Items */}
  <div className={`${styles.col} ${styles.colLeft}`}>
    <div className={styles.colTitle}>🛒 Your Order</div>
    <div className={styles.itemsList}>
      {/* existing item map */}
    </div>
    {fieldErrors.items && (
      <p className={styles.errorBanner}>{fieldErrors.items}</p>
    )}
  </div>

  {/* Column 2: Customer Details & Order Type */}
  <div className={`${styles.col} ${styles.colMid}`}>
    <div className={styles.colTitle}>👤 Your Details</div>
    {/* Name input */}
    {/* Phone input */}
    <div className={styles.fieldLabel}>How would you like to receive it?</div>
    <div className={styles.toggleRow}>
      {/* Pickup / Delivery / Dine-In buttons */}
    </div>
    {orderType === 'delivery' && <input delivery address />}
    {orderType === 'dine-in' && <input table number />}
    <input requested time />
    <input additional notes />
  </div>

  {/* Column 3: Total & Order Actions */}
  <div className={`${styles.col} ${styles.colRight}`}>
    <div className={styles.totalDisplay}>
      <span className={styles.totalLabel}>Total</span>
      <span className={styles.totalAmount}>R{total}</span>
    </div>
    <div>
      <p className={styles.orderMethodLabel}>Order Method</p>
      <button className={styles.btnWhatsApp}>💬 Order via WhatsApp</button>
      <button className={styles.btnOnline}>🌐 Place Online Order</button>
    </div>
  </div>

</div>
```

## CSS Module Changes

### New classes to add to `CartButton.module.css`

```css
/* ── Three-column layout ────────────────────── */
.columns {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  box-sizing: border-box;
}

.col {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.colLeft {
  border-bottom: 1px solid var(--cream);
}

.colMid {
  border-bottom: 1px solid var(--cream);
}

.colRight {
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
}

.colTitle {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--dark-brown);
  margin-bottom: 4px;
}

.fieldLabel {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-light);
  margin-top: 4px;
}

/* ── Desktop overrides ──────────────────────── */
@media (min-width: 992px) {
  .modal {
    max-width: 960px;
    max-height: 85vh;
    border-radius: 20px;
    padding: 0;
    overflow: hidden;
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    min-height: 0;
  }

  .col {
    padding: 18px 22px;
    overflow: hidden;
  }

  .colLeft {
    border-right: 1px solid var(--cream);
    border-bottom: none;
  }

  .colMid {
    border-right: 1px solid var(--cream);
    border-bottom: none;
  }

  .colRight {
    justify-content: space-between;
    padding: 18px 22px;
  }

  .itemsList {
    max-height: none;
    overflow-y: visible;
  }
}

/* ── Total display (centered in col3) ──────── */
.totalDisplay {
  text-align: center;
  width: 100%;
}

.totalDisplay .totalLabel {
  font-size: 0.85rem;
  color: var(--text-light);
  font-weight: 500;
  display: block;
}

.totalDisplay .totalAmount {
  font-size: 2rem;
  font-weight: 700;
  color: var(--dark-brown);
}

.orderMethodLabel {
  font-size: 0.8rem;
  color: var(--text-light);
  text-align: center;
  font-weight: 500;
}

.btnWhatsApp {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #25D366, #128C7E);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
}

.btnOnline {
  width: 100%;
  padding: 14px;
  background: var(--white);
  border: 2px solid var(--beige-dark);
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--dark-brown);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
}
```

### Existing classes to keep (unchanged)

All existing `.input`, `.toggleBtn`, `.toggleBtnActive`, `.qtyBtn`, `.qtyValue`, `.itemRow`, `.itemName`, `.itemPrice`, `.deleteBtn` classes stay **exactly as they are**. They work for both desktop and mobile.

### Mobile fallback

The default (non-media-query) styles stay as they are — single-column stack. The `@media (min-width: 992px)` block switches to the 3-column grid.

## Critical Constraints

1. **No scrolling on desktop.** The `max-height: 85vh` on the modal and `overflow: hidden` on columns ensure content fits. If you have more than ~5 items, the items column should scroll internally (set `overflow-y: auto` on `.colLeft` only, not the whole modal).

2. **Mobile is compact.** Below 992px, keep the existing bottom-sheet behavior (single column, stacked vertically). The mobile layout is the current layout — no changes needed for mobile.

3. **No new components.** Do not create new React components. Just restructure the existing JSX in `CartButton.tsx`.

4. **No new dependencies.** Do not install any packages.

5. **Preserve all existing functionality:**
   - Cart item quantity controls (increase/decrease/remove)
   - Form validation (name, phone, table, address)
   - WhatsApp order submission
   - Online order submission
   - Order success display
   - Alcohol pickup/delivery warning
   - Validation modal popup
   - Order type toggle (pickup/delivery/dine-in)

6. **Table number input only shows for dine-in** (this is already the case — keep it).

7. **Delivery address input only shows for delivery** (this is already the case — keep it).

8. **Remove the "Requested time" and "Additional notes" labels** from the header area — they should be plain input fields with placeholder text, matching the current design.

## Visual Spec

- **Modal background:** `#fff`
- **Column dividers:** `1px solid var(--cream)` (the site's existing CSS variable)
- **Total font size:** `2rem` desktop, `1.5rem` mobile
- **WhatsApp button:** gradient `#25D366 → #128C7E`
- **Online button:** white bg, `2px solid var(--beige-dark)`
- **Header:** `🛒 Your Order` on left, `✕` close button on right
- **Close button** stays in the header (one close button, not three)

## Testing Checklist

After implementation, verify:

- [ ] Desktop (1200px+): 3 columns visible, no scrolling required
- [ ] Desktop: all inputs are interactive and responsive
- [ ] Desktop: warning banner fits in column 1
- [ ] Tablet (768px–991px): falls back to single column (mobile layout)
- [ ] Mobile (375px): single column, all fields accessible, buttons at bottom
- [ ] Dine-in toggle: table number input appears
- [ ] Delivery toggle: delivery address input appears
- [ ] Pickup toggle: neither table nor address shown
- [ ] Alcohol warning appears when bar items in cart + pickup/delivery selected
- [ ] Form validation still works (empty name, bad phone, missing table/address)
- [ ] WhatsApp order still opens WhatsApp with correct message
- [ ] Online order still submits to API and shows success
- [ ] Cart empty state still shows
- [ ] Order success state still shows

## Background: What is "Background Worker"?

The "background worker" mentioned in the project docs is a **standalone Node.js process** (separate from the Next.js web app) that handles long-running tasks like:
- Generating PDF quotations for bookings
- Sending confirmation emails via Resend

It's defined in `src/jobs/` and runs as `node dist/jobs/index.js`. The web app queues jobs into a `background_jobs` database table, and the worker picks them up asynchronously.

**It is NOT related to the order modal.** Orders are created synchronously by the web app and do NOT go through the background worker. The worker is only for booking quotation PDFs and emails. The worker not being deployed means booking customers don't receive PDFs/emails — it does NOT affect food orders.

---

*End of implementation prompt*
