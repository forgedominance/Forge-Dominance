# Forge Dominance — Full Site Architecture (Updated 2026-06-12)

## Changes Since v1

- **New file:** `assets/js/sticky-contact.js` (52 lines) — standalone sticky contact widget injector for pages that don't load main.js/info-pages.js
- **New file:** `assets/js/collection.js` (865 lines) — extracted collection/PLP page logic (was previously inline `<script>` in collection.html)
- **New directory:** `assets/images/flags/` — 12 SVG country flag icons (us, ca, gb, au, de, fr, in, jp, cn, za, it, es)
- **main.js** grew from ~1877 to 2061 lines — added: `esc()` HTML escaping, safe data-attribute "Add to Order" with event delegation, custom select dropdown IIFE with SVG flag support for phone country picker
- **collection.js** uses safe data-attribute pattern for "Add to Order" buttons with event delegation (line 753-758)
- **Social icons** across index.html, order.html replaced with real WhatsApp/email SVG icons
- **Product detail page** (`product.html`) switched to event-listener pattern for "Add to Order", favicon fixed to SVG
- **order.css** expanded with overflow-fix utilities (`min-width:0`, `max-width:100%`, `box-sizing:border-box`) and phone flag selector styles
- **shared.css** grew from 274 to 288 lines — added `.btn-o` inline-flex alignment and SVG sizing
- **collection.html** now loads `collection.js` as external file instead of inline script

---

## 1. e:\Main\index.html
Purpose: Homepage / landing page for the Forge Dominance knife brand.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- assets/css/colors.css
- assets/css/shared.css
- assets/css/products-components.css
- assets/css/hero.css
- assets/css/home.css

JS files loaded (in order):
- Google Tag Manager (gtag.js inline)
- assets/js/hero.js
- assets/js/site-settings.js?v=20260527c
- assets/js/age-gate.js?v=20260608
- assets/js/main.js?v=20260527e
- assets/js/sticky-contact.js?v=20260612
- assets/js/tracker.js
- Inline script (review section + homepage content loader)

Key HTML sections:
- Custom cursor elements
- Preloader with progress bar
- Slide-out cart panel (overlay + panel markup)
- Mobile nav overlay
- Fixed nav bar with cart badge
- Hero section with canvas background (#hcv)
- Hunt collection grid (4 hunt-type cards)
- Marquee/ticker band
- Horizontal scroll featured blades section
- Stats bar (animated counters)
- Story/origin section
- Testimonials section (hidden by default, dynamically loaded)
- CTA section (commission call-to-action)
- Footer with nav links
- Chat widget (inline markup)
- Sticky contact widget (WhatsApp with real logo SVG, Email with envelope icon, Live Chat)

Special behavior:
- Font preloading with document.fonts.load() + fallback timeout
- Age gate via age-gate.js
- Visitor tracking via tracker.js
- Dynamic reviews section loaded from API on page load
- Dynamic homepage content (hero headline, subtext, eyebrow, floats, stats) loaded from API
- "Add to Order" on featured product cards uses safe data-attribute pattern + event delegation (no inline onclick)
- Sticky contact uses real WhatsApp brand SVG icon

API endpoints referenced:
- GET /api/settings/public/reviews — loads review/testimonial data
- GET /api/homepage-content — loads dynamic hero + stats bar content

---

## 2. e:\Main\404.html
Purpose: Custom 404 "Page Not Found" error page.

CSS files loaded: None external — all styles are inline in a `<style>` block. Loads Google Fonts via `<link>` (Bebas Neue, IBM Plex Mono, Outfit).

JS files loaded: None.

Key HTML sections:
- Brand logo
- Large "404" code display
- "Page Not Found" heading and description
- Links back to Home, Collection, and Commission

Special behavior: None. Fully static. noindex, nofollow robots directive.

API endpoints referenced: None.

---

## 3. e:\Main\pages\about.html
Purpose: Company "About Us" page with history timeline, founder bios, values, and workshop gallery.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/hero.css
- ../assets/css/about.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/about.js
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/age-gate.js?v=20260608
- ../assets/js/main.js?v=20260527e
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/tracker.js

Key HTML sections:
- Cursor, preloader, cart panel, mobile nav, nav bar (reused pattern)
- About hero with tagline
- Timeline section (2010-2025 milestones)
- Founders section (3 founder profile cards)
- Values section ("The Four Absolutes")
- Workshop gallery (5 images)
- CTA section
- Footer

Special behavior:
- Age gate
- Visitor tracking

API endpoints referenced: None directly in HTML/inline JS (relies on shared scripts).

---

## 4. e:\Main\pages\collection.html
Purpose: Product listing page (PLP) showing all knife categories with filtering.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/products-components.css
- ../assets/css/collection.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/age-gate.js?v=20260608
- ../assets/js/theme-manager.js
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/collection.js?v=20260612

Key HTML sections:
- Cursor, preloader, nav, cart panel, mobile nav
- PLP hero with parallax background
- Scarcity bar
- Category tabs (Hunters, Camp & Trail, Skinning Knives, Folding Knives)
- Product grid (populated via JS)
- "Why No Direct Checkout" explanation section
- Footer
- Product modal (details overlay)
- Sticky contact widget (chat, email, WhatsApp)

Special behavior:
- Reads ?category= URL param to pre-select a tab
- Skeleton loading states for product grid
- Category aliases/normalization (maps multiple URL slugs to canonical keys)
- Full cart management (localStorage-backed bs_order_cart)
- Live chat widget with polling (/api/chat + /api/chat/poll/:id)
- 3D tilt effect on product cards
- Custom cursor with ring-follow animation
- IntersectionObserver for reveal animations
- Parallax on hero background
- Inline visitor tracking (pageview + beforeunload leave event)
- "Add to Order" buttons use safe data-attribute + event delegation pattern (handles product names with apostrophes)
- Product modal thumbnail onclick uses escapeHtml() to prevent XSS

API endpoints referenced:
- GET /api/products/category/:categoryName (called for each of 4 categories)
- POST /api/chat (send chat message)
- GET /api/chat/poll/:visitorId (poll for admin replies)
- POST /api/visitors/track (pageview + leave tracking)

---

## 5. e:\Main\pages\product.html
Purpose: Single product detail page (PDP), loaded dynamically by product ID from URL.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/products-components.css

JS files loaded (in order):
- Large inline `<script>` block (product fetching, rendering, cart, gallery, cursor)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/main.js?v=20260527e
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/tracker.js

Key HTML sections:
- Cursor elements
- Cart overlay and panel
- Topbar with brand logo, cart button, and "Back to Collection" link
- `<main id="detailRoot">` — content loaded dynamically

Special behavior:
- Reads ?id= or ?product= query param to determine which product to fetch
- Fetches product from API, then renders gallery, specs, story, comparison table, trust badges, CTA
- Image gallery with prev/next arrows and thumbnail strip
- "Add to Order" button uses event listener closure pattern (safe for product names with apostrophes)
- Cart management (open, close, quantity slider, remove)
- Cross-tab cart sync via storage event and visibilitychange
- Custom cursor
- Inline visitor tracking (pageview + leave)
- Favicon uses SVG: `<link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg"/>`
- No age gate on this page

API endpoints referenced:
- GET /api/products/:id (fetch single product record)
- POST /api/visitors/track (pageview + leave tracking)

---

## 6. e:\Main\pages\commission.html
Purpose: Custom knife commission request form page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/hero.css
- ../assets/css/order.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/order.js
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/age-gate.js?v=20260608
- ../assets/js/main.js?v=20260527e
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/tracker.js

Key HTML sections:
- Cursor, preloader, cart panel, mobile nav, nav bar
- Order hero (commission form intro)
- Commission form with 3 sections:
  - Section 01: Personal details (name, email, phone with country select, country/region)
  - Section 02: Project brief (commission brief textarea, reference notes)
  - Section 03: Budget range slider ($300-$5000) + reference image upload
- Right sidebar "Commission Snapshot" panel (live preview of inputs)
- Success state (hidden until form submission)
- Footer

Special behavior:
- Multi-step form with live preview panel
- Budget slider with visual meter
- Phone number validation with country code picker (SVG flags on both mobile and desktop)
- Custom select dropdown with SVG country flags (position:fixed, appended to body)
- Reference image upload with filename display
- Form submits via submitOrder() function (in main.js)
- Form overflow fixed with min-width:0 and max-width:100% on grid children
- Age gate

API endpoints referenced: Submission handled by main.js → POST /api/commissions/public (multipart).

---

## 7. e:\Main\pages\order.html
Purpose: Cart review / order page — shows items added to cart and collects shipping details.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/hero.css
- ../assets/css/order.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/order.js
- ../assets/js/site-settings.js?v=20260529d
- ../assets/js/age-gate.js?v=20260608
- ../assets/js/main.js?v=20260529d
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/tracker.js

Key HTML sections:
- Cursor, preloader, cart panel, mobile nav, nav bar
- Order hero (review heading)
- Order summary card showing selected products, count, and total
- Contact/shipping form (name, email, phone, full address, optional notes)
- Action buttons: "Chat on WhatsApp" (real WhatsApp SVG icon) and "Email Inquiry" (real envelope SVG icon)
- Process info (4-step "what happens next")
- "Why No Direct Checkout" section
- Footer

Special behavior:
- Reads cart state from localStorage (bs_order_cart)
- Displays selected products list with total
- WhatsApp share and email inquiry buttons (assembled from form data via main.js)
- Phone validation with country selector (SVG flags on desktop and mobile)
- Custom select dropdowns escape overflow:hidden via position:fixed + document.body.appendChild
- Form fields have min-width:0 and box-sizing:border-box to prevent overflow
- Age gate
- noindex, nofollow robots directive

API endpoints referenced: Handled by main.js (order submission logic → POST /api/orders/public).

---

## 8. e:\Main\pages\faq.html
Purpose: Frequently Asked Questions page with dynamically loaded FAQ items.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- Inline `<script>` block (fetches FAQ data)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero section (title, lead text, pills)
- FAQ list container (`<details>` elements populated by JS)
- Footer with full nav

Special behavior:
- Fetches FAQ items from API on page load
- Renders as expandable `<details>`/`<summary>` elements
- First item opens by default

API endpoints referenced:
- GET /api/faq — returns array of question/answer objects

---

## 9. e:\Main\pages\press.html
Purpose: Press/media information page with brand context for journalists.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero (brand snapshot aside)
- Info content grid (Media Requests, Product Facts, Brand Assets cards)
- Footer

Special behavior: Fully static content. No dynamic loading.

API endpoints referenced: None.

---

## 10. e:\Main\pages\privacy.html
Purpose: Privacy policy page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero with "At a Glance" aside
- Info content grid (What We Collect, How We Use It, Your Control)
- Info note (additional guidance)
- Footer

Special behavior: Static. noindex, follow robots directive.

API endpoints referenced: None.

---

## 11. e:\Main\pages\terms.html
Purpose: Terms and conditions page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero with "At a Glance" aside
- Info content grid (Using the Site, Commission Orders, Content & Ownership)
- Footer

Special behavior: Static. noindex, follow robots directive.

API endpoints referenced: None.

---

## 12. e:\Main\pages\warranty-policy.html
Purpose: Lifetime warranty policy explanation page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero with "At a Glance" aside
- Info content grid (What Is Covered, How to Start a Claim, Common Limits)
- Footer

Special behavior: Static content.

API endpoints referenced: None.

---

## 13. e:\Main\pages\shipping-info.html
Purpose: Shipping information and delivery expectations page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero with "At a Glance" aside
- Info content grid (Processing Time, Delivery Regions, Tracking & Customs)
- Footer

Special behavior: Static content.

API endpoints referenced: None.

---

## 14. e:\Main\pages\akti-compliance.html
Purpose: AKTI (American Knife & Tool Institute) compliance and responsible ownership page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero with "At a Glance" aside
- Info content grid (Responsible Sales, Storage & Transport, Our Position)
- Footer

Special behavior: Static content.

API endpoints referenced: None.

---

## 15. e:\Main\pages\blade-laws-by-state.html
Purpose: State-by-state knife law guidance page.

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../assets/css/colors.css
- ../assets/css/shared.css
- ../assets/css/info-pages.css

JS files loaded (in order):
- Google Tag Manager (inline)
- ../assets/js/site-settings.js?v=20260527c
- ../assets/js/sticky-contact.js?v=20260612
- ../assets/js/info-pages.js

Key HTML sections:
- Mobile nav, nav bar
- Info hero with "At a Glance" aside
- Info content grid (Before You Travel, Common Differences, Our Advice)
- Info note (legal disclaimer)
- Footer

Special behavior: Static content.

API endpoints referenced: None.

---

## 16. e:\Main\pages\checkout\cart.html
Purpose: Shopping cart page (Stripe checkout flow step 1).

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../../assets/css/colors.css
- ../../assets/css/shared.css
- ../../assets/css/checkout.css

JS files loaded (in order):
- ../../assets/js/site-settings.js
- Inline `<script>` block (cart rendering logic)

Key HTML sections:
- Checkout nav with step indicator (Cart / Checkout / Confirmation)
- Cart items container with empty state
- Cart summary (subtotal, shipping free, total)
- "Proceed to Checkout" button
- Minimal footer

Special behavior:
- Reads from localStorage key bs_checkout_cart (separate from the main bs_order_cart)
- Renders cart items with quantity controls (+/-) and remove button
- "Proceed to Checkout" navigates to checkout.html
- noindex, nofollow robots directive

API endpoints referenced: None (client-side localStorage only).

---

## 17. e:\Main\pages\checkout\checkout.html
Purpose: Stripe checkout form page (step 2 of checkout flow).

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../../assets/css/colors.css
- ../../assets/css/shared.css
- ../../assets/css/checkout.css

JS files loaded (in order):
- ../../assets/js/site-settings.js
- Inline `<script>` block (order summary render + Stripe session creation)

Key HTML sections:
- Checkout nav with step indicator (step 2 active)
- Two-column grid: checkout form (left) + order summary (right)
- Form collects: email, first/last name, address, city, state, ZIP, country (US/CA)
- "Pay with Stripe" submit button (shows "Processing..." while loading)
- Order summary sidebar showing items from cart

Special behavior:
- Redirects to cart.html if cart is empty
- On form submit, POSTs cart items + email to API to create a Stripe Checkout session
- Redirects browser to Stripe-hosted checkout URL on success
- noindex, nofollow

API endpoints referenced:
- POST /api/stripe/checkout/create-session — body: { items, customerEmail, successUrl, cancelUrl }

---

## 18. e:\Main\pages\checkout\success.html
Purpose: Post-payment success confirmation page (step 3 of checkout flow).

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../../assets/css/colors.css
- ../../assets/css/shared.css
- ../../assets/css/checkout.css

JS files loaded (in order):
- ../../assets/js/site-settings.js
- Inline `<script>` block (loads order details from Stripe session)

Key HTML sections:
- Checkout nav with step indicator (step 3 active)
- Success icon (checkmark circle)
- "Order Confirmed" heading
- Order details (status, email, amount paid — populated dynamically)
- Note about confirmation email
- Action links: Return Home, Continue Shopping

Special behavior:
- Reads ?session_id= URL param
- Fetches session details from API to display email and amount
- Clears bs_checkout_cart from localStorage after successful purchase
- noindex, nofollow

API endpoints referenced:
- GET /api/stripe/checkout/session/:sessionId — returns { customerEmail, amountTotal, currency, status }

---

## 19. e:\Main\pages\checkout\cancel.html
Purpose: Payment cancelled/aborted page (user returned from Stripe without paying).

CSS files loaded (in order):
- Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
- ../../assets/css/colors.css
- ../../assets/css/shared.css
- ../../assets/css/checkout.css

JS files loaded (in order):
- ../../assets/js/site-settings.js

Key HTML sections:
- Checkout nav with step indicator (step 1 marked done only)
- Cancel icon (X circle)
- "Payment Cancelled" heading
- Reassurance message (no charges)
- Action links: Return to Cart, Continue Shopping

Special behavior: Fully static. Cart is preserved (not cleared). noindex, nofollow.

API endpoints referenced: None.

---

## Summary of All API Endpoints Used Across the Site

| Endpoint | Method | Used In |
|----------|--------|---------|
| /api/settings/public/reviews | GET | index.html |
| /api/homepage-content | GET | index.html |
| /api/products/category/:name | GET | collection.html |
| /api/products/featured | GET | index.html (main.js) |
| /api/products/:id | GET | product.html |
| /api/chat | POST | collection.html, (info-pages.js, main.js) |
| /api/chat/poll/:visitorId | GET | collection.html, (info-pages.js, main.js) |
| /api/visitors/track | POST | collection.html, product.html, (tracker.js on other pages) |
| /api/faq | GET | faq.html |
| /api/commissions/public | POST | commission.html (via main.js) |
| /api/orders/public | POST | order.html (via main.js) |
| /api/stripe/checkout/create-session | POST | checkout/checkout.html |
| /api/stripe/checkout/session/:id | GET | checkout/success.html |
| /api/settings/public | GET | site-settings.js (all pages) |
| /api/promotions/ads/public | GET | site-settings.js (promo ads) |

---

## Shared JS Files Across Pages

| File | Lines | Pages Using It |
|------|-------|----------------|
| site-settings.js | 367 | All pages except 404 |
| age-gate.js | 191 | index, about, collection, commission, order |
| main.js | 2061 | index, about, product, commission, order |
| sticky-contact.js | 52 | All pages except 404 and checkout |
| tracker.js | 232 | index, about, product, commission, order |
| info-pages.js | 732 | faq, press, privacy, terms, warranty-policy, shipping-info, akti-compliance, blade-laws-by-state |
| collection.js | 865 | collection only |
| hero.js | 77 | index only |
| about.js | 1 | about only (placeholder) |
| order.js | 1 | commission, order (placeholder — main.js handles logic) |
| theme-manager.js | 60 | collection only |

---

## FRONTEND JS FILES

### 1. e:\Main\assets\js\main.js (2061 lines)
Purpose: The primary frontend bundle. Handles page navigation, cart/order system, commission form, live chat widget, preloader, mobile nav, custom cursor, canvas ember particles, horizontal product collection, intersection observers, GA4 tracking, visitor analytics, and custom select dropdowns with SVG flag support.

Functions Defined:

| Function | Purpose | Parameters |
|----------|---------|------------|
| withLoading | Disables button, shows "Please wait...", runs async fn, restores | btn, asyncFn |
| showPage | SPA-like page navigation with route resolution and hash scrolling | id, anchorId |
| placeHuntSection (IIFE) | Re-positions hunt-collection section after hero | none |
| loadCartState | Reads cart from localStorage | none |
| saveCartState | Persists cart to localStorage | none |
| syncCartState | Reloads cart from storage into global | none |
| normalizeCartImage | Resolves relative image paths to absolute URLs | path |
| addToCart | Adds/increments cart item, triggers GA4, opens cart panel | name, steel, price, img, productUrl |
| removeFromCart | Removes item by name | name |
| changeQty | Increments/decrements item quantity | name, delta |
| setQtyBySlider | Sets quantity from range slider | name, qty |
| updateCartUI | Renders full cart DOM (items, subtotal, badge) | none |
| refreshCartAcrossPages | Syncs cart when returning to page or tab | none |
| openCart / closeCart | Toggles cart slide-out panel | none |
| goToOrder | Closes cart, navigates to order page | none |
| formatBudget | Formats number as $X,XXX | value |
| setBudget | Updates commission budget state + DOM | value |
| updateCommissionSummary | Mirrors form fields into summary section | none |
| getPhoneMaxLength | Parses length spec (number or "N-M") | lengthSpec |
| updatePhonePlaceholder | Sets phone input mask per selected country | none |
| validatePhoneInput | Real-time phone validation with custom validity | input |
| initPhoneInputs | Bootstrap phone input system | none |
| handleReferenceUpload | Handles reference image file input for commissions | input |
| submitOrder | Validates and POSTs commission form as multipart | none |
| getOrderFormData | Collects all order form fields into object | none |
| validateOrderForm | Validates required fields and email | data |
| submitOrderLead | POSTs order with items to backend | none |
| buildOrderShareMessage | Constructs multiline text summary for WhatsApp/email | none |
| shareOrderWhatsApp | Submits lead then opens WhatsApp deep link | none |
| shareOrderEmail | Submits lead then opens mailto link | none |
| resetOrder | Resets commission form to initial state | none |
| initCommissionPage | Wires up commission form listeners | none |
| renderSelectedProductsSummary | Renders order items summary list + updates OG tags | none |
| ensurePreloaderMarkup | Injects preloader HTML if missing | none |
| ensureStickyContactMarkup | Injects floating contact buttons + chat widget | none |
| readChatHistory / saveChatHistory / seedChatHistory | Chat history localStorage management | none / history |
| appendChatBubble | DOM: adds chat bubble | role, text |
| getChatVisitorId | Creates/returns unique visitor ID | none |
| getChatButton / ensureChatBadge | Gets chat FAB / ensures badge element | none |
| playChatSound | Plays 880Hz sine tone via Web Audio API | none |
| ensureToastContainer / showChatToast | Creates/shows floating toast notification | text |
| setChatUnreadCount / clearChatUnread | Manages unread count badge + page title | count |
| isChatOpen | Checks if chat widget is open | none |
| maybeRequestChatNotificationPermission | Requests browser notification permission | none |
| notifyChatReplies | Handles incoming admin messages (toast, sound, badge) | messages |
| pollChatReplies | Long-polls for admin replies | none |
| stopChatPolling / startChatPolling | Manages polling interval | none |
| renderChatHistory / bindChatDismiss / initChatWidget | Initializes chat widget | none |
| toggleChat | Toggles chat widget open/close | none |
| sendChat | Sends message to backend chat endpoint | none |
| toggleNav | Mobile hamburger nav toggle | none |
| runScrollWork / requestScrollWork | Nav solidification + parallax on scroll | none |
| initCanvas (IIFE) | Creates ember particle animation on hero canvas | none |
| esc | HTML-escapes a string (prevents XSS in data attributes) | text |
| featuredTier / featuredSteel | Derives display labels from product data | product |
| imagePathFromRecord / resolveApiPath / normalizeFeaturedImageUrl / featuredImage | Image URL normalization pipeline | various |
| renderFeaturedCards | Renders product cards with safe data-attribute buttons | products |
| loadFeaturedProducts | Fetches featured products from API | none |
| (event delegation handler) | Catches .js-add-order clicks, calls addToCart with dataset | (global click) |
| syncHS / calcHS / syncHSLoop | Horizontal scroll positioning (now static flex) | none |
| ensureVisitorId | Creates visitor tracking ID | none |
| trackVisitor | Sends visitor event to backend | action, meta |
| getCardScrollAmount | Calculates card width + gap for scroll buttons | none |
| trackProductView / trackAddToCart / trackCommissionSubmit / trackOrderPlace | GA4 event helpers | various |
| initCustomSelects (IIFE) | Upgrades native selects to custom dropdowns with flags | none |

API Calls:
- POST /api/commissions/public — commission form submission (multipart)
- POST /api/orders/public — order lead submission (JSON)
- GET /api/products/featured — featured products fetch
- POST /api/chat — send chat message
- GET /api/chat/poll/:visitorId — poll for chat replies
- POST /api/visitors/track — visitor tracking events

Event Listeners:
- storage event (cart sync across tabs)
- visibilitychange (cart refresh, cursor, canvas, chat)
- click (mobile card tap, chat dismiss, visitor tracking, anchor scrolls, .js-add-order delegation)
- scroll (nav solid, parallax, scroll percent, custom select close)
- resize (canvas, horizontal scroll)
- load (preloader, scroll)
- mousemove, mouseover, mouseout (custom cursor, tilt cards, magnetic buttons)
- beforeunload (visitor leave event)
- bs:pagechange (custom event)
- keydown Escape (close custom selects)

localStorage/sessionStorage Keys:
- bs_order_cart (cart state)
- bs_chat_history (chat messages)
- bs_visitor_id (visitor identifier)

Dependencies: site-settings.js (via window.getBladesmithSiteSettings)

---

### 2. e:\Main\assets\js\collection.js (865 lines)
Purpose: Standalone PLP (Product Listing Page) script for collection.html. Handles catalog fetching, product grid rendering, product modal, cart management, live chat, custom cursor, 3D tilt effects, and parallax.

Functions Defined:

| Function | Purpose | Parameters |
|----------|---------|------------|
| (cursor IIFE) | Custom cursor with ring-follow animation | none |
| addBladeToOrder | Adds item to localStorage cart, opens cart panel | name, steel, price, img |
| updateCartUI | Renders cart items list with quantity controls | none |
| openCart / closeCart | Toggle cart panel visibility | none |
| escapeHtml | HTML entity escaping | str |
| renderCategory | Fetches and renders a single category's products | category |
| openModal | Opens product detail modal with full specs | product |
| closeModal | Closes product modal | none |
| (event delegation for .js-add-order) | Safe click handler for "Add to Order" buttons | (global click) |
| toggleMobNav | Mobile nav hamburger toggle | none |
| initChat / sendChat / toggleChat | Chat widget management | various |
| startChatPolling / pollChatReplies | Chat polling loop | none |

Key patterns:
- Product card buttons use `data-name`, `data-steel`, `data-price`, `data-img` attributes with `escapeHtml()` for safe interpolation
- Event delegation at line 753 catches all `.js-add-order` clicks
- Modal thumbnail onclick uses `escapeHtml(g)` for image paths
- Cart stored in localStorage key `bs_order_cart`
- Category aliases normalize URL slugs (e.g., "hunting" → "Hunters", "camp" → "Camp & Trail")

API Calls:
- GET /api/products/category/:categoryName
- POST /api/chat
- GET /api/chat/poll/:visitorId
- POST /api/visitors/track

---

### 3. e:\Main\assets\js\sticky-contact.js (52 lines)
Purpose: Ensures consistent sticky contact widget across all pages. If main.js or info-pages.js already injected the widget, does nothing. Otherwise injects minimal markup with WhatsApp (real brand SVG), Email (envelope SVG), and Live Chat buttons.

Functions:
- init() — checks if #sticky-contact exists, calls injectMinimal() if not
- injectMinimal() — creates widget with dynamic WhatsApp/email links from site settings

Dependencies: window.getBladesmithSiteSettings (from site-settings.js)

---

### 4. e:\Main\assets\js\site-settings.js (367 lines)
Purpose: Fetches and applies site-wide configurable settings (brand name, contact info, WhatsApp number, age gate toggle, promotional ads). Updates DOM nodes with brand text, links, copyright, etc.

Functions Defined:

| Function | Purpose | Parameters |
|----------|---------|------------|
| normalizeSettings | Merges raw input with defaults, normalizes WhatsApp | input |
| readCachedSettings | Reads from sessionStorage with TTL check | none |
| writeCachedSettings | Writes to sessionStorage with timestamp | settings |
| updateTitle | Replaces brand names in document.title | siteName |
| updateAnchorLinks | Updates all mailto/WhatsApp links in DOM | settings |
| splitBrandHtml | Splits brand name into two halves with `<span>` | siteName |
| updateCommonBrandNodes | Updates all brand-displaying DOM nodes | siteName |
| applySettings | Master function: normalizes, caches, updates DOM, dispatches event | rawSettings |
| loadSettings | Loads from cache then fetches fresh from API | none |
| refreshSettings | Force-fetches latest settings | none |
| isAdminRoute | Checks if current page is admin | none |
| normalizePromoImageUrl | Normalizes promo ad image URLs | value |
| escapeHtml | HTML entity escaping | value |
| buildPromoMarkup | Constructs full promo modal DOM | ad |
| showPromoAd | Displays promo ad modal (once per session) | ad |
| initPromoAd | Fetches and shows promotional ads | none |

API Calls:
- GET /api/settings/public — fetch site settings
- GET /api/promotions/ads/public — fetch promotional ads

sessionStorage Keys:
- bs_site_settings_cache_v2 (cached settings with TTL)
- bs_promo_ad_seen_{id} (per-ad seen flag)
- bs_promo_ad_shown_any (session-level flag)

Exported Globals:
- window.getBladesmithSiteSettings()
- window.refreshBladesmithSiteSettings()
- window.bladesmithSiteSettingsReady (Promise)
- window.BladesmithSiteSettings (object)

---

### 5. e:\Main\assets\js\age-gate.js (191 lines)
Purpose: Age verification gate. Prompts users to select birth month/year; if under 18, redirects to Google. Uses session storage to remember verification. Custom mobile select UI.

Functions Defined:

| Function | Purpose | Parameters |
|----------|---------|------------|
| initCustomSelects | Creates touch-friendly custom dropdown UIs | none |
| showGate | Displays the age gate, populates month/year options | none |
| hideGate | Hides the age gate | none |
| checkAge | Validates age from selected month/year | none |
| decide | Determines whether to show gate based on settings | settings |

sessionStorage Keys:
- bs_age_verified — set to 'true' after passing

Dependencies: site-settings.js (for ageGateEnabled flag)

---

### 6. e:\Main\assets\js\hero.js (77 lines)
Purpose: Lightweight canvas particle effect for the hero section. Draws rising ember particles with glow.

Functions:
- resize — Resizes canvas to parent dimensions
- createParticle — Creates a particle with random position/velocity
- tick — Animation frame: updates and draws particles
- init — Resizes canvas and starts animation loop

Dependencies: None

---

### 7. e:\Main\assets\js\order.js (1 line)
Purpose: Placeholder/scaffold. Contains only a comment: "Order section scaffold. The legacy bundle still owns the live form logic for now."

Dependencies: main.js handles all order logic

---

### 8. e:\Main\assets\js\info-pages.js (732 lines)
Purpose: Shared scaffold for sub-pages (faq, press, privacy, terms, etc.). Injects preloader, age gate, sticky contact, chat widget, custom cursor, mobile nav. A self-contained mini-version of main.js for non-homepage pages.

Functions Defined:

| Function | Purpose | Parameters |
|----------|---------|------------|
| ensurePreloaderMarkup | Injects preloader DOM | none |
| ensureAgeGateMarkup | Injects age gate DOM | none |
| ensureStickyContactMarkup | Injects floating contact widgets | none |
| initPreloader | Runs loading animation with failsafe | none |
| initAgeGate | Initializes age gate logic | none |
| initAgeGateCustomSelects | Custom mobile selects for age gate | gate |
| window.checkAge | Age verification logic (global) | none |
| window.toggleChat | Toggle chat widget (global) | none |
| window.sendChat | Send chat message (global) | none |
| readChatHistory / saveChatHistory / seedChatHistory | Chat history | none / history |
| appendChatBubble | DOM chat bubble | role, text |
| getChatVisitorId | Visitor ID management | none |
| maybeRequestChatNotificationPermission | Browser notification | none |
| notifyChatReplies / setChatUnreadCount | Unread management | various |
| playChatSound / showChatToast | Notification UX | text |
| pollChatReplies / startChatPolling | Chat polling | none |
| renderChatHistory / bindChatDismiss / initChatWidget | Chat init | none |
| ensureCursorMarkup / initCursor | Custom cursor setup | none |
| setNavOpen | Mobile nav state | nextState |

API Calls:
- POST /api/chat — send message
- GET /api/chat/poll/:visitorId — poll replies

Dependencies: site-settings.js

---

### 9. e:\Main\assets\js\tracker.js (232 lines)
Purpose: Advanced visitor tracking system. Class-based BladeSmithTracker that batches events and flushes every 10 seconds, tracks page views, clicks, form submissions, scroll depth, and page exits.

Methods:
- constructor — Initializes visitor ID, session, starts tracking
- getOrCreateVisitorId — Creates/returns persistent visitor ID
- init — Attaches all event listeners and intervals
- trackPageView — Queues pageview event
- trackClick — Queues click event with element details
- trackFormSubmit — Queues form submission event
- trackPageExit — Queues exit event with time-on-page
- onPageChange — Handles SPA navigation changes
- onBeforeUnload — Tracks exit, flushes via beacon
- sendPeriodicUpdate — Queues periodic heartbeat (30s)
- flushQueue — Sends batched events via fetch
- flushQueueBeacon — Sends batched events via sendBeacon
- trackEvent — Public: queue custom named event
- getVisitorInfo — Returns current visitor state

API Calls:
- POST /api/visitors/track — event batch (fetch and sendBeacon)

Exported Globals:
- window.bsTracker (BladeSmithTracker instance)
- window.trackBSEvent(name, details)

---

### 10. e:\Main\assets\js\theme-manager.js (60 lines)
Purpose: Synchronizes dark/light theme across all pages via localStorage. Sets data-theme attribute on `<html>`.

Functions:
- applyTheme — Sets or removes data-theme attribute
- initializeTheme — Reads stored theme and applies

localStorage Keys:
- admin_theme

Exported Global: window.ThemeManager with methods: init, apply, get, set

---

## ADMIN JS FILES

### 11. e:\Main\assets\admin\js\api-service.js (~789 lines)
Purpose: Complete admin API service layer. Handles JWT token management, authenticated fetch wrapper with retry/timeout/dedup, and service objects for every backend resource.

Objects/Functions:
- TokenManager — access/refresh tokens in localStorage
- apiCall / apiCallInner — Deduplicating fetch with JWT, retry, timeout, abort
- AuthService — login, requestPasswordReset, resendResetCode, verifyResetCode, verifySMSOtp, resendTwoFactorCode, resetPassword, logout, isLoggedIn, getCurrentUser
- DashboardService — getKPIs, getRevenueChart, getOrderStatusChart, getRecentOrders, getAnalytics
- ProductsService — getAll, getFeatured, getById, create, update, delete, updateSortOrder
- OrdersService — getAll, getByStatus, getById, create, update, updateStatus, delete
- CommissionService — getAll, update, delete
- CustomersService — getAll, getById, create, update, delete, addNote
- PromotionsService — getAds, createAd, deleteAd, getCoupons, createCoupon, deleteCoupon, getAll, getById, create, update, delete, getCampaignRecipients, getCampaignQueue, deleteCampaignQueueEntry, sendCampaign
- UploadsService — uploadImage, uploadAdImage, uploadReviewImage
- SettingsService — getAll, update, save, testEmailConnection
- UsersService — getAll, create, updateRole, updatePassword, delete
- RolesService — getAll, create, update, delete
- ThemesService — getAll, getById, create, update, delete
- requireAuth — Guard: redirects to login if not authenticated

localStorage Keys:
- auth_token, refresh_token, auth_user, session_id

---

### 12. e:\Main\assets\admin\js\products-v2.js (~718 lines)
Purpose: Admin products management page. Three-tab interface (Featured, All Products, Sort Order). Supports CRUD operations, multi-image upload with reorder/thumbnail selection, featured toggle with batch save, drag-and-drop sort order.

Dependencies: api-service.js (TokenManager, ProductsService, UploadsService, requireAuth), utils.js (Toast, escapeHtml)

---

### 13. e:\Main\assets\admin\js\utils.js (~450 lines)
Purpose: Shared admin UI utilities. Toast notifications, modal management, string/date formatting, DOM helpers, theme management, form utilities, page access control, sidebar toggle, mobile sidebar, notification toggle, user display.

Classes: Toast, Modal

Exported Globals: All functions and classes on window

---

## ADMIN HTML PAGES

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | admin/dashboard.html | KPIs, charts, recent orders |
| Products | admin/products-v2.html | CRUD, featured, sort order |
| Orders | admin/orders.html | Order management, status updates |
| Chat | admin/chat.html | Live chat admin interface |
| Analytics | admin/analytics.html | Visitor analytics dashboard |
| Logs | admin/logs.html | Admin activity/session logs |
| Settings | admin/settings.html | Site settings, SMTP, roles |
| Editor | admin/editor.html | Visual page editor (iframe) |
| Promotions | admin/promotions.html | Ads, coupons, email campaigns |
| Login | admin/login.html | Auth with 2FA/TOTP support |

---

## BACKEND MODEL FILES

### Product.js
Table: products (main), product_images (related)

Products Fields: id, name, sku, price, compare_price, stock, category, description, featured, craft_story, blade, overall, handle, weight, grind, tang, sort_order, recommended_use, comparison_rows (jsonb), trust_badges (jsonb), features (jsonb), specifications (jsonb), descriptions (jsonb), variants (jsonb), display_options (jsonb), created_at, updated_at

Product Images Fields: product_id (FK), image_url, sort_order, is_thumbnail, alt_text, created_at, updated_at

Static Methods: sortImages, normalizeImageRow, normalizeImages, syncImages, fetchImagesForProduct, attachImages, attachImagesToProducts, pickThumbnailUrl, attachThumbnailsToProducts, create, findAll, findAllWithThumbnails, findById, update, delete, getFeatured, getByCategory, getTotalCount, updateSortOrder

### Order.js
Table: orders

Fields: id, customer_id (FK), status, total, items (JSON stringified), created_at, updated_at

Static Methods: create, findAll, findById, updateStatus, update, getByStatus, getTotalRevenue, getCompletedStats, getTotalCount, delete

### Customer.js
Tables: customers, customer_notes

Customer Fields: id, name, email, phone, address, address_line2, city, state, zip, country, created_at

Static Methods: create, findAll, findById, findByEmail, update, getTotalCount, addNote, getNotes, delete

### Commission.js
Table: commissions

Fields: id, full_name, email, phone, country, country_code, brief, budget, reference_image_url, reference_image_path, status (default 'new'), source (default 'website'), notes, created_at, updated_at

Static Methods: create, findAll, findById, update, delete

### User.js
Table: users

Fields: id, email, password (bcrypt), role (default 'admin'), created_at

Static Methods: create, findByEmail, findById, verifyPassword, updatePassword, updateRole, getAll, delete

---

## BACKEND LIB FILES

| File | Purpose |
|------|---------|
| emailTemplates.js | Branded HTML email templates for order/commission confirmations |
| siteSettings.js | Server-side settings management (Supabase + file fallback + memory cache) |
| totp.js | TOTP 2FA implementation (RFC 6238, SHA1, 6-digit, 30s window) |
| dbUtils.js | Detects "missing table" Supabase errors for graceful degradation |
| imageCache.js | Converts base64 data URIs to cached static files on disk |

---

## BACKEND ROUTE FILES

| Route File | Key Endpoints |
|------------|---------------|
| dashboard.js | GET /kpis, /revenue-chart, /order-status-chart, /recent-orders, /analytics |
| promotions.js | GET/POST/DELETE /ads, /coupons, /campaigns/send, /campaign-recipients |
| settings.js | GET/PUT /, GET /public, GET/PUT /me, POST /test-email, CRUD /roles |
| themes.js | CRUD /themes |
| editor.js | GET/POST / (page content), GET /page, POST /save, GET /backups |
| visitors.js | POST /track, GET /stream (SSE), GET /events, /summary, /summary-by-ip |
| tracking.js | POST /admin/login, /admin/logout, /admin/action; GET /admin/history |
| users.js | CRUD /users with role/password management |
| uploads.js | POST /upload-image, /upload-base64, /upload-ad-image, /upload-review-image, /upload-admin-avatar |
| commissions.js | GET /, POST /public (multipart), PUT /:id, DELETE /:id |
| chat.js | POST /, GET /poll/:id, GET /conversations, POST reply, PATCH close, DELETE |
| faq.js | GET /, PUT /, POST /, PUT /:id, DELETE /:id, POST /reorder |
| homepage-content.js | GET /, PUT / |
| stripe.js | POST /checkout/create-session, GET /checkout/session/:id, POST /webhook |

---

## BACKEND CONTROLLER FILES

| Controller | DB Tables | Redis Cache |
|------------|-----------|-------------|
| productController.js | products, product_images | products:all, products:{id}, products:featured, products:category:{cat} |
| orderController.js | orders, customers | orders:list, orders:single:{id}, orders:status:{status} |
| customerController.js | customers, customer_notes | customers:list, customers:single:{id} |
| authController.js | admin_users | none |
| dashboardController.js | orders, customers, products | dashboard:kpis, dashboard:revenue, dashboard:order-status, dashboard:recent-orders, dashboard:analytics |
| uploadController.js | none (filesystem only) | none |

---

## Summary of All DB Tables Referenced

| Table | Used By |
|-------|---------|
| products | productController, dashboardController |
| product_images | productController |
| orders | orderController, dashboardController, promotions |
| customers | customerController, orderController, dashboardController, promotions, commissions |
| customer_notes | customerController |
| admin_users | authController, users route |
| admin_settings | settings, promotions, commissions, stripe |
| admins | settings, promotions |
| smtp_credentials | settings, promotions, orderController |
| promotions | promotions route |
| ads | promotions route |
| coupons | promotions route |
| campaign_email_logs | promotions route |
| commissions | commissions route, promotions |
| themes | themes route |
| editor_content | editor route |
| visitor_events | visitors route |
| admin_login_activity | tracking route |
| user_page_events | tracking route |
| user_tracking | tracking route |
| chat_conversations | chat route |
| chat_messages | chat route |
| site_settings | settings route |

---

## Summary of All Redis Cache Keys

| Key Pattern | TTL | Source |
|-------------|-----|--------|
| dashboard:kpis | 60s | dashboardController |
| dashboard:revenue:{period} | 120s | dashboardController |
| dashboard:order-status | 60s | dashboardController |
| dashboard:recent-orders | 30s | dashboardController |
| dashboard:analytics | 120s | dashboardController |
| products:all:{limit}:{offset} | 120s | productController |
| products:{id} | 120s | productController |
| products:featured | 300s | productController |
| products:category:{category} | 120s | productController |
| orders:list:{limit}:{offset} | 20s | orderController |
| orders:single:{id} | 30s | orderController |
| orders:status:{status}:{limit}:{offset} | 20s | orderController |
| customers:list:{limit}:{offset} | 60s | customerController |
| customers:single:{id} | 60s | customerController |
| settings:global | 60s | settings route |
| settings:public:reviews | 300s | settings route |
| settings:roles | 60s | settings route |
| promotions:active | 120s | promotions route |
| promotions:active:{type} | 120s | promotions route |
| promotions:all | 60s | promotions route |
| promotions:ads:public | 180s | promotions route |
| promotions:ads:admin | 60s | promotions route |
| promotions:coupons | 120s | promotions route |
| promotions:campaign:recipients | 60s | promotions route |
| visitors:events:{limit}:{offset}:{since} | 30s | visitors route |
| visitors:summary:{since} | 60s | visitors route |
| visitors:summary-by-ip:{since} | 60s | visitors route |
| chat:poll:{visitorId} | 8s | chat route |
| chat:conversations:{status} | 15s | chat route |

---

## CSS FILES

### Public CSS (12 files)

| File | Lines | Purpose |
|------|-------|---------|
| colors.css | 71 | Global design tokens (all CSS variables) |
| shared.css | 288 | Base reset, preloader, age gate, nav, cart, footer, buttons, animations |
| products-components.css | 240 | Product card (.pc) + product detail page styles |
| hero.css | 59 | Homepage hero with animated text reveals |
| home.css | 308 | Homepage sections (marquee, stats, story, hunt cards, testimonials, CTA) |
| about.css | 83 | About page (timeline, founders, values, workshop) |
| order.css | 276 | Commission/order form, budget slider, upload, phone selector with flags |
| info-pages.css | 334 | Informational pages template (FAQ, privacy, terms, etc.) |
| checkout.css | 530 | Standalone checkout flow (cart, form, success, cancel) |
| promo-ad.css | 57 | Promotional popup/modal overlay (BEM-style naming) |
| theme-light.css | 42 | Light theme variable overrides |
| collection.css | 127 | PLP hero, category tabs, product grid, modal, scarcity bar |

### Admin CSS (12 files)

| File | Lines | Purpose |
|------|-------|---------|
| theme.css | 360 | Admin design system (all admin CSS vars, typography, base components) |
| components.css | 616 | Admin layout (sidebar, header, nav), toasts, modals, mobile menu |
| dashboard.css | 425 | Dashboard metrics, charts, hero card, mini-lists |
| products.css | 615 | Product management (grid, form modal, image upload, drag sort) |
| orders.css | 286 | Order management (creation modal, product picker, filters) |
| analytics.css | 106 | Analytics stat cards grid |
| promotions.css | 344 | Promotions management (tabs, forms, review cards, campaigns) |
| logs.css | 279 | Activity logs (table, stat cards, session status) |
| settings.css | 308 | Settings (tabs, form cards, permissions, user table) |
| login.css | 445 | Login/auth page (self-contained, hardcoded colors) |
| chat.css | 793 | Live chat admin interface (sidebar, messages, FAQ panel) |
| editor.css | 81 | Visual page editor (toolbar, panels, iframe canvas) |

---

## Assets & Static Files

| Directory | Contents |
|-----------|----------|
| assets/images/ | favicon.svg, workshop images, product placeholders |
| assets/images/flags/ | 12 SVG country flags (us, ca, gb, au, de, fr, in, jp, cn, za, it, es) |
| assets/products/ | Uploaded product images |
| assets/uploads/ad/ | Promotional ad images |
| assets/uploads/reviews/ | Review images |
| assets/uploads/admin/ | Admin avatar images |
| assets/uploads/commissions/ | Commission reference images + PDFs |
| assets/data/ | faq.json, homepage.json (flat-file storage) |
| backups/editor/ | HTML page backups from editor |

---

## Project Stack

- **Backend:** Express.js + Supabase (PostgreSQL) + JWT auth + Redis cache
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Payments:** Stripe Checkout (hosted)
- **Admin panel:** `/admin/` directory (separate CSS/JS system)
- **Public pages:** `/pages/` directory
- **Tracking:** Custom visitor tracker (`assets/js/tracker.js`) + GA4
- **Process manager:** PM2 (cluster mode, port 5000)
- **Tunnel:** Cloudflare (trycloudflare.com)
- **2FA:** TOTP (RFC 6238) via custom implementation
- **Email:** SMTP (configurable via admin settings)

---

## Security Patterns

- HTML escaping via `esc()` / `escapeHtml()` for all user-sourced content in DOM
- Data-attribute pattern for "Add to Order" buttons (no inline `onclick` with interpolated strings)
- Event delegation for dynamic content (prevents XSS from product names with special characters)
- JWT access/refresh token rotation with automatic redirect on expiry
- bcrypt password hashing with legacy plaintext fallback detection
- TOTP 2FA with configurable enforcement
- File upload validation (type + size limits)
- noindex/nofollow on checkout and order pages
- Redis-cached API responses with TTL to prevent abuse
- Stripe webhook signature verification

---

## localStorage / sessionStorage Keys (Complete)

| Key | Type | Purpose |
|-----|------|---------|
| bs_order_cart | local | Cart items (name, steel, price, img, url, qty) |
| bs_checkout_cart | local | Stripe checkout cart (separate from main cart) |
| bs_chat_history | local | Chat conversation history |
| bs_visitor_id | local | Persistent visitor tracking ID |
| bs_age_verified | session | Age gate passed flag |
| bs_site_settings_cache_v2 | session | Cached site settings with TTL |
| bs_promo_ad_seen_{id} | session | Per-ad shown flag |
| bs_promo_ad_shown_any | session | Session-level promo flag |
| admin_theme | local | Dark/light theme preference |
| admin_sidebar_collapsed | local | Sidebar state |
| notifications_enabled | local | Bell toggle state |
| admin_avatar_url | local | Cached admin avatar |
| auth_token | local | JWT access token |
| refresh_token | local | JWT refresh token |
| auth_user | local | Current admin user object |
| session_id | local | Admin session tracking ID |
