1. e:\Main\index.html
Purpose: Homepage / landing page for the Forge Dominance knife brand.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
assets/css/colors.css
assets/css/shared.css
assets/css/products-components.css
assets/css/hero.css
assets/css/home.css
JS files loaded (in order):

Google Tag Manager (gtag.js inline)
assets/js/hero.js
assets/js/site-settings.js?v=20260527c
assets/js/age-gate.js?v=20260608
assets/js/main.js?v=20260527e
assets/js/tracker.js
Inline script (review section + homepage content loader)
Key HTML sections:

Custom cursor elements
Preloader with progress bar
Slide-out cart panel (overlay + panel markup)
Mobile nav overlay
Fixed nav bar with cart badge
Hero section with canvas background (#hcv)
Hunt collection grid (4 hunt-type cards)
Marquee/ticker band
Horizontal scroll featured blades section
Stats bar (animated counters)
Story/origin section
Testimonials section (hidden by default, dynamically loaded)
CTA section (commission call-to-action)
Footer with nav links
Sticky contact widget (live chat, email, WhatsApp FABs)
Special behavior:

Font preloading with document.fonts.load() + fallback timeout
Age gate via age-gate.js
Visitor tracking via tracker.js
Dynamic reviews section loaded from API on page load
Dynamic homepage content (hero headline, subtext, eyebrow, floats, stats) loaded from API
API endpoints referenced:

GET /api/settings/public/reviews -- loads review/testimonial data
GET /api/homepage-content -- loads dynamic hero + stats bar content
2. e:\Main\404.html
Purpose: Custom 404 "Page Not Found" error page.

CSS files loaded: None external -- all styles are inline in a <style> block. Loads Google Fonts via <link> (Bebas Neue, IBM Plex Mono, Outfit).

JS files loaded: None.

Key HTML sections:

Brand logo
Large "404" code display
"Page Not Found" heading and description
Links back to Home, Collection, and Commission
Special behavior: None. Fully static. noindex, nofollow robots directive.

API endpoints referenced: None.

3. e:\Main\pages\about.html
Purpose: Company "About Us" page with history timeline, founder bios, values, and workshop gallery.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/hero.css
../assets/css/about.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/about.js
../assets/js/site-settings.js?v=20260527c
../assets/js/age-gate.js?v=20260608
../assets/js/main.js?v=20260527e
../assets/js/tracker.js
Key HTML sections:

Cursor, preloader, cart panel, mobile nav, nav bar (reused pattern)
About hero with tagline
Timeline section (2010-2025 milestones)
Founders section (3 founder profile cards)
Values section ("The Four Absolutes")
Workshop gallery (5 images)
CTA section
Footer
Special behavior:

Age gate
Visitor tracking
API endpoints referenced: None directly in HTML/inline JS (relies on shared scripts).

4. e:\Main\pages\collection.html
Purpose: Product listing page (PLP) showing all knife categories with filtering.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/products-components.css
../assets/css/collection.css
JS files loaded (in order):

Google Tag Manager (inline)
Large inline <script> block (product logic, cart, chat, cursor, preloader, tilt effects)
../assets/js/site-settings.js?v=20260527c
../assets/js/age-gate.js?v=20260608
../assets/js/theme-manager.js
Key HTML sections:

Cursor, preloader, nav, cart panel, mobile nav
PLP hero with parallax background
Scarcity bar
Category tabs (Hunters, Camp & Trail, Skinning Knives, Folding Knives)
Product grid (populated via JS)
"Why No Direct Checkout" explanation section
Footer
Product modal (details overlay)
Sticky contact widget (chat, email, WhatsApp)
Special behavior:

Reads ?category= URL param to pre-select a tab
Skeleton loading states for product grid
Category aliases/normalization (maps multiple URL slugs to canonical keys)
Full cart management (localStorage-backed bs_order_cart)
Live chat widget with polling (/api/chat + /api/chat/poll/:id)
3D tilt effect on product cards
Custom cursor with ring-follow animation
IntersectionObserver for reveal animations
Parallax on hero background
Inline visitor tracking (pageview + beforeunload leave event)
API endpoints referenced:

GET /api/products/category/:categoryName (called for each of 4 categories)
POST /api/chat (send chat message)
GET /api/chat/poll/:visitorId (poll for admin replies)
POST /api/visitors/track (pageview + leave tracking)
5. e:\Main\pages\product.html
Purpose: Single product detail page (PDP), loaded dynamically by product ID from URL.

CSS files loaded (in order):

Google Fonts (Bebas Neue, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/products-components.css
JS files loaded (in order):

Large inline <script> block (product fetching, rendering, cart, gallery, cursor)
../assets/js/site-settings.js?v=20260527c
../assets/js/main.js?v=20260527e
../assets/js/tracker.js
Key HTML sections:

Cursor elements
Cart overlay and panel
Topbar with brand logo, cart button, and "Back to Collection" link
<main id="detailRoot"> -- content loaded dynamically
Special behavior:

Reads ?id= or ?product= query param to determine which product to fetch
Fetches product from API, then renders gallery, specs, story, comparison table, trust badges, CTA
Image gallery with prev/next arrows and thumbnail strip
"Add to Order" button adds to localStorage cart
Cart management (open, close, quantity slider, remove)
Cross-tab cart sync via storage event and visibilitychange
Custom cursor
Inline visitor tracking (pageview + leave)
No age gate on this page
API endpoints referenced:

GET /api/products/:id (fetch single product record)
POST /api/visitors/track (pageview + leave tracking)
6. e:\Main\pages\commission.html
Purpose: Custom knife commission request form page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/hero.css
../assets/css/order.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/order.js
../assets/js/site-settings.js?v=20260527c
../assets/js/age-gate.js?v=20260608
../assets/js/main.js?v=20260527e
../assets/js/tracker.js
Key HTML sections:

Cursor, preloader, cart panel, mobile nav, nav bar
Order hero (commission form intro)
Commission form with 3 sections:
Section 01: Personal details (name, email, phone with country select, country/region)
Section 02: Project brief (commission brief textarea, reference notes)
Section 03: Budget range slider ($300-$5000) + reference image upload
Right sidebar "Commission Snapshot" panel (live preview of inputs)
Success state (hidden until form submission)
Footer
Special behavior:

Multi-step form with live preview panel
Budget slider with visual meter
Phone number validation with country code picker
Reference image upload with filename display
Form submits via submitOrder() function (in order.js)
Age gate
API endpoints referenced: Submission handled by order.js (likely POSTs to an order/commission endpoint -- not visible in inline HTML).

7. e:\Main\pages\order.html
Purpose: Cart review / order page -- shows items added to cart and collects shipping details.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/hero.css
../assets/css/order.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/order.js
../assets/js/site-settings.js?v=20260529d
../assets/js/age-gate.js?v=20260608
../assets/js/main.js?v=20260529d
../assets/js/tracker.js
Key HTML sections:

Cursor, preloader, cart panel, mobile nav, nav bar
Order hero (review heading)
Order summary card showing selected products, count, and total
Contact/shipping form (name, email, phone, full address, optional notes)
Action buttons: "Chat on WhatsApp" and "Email Inquiry"
Process info (4-step "what happens next")
"Why No Direct Checkout" section
Footer
Special behavior:

Reads cart state from localStorage (bs_order_cart)
Displays selected products list with total
WhatsApp share and email inquiry buttons (assembled from form data via order.js)
Phone validation with country selector
Age gate
noindex, nofollow robots directive
API endpoints referenced: Handled by order.js (order submission logic).

8. e:\Main\pages\faq.html
Purpose: Frequently Asked Questions page with dynamically loaded FAQ items.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
Inline <script> block (fetches FAQ data)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero section (title, lead text, pills)
FAQ list container (<details> elements populated by JS)
Footer with full nav
Special behavior:

Fetches FAQ items from API on page load
Renders as expandable <details>/<summary> elements
First item opens by default
API endpoints referenced:

GET /api/faq -- returns array of question/answer objects
9. e:\Main\pages\press.html
Purpose: Press/media information page with brand context for journalists.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero (brand snapshot aside)
Info content grid (Media Requests, Product Facts, Brand Assets cards)
Footer
Special behavior: Fully static content. No dynamic loading.

API endpoints referenced: None.

10. e:\Main\pages\privacy.html
Purpose: Privacy policy page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero with "At a Glance" aside
Info content grid (What We Collect, How We Use It, Your Control)
Info note (additional guidance)
Footer
Special behavior: Static. noindex, follow robots directive.

API endpoints referenced: None.

11. e:\Main\pages\terms.html
Purpose: Terms and conditions page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero with "At a Glance" aside
Info content grid (Using the Site, Commission Orders, Content & Ownership)
Footer
Special behavior: Static. noindex, follow robots directive.

API endpoints referenced: None.

12. e:\Main\pages\warranty-policy.html
Purpose: Lifetime warranty policy explanation page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero with "At a Glance" aside
Info content grid (What Is Covered, How to Start a Claim, Common Limits)
Footer
Special behavior: Static content.

API endpoints referenced: None.

13. e:\Main\pages\shipping-info.html
Purpose: Shipping information and delivery expectations page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero with "At a Glance" aside
Info content grid (Processing Time, Delivery Regions, Tracking & Customs)
Footer
Special behavior: Static content.

API endpoints referenced: None.

14. e:\Main\pages\akti-compliance.html
Purpose: AKTI (American Knife & Tool Institute) compliance and responsible ownership page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero with "At a Glance" aside
Info content grid (Responsible Sales, Storage & Transport, Our Position)
Footer
Special behavior: Static content.

API endpoints referenced: None.

15. e:\Main\pages\blade-laws-by-state.html
Purpose: State-by-state knife law guidance page.

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../assets/css/colors.css
../assets/css/shared.css
../assets/css/info-pages.css
JS files loaded (in order):

Google Tag Manager (inline)
../assets/js/site-settings.js?v=20260527c
../assets/js/info-pages.js
Key HTML sections:

Mobile nav, nav bar
Info hero with "At a Glance" aside
Info content grid (Before You Travel, Common Differences, Our Advice)
Info note (legal disclaimer)
Footer
Special behavior: Static content.

API endpoints referenced: None.

16. e:\Main\pages\checkout\cart.html
Purpose: Shopping cart page (Stripe checkout flow step 1).

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../../assets/css/colors.css
../../assets/css/shared.css
../../assets/css/checkout.css
JS files loaded (in order):

../../assets/js/site-settings.js
Inline <script> block (cart rendering logic)
Key HTML sections:

Checkout nav with step indicator (Cart / Checkout / Confirmation)
Cart items container with empty state
Cart summary (subtotal, shipping free, total)
"Proceed to Checkout" button
Minimal footer
Special behavior:

Reads from localStorage key bs_checkout_cart (separate from the main bs_order_cart)
Renders cart items with quantity controls (+/-) and remove button
"Proceed to Checkout" navigates to checkout.html
noindex, nofollow robots directive
API endpoints referenced: None (client-side localStorage only).

17. e:\Main\pages\checkout\checkout.html
Purpose: Stripe checkout form page (step 2 of checkout flow).

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../../assets/css/colors.css
../../assets/css/shared.css
../../assets/css/checkout.css
JS files loaded (in order):

../../assets/js/site-settings.js
Inline <script> block (order summary render + Stripe session creation)
Key HTML sections:

Checkout nav with step indicator (step 2 active)
Two-column grid: checkout form (left) + order summary (right)
Form collects: email, first/last name, address, city, state, ZIP, country (US/CA)
"Pay with Stripe" submit button (shows "Processing..." while loading)
Order summary sidebar showing items from cart
Special behavior:

Redirects to cart.html if cart is empty
On form submit, POSTs cart items + email to API to create a Stripe Checkout session
Redirects browser to Stripe-hosted checkout URL on success
noindex, nofollow
API endpoints referenced:

POST /api/stripe/checkout/create-session -- body: { items, customerEmail, successUrl, cancelUrl }
18. e:\Main\pages\checkout\success.html
Purpose: Post-payment success confirmation page (step 3 of checkout flow).

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../../assets/css/colors.css
../../assets/css/shared.css
../../assets/css/checkout.css
JS files loaded (in order):

../../assets/js/site-settings.js
Inline <script> block (loads order details from Stripe session)
Key HTML sections:

Checkout nav with step indicator (step 3 active)
Success icon (checkmark circle)
"Order Confirmed" heading
Order details (status, email, amount paid -- populated dynamically)
Note about confirmation email
Action links: Return Home, Continue Shopping
Special behavior:

Reads ?session_id= URL param
Fetches session details from API to display email and amount
Clears bs_checkout_cart from localStorage after successful purchase
noindex, nofollow
API endpoints referenced:

GET /api/stripe/checkout/session/:sessionId -- returns { customerEmail, amountTotal, currency, status }
19. e:\Main\pages\checkout\cancel.html
Purpose: Payment cancelled/aborted page (user returned from Stripe without paying).

CSS files loaded (in order):

Google Fonts (Bebas Neue, Cormorant Garamond, IBM Plex Mono, Outfit)
../../assets/css/colors.css
../../assets/css/shared.css
../../assets/css/checkout.css
JS files loaded (in order):

../../assets/js/site-settings.js
Key HTML sections:

Checkout nav with step indicator (step 1 marked done only)
Cancel icon (X circle)
"Payment Cancelled" heading
Reassurance message (no charges)
Action links: Return to Cart, Continue Shopping
Special behavior: Fully static. Cart is preserved (not cleared). noindex, nofollow.

API endpoints referenced: None.

Summary of All API Endpoints Used Across the Site
Endpoint	Method	Used In
/api/settings/public/reviews	GET	index.html
/api/homepage-content	GET	index.html
/api/products/category/:name	GET	collection.html
/api/products/:id	GET	product.html
/api/chat	POST	collection.html
/api/chat/poll/:visitorId	GET	collection.html
/api/visitors/track	POST	collection.html, product.html, (tracker.js on other pages)
/api/faq	GET	faq.html
/api/stripe/checkout/create-session	POST	checkout/checkout.html
/api/stripe/checkout/session/:id	GET	checkout/success.html
Shared JS Files Across Pages
File	Pages Using It
site-settings.js	All pages except 404
age-gate.js	index, about, collection, commission, order
main.js	index, about, product, commission, order
tracker.js	index, about, product, commission, order
info-pages.js	faq, press, privacy, terms, warranty-policy, shipping-info, akti-compliance, blade-laws-by-state
order.js	commission, order
hero.js	index only
about.js	about only
theme-manager.js	collection only
Read e:\Main\assets\admin\css\products.css
Read e:\Main\assets\admin\css\logs.css
Here is the comprehensive summary of every file:

FRONTEND JS FILES
1. e:\Main\assets\js\main.js (~1877 lines)
Purpose: The primary frontend bundle. Handles page navigation, cart/order system, commission form, live chat widget, preloader, mobile nav, custom cursor, canvas ember particles, horizontal product collection, intersection observers, GA4 tracking, and visitor analytics.

Functions Defined:

Function	Purpose	Parameters
withLoading	Disables button, shows "Please wait...", runs async fn, restores	btn, asyncFn
showPage	SPA-like page navigation with route resolution and hash scrolling	id, anchorId
placeHuntSection (IIFE)	Re-positions hunt-collection section after hero	none
loadCartState	Reads cart from localStorage	none
saveCartState	Persists cart to localStorage	none
syncCartState	Reloads cart from storage into global	none
normalizeCartImage	Resolves relative image paths to absolute URLs	path
addToCart	Adds/increments cart item, triggers GA4, opens cart panel	name, steel, price, img, productUrl
removeFromCart	Removes item by name	name
changeQty	Increments/decrements item quantity	name, delta
setQtyBySlider	Sets quantity from range slider	name, qty
updateCartUI	Renders full cart DOM (items, subtotal, badge)	none
refreshCartAcrossPages	Syncs cart when returning to page or tab	none
openCart / closeCart	Toggles cart slide-out panel	none
goToOrder	Closes cart, navigates to order page	none
formatBudget	Formats number as $X,XXX	value
setBudget	Updates commission budget state + DOM	value
updateCommissionSummary	Mirrors form fields into summary section	none
getPhoneMaxLength	Parses length spec (number or "N-M")	lengthSpec
updatePhonePlaceholder	Sets phone input mask per selected country	none
validatePhoneInput	Real-time phone validation with custom validity	input
initPhoneInputs	Bootstrap phone input system	none
handleReferenceUpload	Handles reference image file input for commissions	input
submitOrder	Validates and POSTs commission form as multipart	none
getOrderFormData	Collects all order form fields into object	none
validateOrderForm	Validates required fields and email	data
submitOrderLead	POSTs order with items to backend	none
buildOrderShareMessage	Constructs multiline text summary for WhatsApp/email	none
shareOrderWhatsApp	Submits lead then opens WhatsApp deep link	none
shareOrderEmail	Submits lead then opens mailto link	none
resetOrder	Resets commission form to initial state	none
initCommissionPage	Wires up commission form listeners	none
renderSelectedProductsSummary	Renders order items summary list + updates OG tags	none
ensurePreloaderMarkup	Injects preloader HTML if missing	none
ensureStickyContactMarkup	Injects floating contact buttons + chat widget	none
readChatHistory / saveChatHistory / seedChatHistory	Chat history localStorage management	none / history
appendChatBubble	DOM: adds chat bubble	role, text
getChatVisitorId	Creates/returns unique visitor ID	none
getChatButton / ensureChatBadge	Gets chat FAB / ensures badge element	none
playChatSound	Plays 880Hz sine tone via Web Audio API	none
ensureToastContainer / showChatToast	Creates/shows floating toast notification	text
setChatUnreadCount / clearChatUnread	Manages unread count badge + page title	count
isChatOpen	Checks if chat widget is open	none
maybeRequestChatNotificationPermission	Requests browser notification permission	none
notifyChatReplies	Handles incoming admin messages (toast, sound, badge)	messages
pollChatReplies	Long-polls for admin replies	none
stopChatPolling / startChatPolling	Manages polling interval	none
renderChatHistory / bindChatDismiss / initChatWidget	Initializes chat widget	none
toggleChat	Toggles chat widget open/close	none
sendChat	Sends message to backend chat endpoint	none
toggleNav	Mobile hamburger nav toggle	none
runScrollWork / requestScrollWork	Nav solidification + parallax on scroll	none
initCanvas (IIFE)	Creates ember particle animation on hero canvas	none
esc	HTML-escapes a string	text
featuredTier / featuredSteel	Derives display labels from product data	product
imagePathFromRecord / resolveApiPath / normalizeFeaturedImageUrl / featuredImage	Image URL normalization pipeline	various
renderFeaturedCards	Renders product cards into horizontal scroll	products
loadFeaturedProducts	Fetches featured products from API	none
syncHS / calcHS / syncHSLoop	Horizontal scroll positioning (now static flex)	none
ensureVisitorId	Creates visitor tracking ID	none
trackVisitor	Sends visitor event to backend	action, meta
getCardScrollAmount	Calculates card width + gap for scroll buttons	none
trackProductView / trackAddToCart / trackCommissionSubmit / trackOrderPlace	GA4 event helpers	various
API Calls:

POST /api/commissions/public — commission form submission (multipart)
POST /api/orders/public — order lead submission (JSON)
GET /api/products/featured — featured products fetch
POST /api/chat — send chat message
GET /api/chat/poll/:visitorId — poll for chat replies
POST /api/visitors/track — visitor tracking events
Event Listeners:

storage event (cart sync across tabs)
visibilitychange (cart refresh, cursor, canvas, chat)
click (mobile card tap, chat dismiss, visitor tracking, anchor scrolls)
scroll (nav solid, parallax, scroll percent)
resize (canvas, horizontal scroll)
load (preloader, scroll)
mousemove, mouseover, mouseout (custom cursor, tilt cards, magnetic buttons)
beforeunload (visitor leave event)
bs:pagechange (custom event)
localStorage/sessionStorage Keys:

bs_order_cart (cart state)
bs_chat_history (chat messages)
bs_visitor_id (visitor identifier)
Dependencies: site-settings.js (via window.getBladesmithSiteSettings)

2. e:\Main\assets\js\site-settings.js (~363 lines)
Purpose: Fetches and applies site-wide configurable settings (brand name, contact info, WhatsApp number, age gate toggle, promotional ads). Updates DOM nodes with brand text, links, copyright, etc.

Functions Defined:

Function	Purpose	Parameters
normalizeSettings	Merges raw input with defaults, normalizes WhatsApp	input
readCachedSettings	Reads from sessionStorage with TTL check	none
writeCachedSettings	Writes to sessionStorage with timestamp	settings
updateTitle	Replaces brand names in document.title	siteName
updateAnchorLinks	Updates all mailto/WhatsApp links in DOM	settings
splitBrandHtml	Splits brand name into two halves with <span>	siteName
updateCommonBrandNodes	Updates all brand-displaying DOM nodes	siteName
applySettings	Master function: normalizes, caches, updates DOM, dispatches event	rawSettings
loadSettings	Loads from cache then fetches fresh from API	none
refreshSettings	Force-fetches latest settings	none
isAdminRoute	Checks if current page is admin	none
normalizePromoImageUrl	Normalizes promo ad image URLs	value
escapeHtml	HTML entity escaping	value
buildPromoMarkup	Constructs full promo modal DOM	ad
showPromoAd	Displays promo ad modal (once per session)	ad
initPromoAd	Fetches and shows promotional ads	none
API Calls:

GET /api/settings/public — fetch site settings
GET /api/promotions/ads/public — fetch promotional ads
Event Listeners:

storage event (key bs_site_settings_refresh)
bs:site-settings-force-refresh custom event
DOMContentLoaded (promo ad init)
keydown Escape (dismiss promo)
click (promo close/link)
sessionStorage Keys:

bs_site_settings_cache_v2 (cached settings with TTL)
bs_promo_ad_seen_{id} (per-ad seen flag)
bs_promo_ad_shown_any (session-level flag)
Exported Globals:

window.getBladesmithSiteSettings()
window.refreshBladesmithSiteSettings()
window.bladesmithSiteSettingsReady (Promise)
window.BladesmithSiteSettings (object)
3. e:\Main\assets\js\age-gate.js (~191 lines)
Purpose: Age verification gate. Prompts users to select birth month/year; if under 18, redirects to Google. Uses session storage to remember verification. Custom mobile select UI.

Functions Defined:

Function	Purpose	Parameters
initCustomSelects	Creates touch-friendly custom dropdown UIs	none
showGate	Displays the age gate, populates month/year options	none
hideGate	Hides the age gate	none
checkAge	Validates age from selected month/year	none
decide	Determines whether to show gate based on settings	settings
API Calls: None (relies on window.bladesmithSiteSettingsReady promise)

Event Listeners:

click on .ag-yes button (checkAge)
click on .ag-no button (redirect to Google)
click document (close custom selects)
keydown Escape (close custom selects)
sessionStorage Keys:

bs_age_verified — set to 'true' after passing
Dependencies: site-settings.js (for ageGateEnabled flag)

4. e:\Main\assets\js\hero.js (~77 lines)
Purpose: Lightweight canvas particle effect for the hero section. Draws rising ember particles with glow.

Functions Defined:

Function	Purpose	Parameters
resize	Resizes canvas to parent dimensions	none
createParticle	Creates a particle with random position/velocity	none
tick	Animation frame: updates and draws particles	none
init	Resizes canvas and starts animation loop	none
API Calls: None

Event Listeners:

resize (canvas resize)
DOMContentLoaded (init if loading)
Dependencies: None

5. e:\Main\assets\js\order.js (~1 line)
Purpose: Placeholder/scaffold. Contains only a comment: "Order section scaffold. The legacy bundle still owns the live form logic for now."

Functions: None

API Calls: None

Dependencies: main.js handles all order logic

6. e:\Main\assets\js\info-pages.js (~728 lines)
Purpose: Shared scaffold for sub-pages (about, order, etc.). Injects preloader, age gate, sticky contact, chat widget, custom cursor, mobile nav. Essentially a self-contained mini-version of main.js for non-homepage pages.

Functions Defined:

Function	Purpose	Parameters
ensurePreloaderMarkup	Injects preloader DOM	none
ensureAgeGateMarkup	Injects age gate DOM	none
ensureStickyContactMarkup	Injects floating contact widgets	none
initPreloader	Runs loading animation with failsafe	none
initAgeGate	Initializes age gate logic	none
initAgeGateCustomSelects	Custom mobile selects for age gate	gate
window.checkAge	Age verification logic (global)	none
window.toggleChat	Toggle chat widget (global)	none
window.sendChat	Send chat message (global)	none
readChatHistory / saveChatHistory / seedChatHistory	Chat history	none / history
appendChatBubble	DOM chat bubble	role, text
getChatVisitorId	Visitor ID management	none
maybeRequestChatNotificationPermission	Browser notification	none
notifyChatReplies / setChatUnreadCount	Unread management	various
playChatSound / showChatToast	Notification UX	text
pollChatReplies / startChatPolling	Chat polling	none
renderChatHistory / bindChatDismiss / initChatWidget	Chat init	none
ensureCursorMarkup / initCursor	Custom cursor setup	none
setNavOpen	Mobile nav state	nextState
API Calls:

POST /api/chat — send message
GET /api/chat/poll/:visitorId — poll replies
Event Listeners:

click (nav links, chat dismiss, sidebar close)
scroll (nav solidification)
visibilitychange (chat unread clear)
keydown Escape (custom selects)
mousemove, mouseenter, mouseleave (cursor)
localStorage/sessionStorage Keys:

bs_chat_history, bs_visitor_id, bs_age_verified
Dependencies: site-settings.js

7. e:\Main\assets\js\tracker.js (~233 lines)
Purpose: Advanced visitor tracking system. Class-based BladeSmithTracker that batches events and flushes every 10 seconds, tracks page views, clicks, form submissions, scroll depth, and page exits.

Functions/Methods Defined:

Method	Purpose	Parameters
constructor	Initializes visitor ID, session, starts tracking	none
getOrCreateVisitorId	Creates/returns persistent visitor ID	none
init	Attaches all event listeners and intervals	none
trackPageView	Queues pageview event	none
trackClick	Queues click event with element details	event
trackFormSubmit	Queues form submission event	event
trackPageExit	Queues exit event with time-on-page	none
onPageChange	Handles SPA navigation changes	none
onBeforeUnload	Tracks exit, flushes via beacon	none
sendPeriodicUpdate	Queues periodic heartbeat (30s)	none
flushQueue	Sends batched events via fetch	none
flushQueueBeacon	Sends batched events via sendBeacon	none
trackEvent	Public: queue custom named event	eventName, details
getVisitorInfo	Returns current visitor state	none
API Calls:

POST /api/visitors/track — event batch (fetch and sendBeacon)
Event Listeners:

click (all clicks + link navigation)
submit (form submissions)
beforeunload (page exit)
popstate (browser back/forward)
scroll (scroll depth tracking, throttled 250ms)
localStorage Keys:

bs_visitor_id
Exported Globals:

window.bsTracker (BladeSmithTracker instance)
window.trackBSEvent(name, details)
8. e:\Main\assets\js\theme-manager.js (~60 lines)
Purpose: Synchronizes dark/light theme across all pages via localStorage. Sets data-theme attribute on <html>.

Functions Defined:

Function	Purpose	Parameters
applyTheme	Sets or removes data-theme attribute	theme
initializeTheme	Reads stored theme and applies	none
Event Listeners:

storage (syncs theme changes from other tabs)
DOMContentLoaded (auto-init)
localStorage Keys:

admin_theme
Exported Global: window.ThemeManager with methods: init, apply, get, set

9. e:\Main\assets\js\about.js (~1 line)
Purpose: Placeholder. Contains only comment: "About section scaffold. Shared reveal behavior is handled by the legacy bundle."

Functions: None

Dependencies: main.js handles reveal animations

ADMIN JS FILES
10. e:\Main\assets\admin\js\api-service.js (~789 lines)
Purpose: Complete admin API service layer. Handles JWT token management, authenticated fetch wrapper with retry/timeout/dedup, and service objects for every backend resource.

Functions/Objects Defined:

Name	Purpose
safeParseJSON	Safely parse JSON with fallback
normalizeAuthResponse	Normalizes varying auth response shapes
readResponsePayload	Reads response as JSON or text
redirectToLogin	Clears tokens, sends session-expired beacon, redirects
TokenManager	Object managing access/refresh tokens in localStorage
apiCall	Deduplicating fetch wrapper
apiCallInner	Core fetch with JWT headers, retry, timeout, abort
AuthService	login, requestPasswordReset, resendResetCode, verifyResetCode, verifySMSOtp, resendTwoFactorCode, resetPassword, logout, isLoggedIn, getCurrentUser
DashboardService	getKPIs, getRevenueChart, getOrderStatusChart, getRecentOrders, getAnalytics
ProductsService	getAll, getFeatured, getById, create, update, delete, updateSortOrder
OrdersService	getAll, getByStatus, getById, create, update, updateStatus, delete
CommissionService	getAll, update, delete
CustomersService	getAll, getById, create, update, delete, addNote
PromotionsService	getAds, createAd, deleteAd, getCoupons, createCoupon, deleteCoupon, getAll, getById, create, update, delete, getCampaignRecipients, getCampaignQueue, deleteCampaignQueueEntry, sendCampaign
UploadsService	uploadImage, uploadAdImage, uploadReviewImage
SettingsService	getAll, update, save, testEmailConnection
UsersService	getAll, create, updateRole, updatePassword, delete
RolesService	getAll, create, update, delete
ThemesService	getAll, getById, create, update, delete
requireAuth	Guard: redirects to login if not authenticated
API Endpoints Used (all prefixed /api):

/auth/login, /auth/forgot-password, /auth/resend-reset-code, /auth/verify-reset-code, /auth/verify-2fa, /auth/resend-2fa, /auth/reset-password
/dashboard/kpis, /dashboard/revenue-chart, /dashboard/order-status-chart, /dashboard/recent-orders, /dashboard/analytics
/products, /products/featured, /products/:id, /products/sort-order
/orders, /orders/status/:status, /orders/:id, /orders/:id/status
/commissions, /commissions/:id
/customers, /customers/:id, /customers/:id/notes
/promotions, /promotions/:id, /promotions/ads, /promotions/ads/:id, /promotions/coupons, /promotions/coupons/:id, /promotions/ads/public, /promotions/campaign-recipients, /promotions/campaigns/queue, /promotions/campaigns/queue/:id, /promotions/campaigns/send
/uploads/upload-image, /uploads/upload-ad-image, /uploads/upload-review-image
/settings, /settings/test-email, /settings/roles, /settings/roles/:id, /settings/me
/themes, /themes/:id
/users, /users/:id, /users/:id/role, /users/:id/password
/tracking/admin/session-expired, /tracking/admin/logout
localStorage Keys:

auth_token, refresh_token, auth_user, session_id
11. e:\Main\assets\admin\js\products-v2.js (~718 lines)
Purpose: Admin products management page. Three-tab interface (Featured, All Products, Sort Order). Supports CRUD operations, multi-image upload with reorder/thumbnail selection, featured toggle with batch save, drag-and-drop sort order.

Functions Defined:

Function	Purpose	Parameters
setStatus	Updates status bar with optional toast	text, isError
setFieldValue	Sets form field value	id, value
stringifyJsonField	Converts value to JSON string for textarea	value
parseJsonField	Parses JSON textarea content	rawValue
loadCatalog	Fetches all products, caches, renders both panels	forceRefresh
normalizeProductsResponse	Extracts array from various response shapes	response
renderFeatured	Renders featured products list with toggle checkboxes	products
renderAll	Renders all-products list with edit/delete/featured	products
escapeHtml	HTML escaping	str
rebuildCategoryFilter	Rebuilds category filter dropdown	none
loadCategoryOptions	Populates category select in modal	selected
openAddModal	Opens add/edit product modal with pre-filled data	product
closeAddModal	Closes and resets modal	none
renderStagedImages	Renders image gallery with reorder/thumb/remove controls	none
normalizeThumbnailSelection	Ensures exactly one thumbnail selected	images
markFeaturedDraftState / currentFeaturedState / hasFeaturedDraftChanges	Featured draft state management	various
onFeaturedDraftToggle	Handler for featured checkbox change	ev
onSaveFeatured	Batch-saves featured changes	none
onResetFeatured	Resets featured draft to baseline	none
uploadStagedFiles	Uploads new files and returns normalized images array	none
onEditClick	Loads product and opens edit modal	ev
onDeleteClick	Confirms and deletes product	ev
loadSortOrderPanel	Loads products for sort order panel	none
renderSortCards	Renders draggable sort cards	items
attachSortDrag	Attaches drag-and-drop handlers	none
reorderDraft	Reorders sort draft array	fromId, toId
Various drag handlers	sdStart, sdEnd, sdOver, sdEnter, sdLeave, sdDrop, stStart, stMove, stEnd	
API Calls (via services):

ProductsService.getAll(1, 1000) — load all products
ProductsService.getById(id) — load single product
ProductsService.create(payload) — create product
ProductsService.update(id, payload) — update product
ProductsService.delete(id) — delete product
ProductsService.updateSortOrder(category, ids) — save sort order
UploadsService.uploadImage(file) — upload image file
Event Listeners:

click on tabs, add/close/cancel/save/reset buttons
change on category filter, featured checkboxes, file input
submit on add-form
dragstart, dragend, dragover, dragenter, dragleave, drop (sort cards)
touchstart, touchmove, touchend (mobile sort)
Dependencies: api-service.js (TokenManager, ProductsService, UploadsService, requireAuth), utils.js (Toast, escapeHtml)

12. e:\Main\assets\admin\js\utils.js (~450 lines)
Purpose: Shared admin UI utilities. Toast notifications, modal management, string/date formatting, DOM helpers, theme management, form utilities, page access control, sidebar toggle, mobile sidebar, notification toggle, user display.

Classes:

Class	Purpose
Toast	Static notification system (success/error/warning/info), toggleable via localStorage
Modal	Programmatic modal creation with overlay, close handling
Functions Defined:

Function	Purpose	Parameters
escapeHtml	HTML entity escaping	text
formatCurrency	Formats as USD currency	amount
formatDate	Short date format (Jan 1, 2024)	date
formatDateTime	Full date+time format	date
formatNumber	Number with commas	num
validateEmail	Email regex validation	email
validatePassword	Min 8 chars	pwd
$ / $$	querySelector / querySelectorAll shortcuts	selector
createEl	createElement with class and innerHTML	tag, className, innerHTML
show / hide / toggle	Toggles .hidden class	el
initSidebarToggle	Creates sidebar collapse button	none
ensureLiveChatSidebarLink	Injects Live Chat + Page Editor nav links	none
applyTheme	Sets data-theme attribute for light/dark	theme
saveThemePreference	Saves to localStorage	theme
initTheme	Applies stored theme on load	none
withLoading	Button loading state helper	btn, asyncFn
getFormData / setFormData / clearForm	Form data serialization	form, data
showFormError / clearFormErrors	Form validation error display	various
checkPageAccess	Checks user permissions for page	pageName
initializeUserDisplay	Shows user name/role/avatar in header	none
initMobileSidebar	Creates hamburger menu for mobile	none
initNotificationToggle	Adds bell toggle to header	none
API Calls:

GET /api/settings/me (fetch admin avatar)
Event Listeners:

DOMContentLoaded (auto-init theme, sidebar, mobile, user display)
storage (theme sync across tabs)
click (sidebar toggle, mobile overlay, nav links, notification toggle)
localStorage Keys:

admin_theme, admin_sidebar_collapsed, notifications_enabled, admin_avatar_url, auth_token
Exported Globals: All functions and classes exposed on window

BACKEND MODEL FILES
13. e:\Main\backend\models\Product.js
Table: products (main), product_images (related)

Products Fields:

id (auto)
name (text)
sku (text)
price (numeric)
compare_price (numeric)
stock (integer)
category (text)
description (text)
featured (boolean)
craft_story (text)
blade (text)
overall (text)
handle (text)
weight (text)
grind (text)
tang (text)
sort_order (integer, optional column)
recommended_use (text)
comparison_rows (jsonb)
trust_badges (jsonb)
features (jsonb, optional column)
specifications (jsonb, optional column)
descriptions (jsonb, optional column)
variants (jsonb, optional column)
display_options (jsonb, optional column)
created_at (timestamp)
updated_at (timestamp)
Product Images Fields:

product_id (FK)
image_url (text)
sort_order (integer)
is_thumbnail (boolean)
alt_text (text)
created_at, updated_at (timestamps)
Static Methods:

sortImages(images) — sorts by thumbnail flag then sort_order
normalizeImageRow(image, index) — normalizes a single image record
normalizeImages(images) — normalizes array with single thumbnail
syncImages(productId, images) — deletes old, inserts new images
fetchImagesForProduct(productId) — gets all images for product
attachImages(product) — attaches images array to product
attachImagesToProducts(products) — bulk image attachment
pickThumbnailUrl(product, images) — selects best thumbnail URL
attachThumbnailsToProducts(products) — adds thumbnail_url to list view
create(data) — inserts product + syncs images
findAll(limit, offset) — paginated list with thumbnails
findAllWithThumbnails(limit, offset) — core list query
findById(id) — single product with full images
update(id, data) — updates product + syncs images if provided
delete(id) — deletes product
getFeatured() — featured products with thumbnails
getByCategory(category) — category filter with thumbnails
getTotalCount() — count of all products
updateSortOrder(orderedIds) — bulk sort order update
DB Queries: SELECT (with range, eq, in, order), INSERT, UPDATE, DELETE on products and product_images

14. e:\Main\backend\models\Order.js
Table: orders

Fields:

id (auto)
customer_id (FK to customers)
status (text)
total (numeric)
items (text/JSON stringified)
created_at (timestamp)
updated_at (timestamp)
Static Methods:

create(data) — inserts order with JSON-stringified items
findAll(limit, offset) — paginated list, parses items JSON
findById(id) — single order with parsed items
updateStatus(id, status) — updates status only
update(id, data) — updates any fields, stringifies items
getByStatus(status, limit, offset) — filtered by status
getTotalRevenue() — sum of completed order totals
getCompletedStats() — count + revenue of completed orders
getTotalCount() — count all orders
delete(id) — deletes order
15. e:\Main\backend\models\Customer.js
Tables: customers, customer_notes

Customer Fields:

id (auto)
name (text)
email (text)
phone (text)
address (text)
address_line2 (text)
city (text)
state (text)
zip (text)
country (text)
created_at (timestamp)
Customer Notes Fields:

customer_id (FK)
note (text)
created_at (timestamp)
Static Methods:

create(data) — inserts customer
findAll(limit, offset) — paginated list with aggregated order count + total_spent (optimized single query for all orders)
findById(id) — single customer with order stats
findByEmail(email) — lookup by email
update(id, data) — updates customer fields
getTotalCount() — count all customers
addNote(customerId, note) — inserts note
getNotes(customerId) — gets all notes for customer
delete(id) — deletes customer
16. e:\Main\backend\models\Commission.js
Table: commissions

Fields:

id (auto)
full_name (text)
email (text)
phone (text, nullable)
country (text, nullable)
country_code (text, nullable)
brief (text)
budget (numeric, nullable)
reference_image_url (text, nullable)
reference_image_path (text, nullable)
status (text, default 'new')
source (text, default 'website')
notes (text, nullable)
created_at (timestamp)
updated_at (timestamp)
Static Methods:

create(data) — inserts commission
findAll(limit, offset) — paginated list
findById(id) — single commission
update(id, updates) — updates any fields
delete(id) — deletes commission
17. e:\Main\backend\models\User.js
Table: users

Fields:

id (auto)
email (text)
password (text, bcrypt hashed)
role (text, default 'admin')
created_at (timestamp)
Static Methods:

create(email, password, role) — inserts user with bcrypt-hashed password
findByEmail(email) — returns full user record (includes password)
findById(id) — returns user without password
verifyPassword(password, hashedPassword) — bcrypt compare (also supports plaintext legacy)
updatePassword(userId, newPassword) — re-hashes and updates
updateRole(userId, role) — updates role
getAll() — returns all users (no password)
delete(userId) — deletes user
Dependencies: bcryptjs

BACKEND LIB FILES
18. e:\Main\backend\lib\emailTemplates.js
Purpose: Generates branded HTML email templates for order and commission confirmations.

Exported Functions:

getOrderConfirmationEmail(order) — returns { subject, html } for order confirmation email
getCommissionConfirmationEmail(commission) — returns { subject, html } for commission confirmation email
Dependencies: None (pure string generation)

19. e:\Main\backend\lib\siteSettings.js
Purpose: Server-side site settings management. Loads from Supabase (site_settings or admin_settings table), caches in memory, falls back to JSON file on disk.

Exported Functions:

getCachedSiteSettings() — returns cached settings or null
getSiteSettingsSnapshot() — returns cached or file-fallback settings
loadSiteSettingsFromStorage() — loads from DB (site_settings > admin_settings > file fallback)
normalizeSiteSettings(input) — normalizes raw input to standard shape
primeSiteSettingsCache() — loads from DB and populates cache
saveSiteSettings(input) — upserts to site_settings table (id=1), updates cache and file
setCachedSiteSettings(settings) — manually sets cache
readFallbackSiteSettings() — reads JSON file fallback
writeFallbackSiteSettings(settings) — writes JSON file fallback
SITE_SETTINGS_STORE_FILE — path constant
DEFAULT_SITE_SETTINGS — defaults object
cachedSiteSettingsAt() — returns cache timestamp
Dependencies: fs, path, ../config/supabase, ./dbUtils

20. e:\Main\backend\lib\totp.js
Purpose: TOTP (Time-based One-Time Password) implementation for 2FA. RFC 6238 compliant, SHA1, 6 digits, 30-second window.

Exported Functions:

generateSecret(length = 20) — generates random base32-encoded secret
verifyTOTP(token, secret, window = 1) — verifies a TOTP code against secret with +/- window steps
generateKeyURI(email, issuer, secret) — generates otpauth:// URI for QR codes
Internal Functions:

base32Decode(encoded) — decodes base32 to Buffer
generateTOTP(secret, timeStep, digits, offset) — generates TOTP for given time offset
Dependencies: crypto (Node.js built-in)

21. e:\Main\backend\lib\dbUtils.js
Purpose: Single utility for detecting "missing table" Supabase errors to allow graceful degradation.

Exported Functions:

isMissingTableError(error) — returns true if error indicates table/relation doesn't exist (but NOT for missing columns)
Dependencies: None

22. e:\Main\backend\lib\imageCache.js
Purpose: Converts base64 data URIs into cached static files on disk, enabling efficient serving of product thumbnails.

Exported Functions:

isDataUrl(str) — returns true if string is a data: URI
cacheDataUrlToFile(dataUrl) — parses data URI, writes to assets/products/{sha1hash}.{ext}, returns web path /assets/products/{filename}
Internal Functions:

parseDataUrl(dataUrl) — extracts mime and base64 from data URI
extForMime(mime) — maps mime type to file extension
Dependencies: fs, path, crypto

Read e:\Main\assets\admin\css\editor.css
Here is the comprehensive structured summary of all files:

ROUTE FILES
e:\Main\backend\routes\dashboard.js
Method	Path	Auth	Body	Response	Cache
GET	/kpis	yes (authenticate)	none	{totalRevenue, totalOrders, totalCustomers, totalProducts, conversionRate}	dashboard:kpis (60s TTL via Redis)
GET	/revenue-chart	yes (authenticate)	none; query: period (7d/30d/90d)	[{day, revenue}]	dashboard:revenue:{period} (120s)
GET	/order-status-chart	yes (authenticate)	none	[{status, count}]	dashboard:order-status (60s)
GET	/recent-orders	yes (authenticate)	none	[{...order, customer_name}]	dashboard:recent-orders (30s)
GET	/analytics	yes (authenticate)	none	{kpis, revenueChart, orderStatus, topCustomers}	dashboard:analytics (120s)
e:\Main\backend\routes\promotions.js
Method	Path	Auth	Body	Response	Cache
GET	/ads/public	no	none	{data: [normalizedAdRecord]}	promotions:ads:public (180s)
GET	/ads	yes (authenticate)	none	{data: [normalizedAdRecord]}	promotions:ads:admin (60s)
POST	/ads	yes (authenticate + admin)	{title*, image_url*, image_path, click_url, status, description, badge, kicker, cta_label, perk_1, perk_2, perk_3, price, compare_price}	normalizedAdRecord	Clears: promotions:active, promotions:ads:public, promotions:ads:admin, promotions:coupons
DELETE	/ads/:id	yes (authenticate + admin)	none	{message: "Ad deleted"}	Clears active promo caches
GET	/coupons	yes (authenticate)	none	{data: [coupon]}	promotions:coupons (120s)
POST	/coupons	yes (authenticate + admin)	{code*, coupon_type, amount, usage_limit, expires_at, is_active, notes}	coupon object	none
DELETE	/coupons/:id	yes (authenticate + admin)	none	{message: "Coupon deleted"}	none
GET	/active	no	query: type (default "ad")	{data: [promotion]}	promotions:active:{type} (120s)
GET	/	yes (authenticate)	none	{data: [promotion]}	promotions:all (60s Redis + in-memory fallback)
POST	/	yes (authenticate + admin)	{title, type, code, discount, max_uses, expires_at, image_url, image_path, link, is_active, notes}	promotion object	Clears active promo caches
GET	/:id	yes (authenticate + admin)	none	promotion object	none
PUT	/:id	yes (authenticate + admin)	{title, type, code, discount, max_uses, expires_at, image_url, image_path, link, is_active, notes}	promotion object	Clears active promo caches
DELETE	/:id	yes (authenticate + admin)	none	{message: "Promotion deleted"}	Clears active promo caches
GET	/campaign-recipients	yes (authenticate + admin)	none	{data: {grouped, totalUniqueEmails, recipients}}	promotions:campaign:recipients (60s)
POST	/campaigns/send	yes (authenticate + admin)	{subject*, content*, recipients*: [{sourceTable, sourceId, email}]}	{message, jobId, total} (202 Accepted)	none
GET	/campaigns/status/:jobId	yes (authenticate + admin)	none	{jobId, status, total, processed, sent, failed, startedAt, completedAt, results}	none (in-memory Map)
GET	/campaigns/queue	yes (authenticate + admin)	none	{data: [campaign_email_log]}	none
DELETE	/campaigns/queue/:id	yes (authenticate + admin)	none	`{success: true, source: "database"	"fallback"}`
DB Tables: promotions, ads, coupons, campaign_email_logs, orders, customers, commissions, admin_settings, admins, smtp_credentials

e:\Main\backend\routes\settings.js
Method	Path	Auth	Body	Response	Cache
GET	/	yes (authenticate)	query: fresh=1 to skip cache	{data: {settings merged}, updatedAt}	settings:global (60s)
GET	/public	no	none	{data: {siteName, contactEmail, whatsappNumber, ...siteSettings, ageGateEnabled}}	none (uses cached site settings)
GET	/public/reviews	no	none	{data: reviewSection}	settings:public:reviews (300s)
GET	/me	yes (authenticate)	none	{data: {admin preferences}}	none
PUT	/me	yes (authenticate)	{...preferences}	{data: prefs, fallback: bool}	none
PUT	/	yes (authenticate + admin)	{require2FA, authType, sessionTimeout, senderName, senderEmail, appPassword, smtpHost, smtpPort, smtpEncryption, gaMeasurementId, gaApiSecret, superAdmin, reviewSection, roles, theme, ageGateEnabled, stripe, siteName, contactEmail, whatsappNumber, whatsappMessage, supportName, supportLabel, removeCredentials}	{data: settings, updatedAt, fallback}	Clears: settings:global, settings:public:reviews, settings:roles
POST	/test-email	yes (authenticate + admin)	{senderEmail, appPassword, smtpHost, smtpPort, smtpEncryption, senderName, testEmail}	{message: "SMTP connection verified..."}	none
GET	/session-config	yes (authenticate)	none	{data: {sessionTimeoutSeconds, sessionTimeoutMinutes}}	none
GET	/roles	yes (authenticate)	none	{data: [{id, name, permission}]}	none (uses in-memory cache)
POST	/roles	yes (authenticate + superadmin)	{name*, permissions*}	{id, name, permission}	Clears settings:global
PUT	/roles/:id	yes (authenticate + superadmin)	{name*, permissions*}	{id, name, permission}	Clears settings:global
DELETE	/roles/:id	yes (authenticate + superadmin)	none	{message: "Role deleted"}	Clears settings:global
DB Tables: admin_settings, admins, smtp_credentials, site_settings

e:\Main\backend\routes\themes.js
Method	Path	Auth	Body	Response	Cache
GET	/	yes (authenticate)	none	{data: [theme]}	none
GET	/:id	yes (authenticate)	none	theme object	none
POST	/	yes (authenticate + admin)	{name*, config*} (config must be object)	theme object	none
PUT	/:id	yes (authenticate + admin)	{name*, config*}	theme object	none
DELETE	/:id	yes (authenticate + admin)	none	{message: "Theme deleted"}	none
DB Tables: themes

e:\Main\backend\routes\editor.js
Method	Path	Auth	Body	Response	Cache
GET	/	yes (authenticate)	query: pageKey (default "index")	{pageKey, content, updatedAt}	none
POST	/	yes (authenticate + admin)	{pageKey, content}	{message, pageKey, updatedAt}	none
GET	/page	yes (authenticate)	query: file (e.g. "index.html")	{html, file}	none
POST	/save	yes (authenticate + admin)	{file*, html*}	{ok: true, file, savedAt}	none
GET	/backups	yes (authenticate)	query: file	{backups: [filenames]}	none
DB Tables: editor_content
File System: Reads/writes HTML files from project root; writes backups to backups/editor/; fallback store at assets/uploads/editor-content-store.json
Allowed files: index.html, pages/collection.html, pages/product.html, pages/about.html, pages/commission.html, pages/faq.html

e:\Main\backend\routes\visitors.js
Method	Path	Auth	Body	Response	Cache
POST	/track	no	{events: [{visitorId, path, action, meta}]} or single {visitorId, path, action, meta}	{ok: true, count}	none
GET	/stream	no	none	SSE stream (text/event-stream)	none
GET	/events	yes (authenticate)	query: limit, offset, since (e.g. "7d")	{data: [event], total, limit, offset}	visitors:events:{limit}:{offset}:{since} (30s)
GET	/summary	yes (authenticate)	query: since (default "7d")	{data: [{id, ip, lastSeen, pageViews, actions, uniquePaths, paths, durationMs, durationMinutes, timeline}]}	visitors:summary:{since} (60s)
GET	/summary-by-ip	yes (authenticate)	query: since (default "7d")	{data: [{ip, count, pageViews, actions, uniquePaths, paths, durationMs, lastSeen, timeline, visitors}]}	visitors:summary-by-ip:{since} (60s)
DB Tables: visitor_events

e:\Main\backend\routes\tracking.js
Method	Path	Auth	Body	Response	Cache
POST	/admin/login	yes (authenticate)	none (uses req.user)	{ok: true, session}	none
POST	/admin/logout	yes (authenticate)	{sessionId}	{ok: true, updated, sessionId}	none
POST	/admin/action	yes (authenticate)	{sessionId, action, details}	{ok: true}	none
GET	/admin/history	yes (authenticate)	query: dayOffset (0-6)	{data: [login_activity]}	none
DELETE	/admin/history/:id	yes (authenticate + superadmin)	none	{ok: true, deleted}	none
DELETE	/admin/history	yes (authenticate + superadmin)	query: dayOffset	{ok: true, deleted}	none
GET	/admin/history/raw	yes (authenticate + superadmin)	query: limit (default 1000, max 5000)	{data: [login_activity]}	none
GET	/admin/history/week	yes (authenticate + superadmin)	none	{data: [login_activity]}	none
DELETE	/admin/history/cleanup	yes (authenticate + superadmin)	none	{ok: true, deleted}	none
POST	/track-page	no	{visitorId, page, action, details, timeSpent}	{ok: true}	none
GET	/track-summary	yes (authenticate)	none	[user_tracking rows]	none
GET	/track-details/:visitorId	yes (authenticate)	none	[user_page_events rows]	none
DB Tables: admin_login_activity, user_page_events, user_tracking

e:\Main\backend\routes\users.js
Method	Path	Auth	Body	Response	Cache
GET	/	yes (authenticate + admin)	none	{data: [users]}	none
POST	/	yes (authenticate + admin)	{email*, password, role}	{data: user}	none
PATCH	/:id/role	yes (authenticate + admin, superadmin check)	{role*}	{data: user}	none
PATCH	/:id/password	yes (authenticate + admin, superadmin check)	{password*}	{data: user}	none
DELETE	/:id	yes (authenticate + admin, superadmin check)	none	{message: "User deleted"}	none
DB Tables: Uses User model (likely admin_users table)

e:\Main\backend\routes\uploads.js
Method	Path	Auth	Body	Response	Cache
POST	/upload-image	yes (authenticate + admin)	multipart image file	{success, filename, path, url}	none
POST	/upload-base64	yes (authenticate + admin)	{image: "base64 string", filename}	{success, filename, path, url}	none
POST	/upload-ad-image	yes (authenticate + admin)	multipart image file	{success, filename, path, url}	none
POST	/upload-review-image	yes (authenticate + admin)	multipart image file	{success, filename, path, url}	none
POST	/upload-admin-avatar	yes (authenticate + admin)	multipart image file	{success, filename, path, url}	none
File System: Writes to assets/products/, assets/uploads/ad/, assets/uploads/reviews/, assets/uploads/admin/

e:\Main\backend\routes\commissions.js
Method	Path	Auth	Body	Response	Cache
GET	/	yes (authenticate + admin)	none	{data: [commission]}	none
POST	/public	no	multipart form with reference_image file + {firstName*, lastName*, email*, phone, country, countryCode, brief*, budget}	{data: commission}	none
PUT	/:id	yes (authenticate + admin)	{...updates}	{data: commission}	none
DELETE	/:id	yes (authenticate + admin)	none	{message: "Commission deleted"}	none
DB Tables: commissions (via Commission model), customers (via Customer model), admin_settings
File System: Uploads to assets/uploads/commissions/; generates PDFs in assets/uploads/commissions/pdf/; fallback store at assets/uploads/commissions/commissions-store.json
Side Effects: Sends confirmation email with PDF attachment on creation; creates customer record if new email

e:\Main\backend\routes\chat.js
Method	Path	Auth	Body	Response	Cache
POST	/	no	{message*, visitorId*} (message max 1000 chars)	`{reply: string	null, conversationId}`
GET	/poll/:visitorId	no	none	{messages: [{id, message, created_at}]}	chat:poll:{visitorId} (8s)
GET	/conversations	yes (authenticate + admin)	query: status (default "open")	{conversations: [{...convo, unread_count}]}	chat:conversations:{status} (15s)
GET	/conversations/:id/messages	yes (authenticate + admin)	none	{messages: [message]}	none
POST	/conversations/:id/reply	yes (authenticate + admin)	{message*}	{success: true}	none
PATCH	/conversations/:id/close	yes (authenticate + admin)	none	{success: true}	none
DELETE	/conversations/:id	yes (authenticate + admin)	none	{success: true}	none
DB Tables: chat_conversations, chat_messages

e:\Main\backend\routes\faq.js
Method	Path	Auth	Body	Response	Cache
GET	/	no	none	[{id, question, answer, open}]	none
PUT	/	yes (authenticate)	[{id, question, answer, open}] (array)	{ok: true, count}	none
POST	/	yes (authenticate)	{question*, answer*}	{ok: true, item}	none
PUT	/:id	yes (authenticate)	{question, answer, open}	{ok: true, item}	none
DELETE	/:id	yes (authenticate)	none	{ok: true}	none
POST	/reorder	yes (authenticate)	{ids*: [string]}	{ok: true}	none
File System: assets/data/faq.json (no DB)

e:\Main\backend\routes\homepage-content.js
Method	Path	Auth	Body	Response	Cache
GET	/	no	none	{...homepage content object}	none
PUT	/	yes (authenticate)	{...content fields} (merged with existing)	{ok: true, data: merged}	none
File System: assets/data/homepage.json (no DB)

e:\Main\backend\routes\stripe.js
Method	Path	Auth	Body	Response	Cache
POST	/checkout/create-session	no	{items*: [{name, image, price, quantity}], successUrl, cancelUrl, customerEmail}	{sessionId, url}	none
GET	/checkout/session/:id	no	none	{id, status, customerEmail, amountTotal, currency, lineItems}	none
POST	/webhook	no (Stripe signature verification)	raw body (Stripe event)	{received: true}	none
GET	/config/public	no	none	{enabled, publishableKey, currency}	none
DB Tables: admin_settings (reads stripe config from global settings)

CONTROLLER FILES
e:\Main\backend\controllers\productController.js
Functions:

Function	DB Tables Queried	Cache
getAll(req, res)	products (via Product.findAll, Product.getTotalCount)	products:all:{limit}:{offset} (120s)
getById(req, res)	products, product_images (via Product.findById, Product.attachImages)	products:{id} (120s)
create(req, res)	products, product_images (via Product.create, Product.attachThumbnailsToProducts)	Invalidates all product caches
update(req, res)	products, product_images (via Product.update, Product.attachThumbnailsToProducts)	Invalidates all product caches
delete(req, res)	products (via Product.delete)	Invalidates all product caches
getFeatured(req, res)	products, product_images (via Product.getFeatured, Product.attachThumbnailsToProducts)	products:featured (300s)
getByCategory(req, res)	products, product_images (via Product.getByCategory, Product.attachThumbnailsToProducts)	products:category:{category} (120s)
updateSortOrder(req, res)	products (via Product.updateSortOrder)	Invalidates all product caches
invalidateProductCaches(id)	none (cache invalidation only)	Deletes multiple Redis keys
Valid Categories: Hunters, Camp & Trail, Skinning Knives, Folding Knives

e:\Main\backend\controllers\orderController.js
Functions:

Function	DB Tables Queried	Cache
getAll(req, res)	orders (via Order.findAll, Order.getTotalCount), customers	orders:list:{limit}:{offset} (20s)
getById(req, res)	orders (via Order.findById), customers (via Customer.findById)	orders:single:{id} (30s)
create(req, res)	orders (via Order.create), customers (via Customer.findByEmail, Customer.create)	none
updateStatus(req, res)	orders (via Order.updateStatus), customers, smtp_credentials, admin_settings	none; sends confirmation email on status="confirmed"
update(req, res)	orders (via Order.findById, Order.update), customers (via Customer.update)	none
getByStatus(req, res)	orders (via Order.getByStatus), customers	orders:status:{status}:{limit}:{offset} (20s)
delete(req, res)	orders (via Order.delete)	Deletes orders:single:{id}, orders:list:20:0, orders:list:200:0
enrichOrder(order)	customers (via Customer.findById)	none (helper)
fetchCustomersByIds(ids)	customers	none (helper)
e:\Main\backend\controllers\customerController.js
Functions:

Function	DB Tables Queried	Cache
getAll(req, res)	customers (via Customer.findAll, Customer.getTotalCount)	customers:list:{limit}:{offset} (60s)
getById(req, res)	customers (via Customer.findById), customer_notes (via Customer.getNotes)	customers:single:{id} (60s)
create(req, res)	customers (via Customer.create)	none
update(req, res)	customers (via Customer.update)	none
delete(req, res)	customers (via Customer.delete)	none
addNote(req, res)	customer_notes (via Customer.addNote)	none
e:\Main\backend\controllers\authController.js
Functions:

Function	DB Tables Queried	Cache
register(req, res)	admin_users (via User.findByEmail, User.create)	none
login(req, res)	admin_users (via User.findByEmail, User.verifyPassword)	none
refreshToken(req, res)	admin_users (via User.findById)	none
getProfile(req, res)	admin_users (via User.findById)	none
logout(req, res)	none	none
Response Shapes:

register: {message, user: {id, email, role}, accessToken, refreshToken}
login: {message, user: {id, email, role}, accessToken, refreshToken}
refreshToken: {accessToken}
getProfile: user object (without password)
logout: {message: "Logout successful"}
e:\Main\backend\controllers\dashboardController.js
Functions:

Function	DB Tables Queried	Cache
getKPIs(req, res)	orders (via Order.getCompletedStats), customers (via Customer.getTotalCount), products (via Product.getTotalCount)	dashboard:kpis (60s)
getRevenueChart(req, res)	orders (direct Supabase query with status=completed and date filter)	dashboard:revenue:{period} (120s)
getOrderStatusChart(req, res)	orders (count by status for pending, processing, completed, shipped, cancelled)	dashboard:order-status (60s)
getRecentOrders(req, res)	orders (via Order.findAll, limit 10), customers	dashboard:recent-orders (30s)
getAnalytics(req, res)	orders (via Order.getCompletedStats, Order.getByStatus), customers (via Customer.getTotalCount, Customer.findAll), products (via Product.getTotalCount)	dashboard:analytics (120s)
e:\Main\backend\controllers\uploadController.js
Functions:

Function	Destination Directory	Notes
uploadImage	assets/products/	Multer single file "image"; max 5MB; JPEG/PNG/WebP/GIF only
uploadBase64	assets/products/	Accepts base64 data URI or raw base64 string
uploadAdImage	assets/uploads/ad/	File prefix: "ad-"
uploadReviewImage	assets/uploads/reviews/	File prefix: "review-"
uploadAdminAvatar	assets/uploads/admin/	File prefix: "avatar-"
All upload functions return: {success: true, filename, path, url} on success, or {success: false, error} on failure.

No DB queries -- purely filesystem operations.

SUMMARY OF ALL DB TABLES REFERENCED
Table	Used By
products	productController, dashboardController
product_images	productController
orders	orderController, dashboardController, promotions (campaign recipients)
customers	customerController, orderController, dashboardController, promotions, commissions
customer_notes	customerController
admin_users	authController, users route (via User model)
admin_settings	settings, promotions, commissions, stripe, dashboardController (indirect)
admins	settings, promotions
smtp_credentials	settings, promotions, orderController
promotions	promotions route
ads	promotions route
coupons	promotions route
campaign_email_logs	promotions route
commissions	commissions route, promotions (campaign recipients)
themes	themes route
editor_content	editor route
visitor_events	visitors route
admin_login_activity	tracking route
user_page_events	tracking route
user_tracking	tracking route
chat_conversations	chat route
chat_messages	chat route
site_settings	settings route (via siteSettings lib)
SUMMARY OF ALL REDIS CACHE KEYS
Key Pattern	TTL	Source
dashboard:kpis	60s	dashboardController
dashboard:revenue:{period}	120s	dashboardController
dashboard:order-status	60s	dashboardController
dashboard:recent-orders	30s	dashboardController
dashboard:analytics	120s	dashboardController
products:all:{limit}:{offset}	120s	productController
products:{id}	120s	productController
products:featured	300s	productController
products:category:{category}	120s	productController
orders:list:{limit}:{offset}	20s	orderController
orders:single:{id}	30s	orderController
orders:status:{status}:{limit}:{offset}	20s	orderController
customers:list:{limit}:{offset}	60s	customerController
customers:single:{id}	60s	customerController
settings:global	60s	settings route
settings:public:reviews	300s	settings route
settings:roles	60s	settings route
promotions:active	120s	promotions route
promotions:active:{type}	120s	promotions route
promotions:all	60s	promotions route
promotions:ads:public	180s	promotions route
promotions:ads:admin	60s	promotions route
promotions:coupons	120s	promotions route
promotions:campaign:recipients	60s	promotions route
visitors:events:{limit}:{offset}:{since}	30s	visitors route
visitors:summary:{since}	60s	visitors route
visitors:summary-by-ip:{since}	60s	visitors route
chat:poll:{visitorId}	8s	chat route
chat:conversations:{status}	15s	chat route
Read e:\Main\admin\products-v2.html
Read e:\Main\admin\orders.html
Read e:\Main\admin\analytics.html
Read e:\Main\admin\chat.html
Good progress. Three of my five agents have completed successfully. Let me continue reading the remaining admin HTML files and wait for the CSS agent.

Read e:\Main\admin\logs.html
Read e:\Main\admin\settings.html
Read e:\Main\admin\editor.html
Read e:\Main\admin\promotions.html
Now let me read the migration files to understand the database schema and the .env.example file.

Read e:\Main\backend\migrations\001_initial_schema.sql
Read e:\Main\backend\.env.example
Read e:\Main\backend\migrations\002_commissions.sql
Read e:\Main\backend\migrations\003_visitor_events.sql
Read e:\Main\backend\migrations\004_admin_tracking_promotions.sql
Read e:\Main\backend\migrations\006_ads_coupons_split.sql
Read e:\Main\backend\migrations\006_admin_login_tracking.sql
Read e:\Main\backend\migrations\008_chat_conversations.sql
Read e:\Main\backend\migrations\20260527_create_site_settings.sql
Read e:\Main\backend\migrations\20260531_add_totp_fields.sql
I now have comprehensive data from all agents and my direct reads. The CSS agent is still running — I have enough data to write the full architecture document. Let me compile everything into the final document.

Read e:\Main\backend\migrations\20260527_add_ad_premium_fields.sql
Read e:\Main\backend\migrations\20260529_add_customer_location_fields.sql
Now I have enough data to write the complete architecture document. Let me compose it.

Here is the comprehensive summary of every CSS file in the project:

PUBLIC CSS FILES
1. e:\Main\assets\css\colors.css
Line count: 71
Purpose: Global design token definitions. The single source of truth for the project's color palette and opacity variants.
Key selectors: :root
CSS variables DEFINED (all):
Backgrounds: --bg, --l1, --l2, --l3, --l4
Brand: --ember, --ember-lt, --ember-dk, --glow, --glow2
Text: --plat, --silver, --ash
Borders: --faint, --faint2, --border-e
Radius: --r
Gold accents: --gold, --gold-lt, --gold-dk
Ember opacity scale: --ember-strong, --ember-med, --ember-soft, --ember-soft-40 through --ember-soft-02, --ember-transparent, --ember-glow-25
White opacity: --white-18, --white-15, --white-10, --white-02, --white-055, --white-025
Black opacity: --black-98 through --black-05
Shadows: --shadow-45, --shadow-55, --shadow-60
Gold opacity: --gold-soft-20, --gold-soft-50, --gold-shadow-10
Green (WhatsApp): --green-soft-09, --green-soft-18, --green-border-28, --green-border-60
Error: --red-71
CSS variables used from other files: None (this is the root source)
Media queries: None
Notes: Purely a variable definitions file. No selectors beyond :root.
2. e:\Main\assets\css\shared.css
Line count: 274
Purpose: Base reset, global UI chrome (preloader, age gate, navigation, cart panel, mobile nav, sticky contact/chat widget, section utilities, footer, buttons, reveal animations, page system).
Key selectors:
Reset: *, html, body, img, a, button
Preloader: #preloader, .pl-logo, .pl-bar-wrap, .pl-bar, .pl-pct
Age gate: #age-gate, .ag, .ag-sel, .ag-yes, .ag-no, .ag-legal, .ag-custom .ag-select-*
Cart: #cart-panel, #cart-overlay, .cart-head, .cart-item, .ci-*, .cart-foot, .cart-checkout
Nav: nav, .nav-logo, .nav-links, .nav-cta, .nav-cart-btn, .nav-ham
Mobile nav: #mob-nav, .mob-link, #mob-close
Sticky contact: #sticky-contact, .sc-fab, .sc-tip, .sc-badge
Chat widget: #chat-widget, .chat-head, .chat-body, .chat-bubble, .chat-foot
Layout: .wrap, section
Typography: .tlabel, .tlabel-dim, .sec-eye, .sec-h, .sec-p
Buttons: .btn-p, .btn-o, .btn-gold
Reveal animations: .rv, .rv-l, .rv-r, .rv-s
Page system: .page, .page.active
Custom cursor: #cur, #cur-ring, .cx
Footer: footer, .fg, .fb, .fa, .fsoc, .fsl, .fc, .fbot, .flegal
CSS variables defined: None
CSS variables used: --bg, --plat, --ember, --ember-dk, --ember-lt, --ember-med, --faint, --faint2, --border-e, --l1, --l2, --silver, --ash, --glow, --glow2, --black-70, --black-94, --black-98, --white-18, --red-71
Media queries: max-width: 64rem, max-width: 48rem
Notes: Imports promo-ad.css at line 1. Contains multiple @keyframes (fade, plLoad, sUp, rvLine, shaft, mq, starPop, rp, cartBounce, pulseGlow). The cart slider uses custom thumb styling for both webkit and moz.
3. e:\Main\assets\css\products-components.css
Line count: 245
Purpose: Shared product card (.pcard, .pc) and product detail page (.p-detail-*) styles used across homepage, collection page, and standalone product pages.
Key selectors:
Custom cursor overrides for .product-page, .plp-page
Shared card .pc: .pc-img, .pc-body, .pc-cat, .pc-steel, .pc-name, .pc-tag, .pc-foot, .pc-price, .pc-btn, .pc.gold-card
Legacy card .pcard: .pcard-img, .pcard-fade, .pcard-tag, .pcard-body, .pcard-steel, .pcard-name, .pcard-hook, .pcard-specs, .pcard-foot
Detail: .p-detail-shell, .p-detail-grid, .p-gallery, .p-main-img, .p-thumbs, .p-thumb, .p-info, .p-steel-row, .p-price, .p-lead, .p-story, .p-spec-grid, .p-spec-cell, .p-comp, .p-trust, .p-cta-row
CTA buttons: .btn-contact, .btn-email, .btn-wa
Product page shell: .product-page, .product-topbar, .back-link, #detailRoot
Why section: .p-why, .p-why-grid, .p-why-stats
Gallery arrows: .p-arrow
CSS variables defined: None
CSS variables used: --ember, --l1, --l2, --faint, --faint2, --border-e, --plat, --silver, --ash, --bg, --gold, --gold-dk, --white-02, --green-soft-09, --green-border-28, --green-border-60, --green-soft-18, --red-71
Media queries: max-width: 64rem, max-width: 56.25rem, max-width: 48rem, max-width: 30rem
Notes: Contains two distinct card systems (.pc for homepage/collection, .pcard for legacy/alternate layout). The .product-page body class triggers full-page product detail layout with overflow hidden.
4. e:\Main\assets\css\hero.css
Line count: 59
Purpose: Homepage hero section with animated text reveals, floating stats, and scroll indicator.
Key selectors: .hero, .hero-bg, .hero-vgr, .hero-ct, .hero-ey, .hero-h1, .hero-h1--tight, .hero-h1 .ln, .hero-sub, .hero-acts, .hero-scroll, .hero-scroll-shaft, .hero-floats, .hf, .hf-n, .hf-l, #hcv
CSS variables defined: None
CSS variables used: --bg, --plat, --ember, --silver
Media queries: max-width: 64rem and min-width: 48rem (tablet), max-width: 48rem (mobile), max-width: 30rem (small mobile)
Notes: Uses isolation: isolate on hero. Hero height transitions from 100vh on desktop to auto on mobile. Heavy animation usage with staggered line-reveal.
5. e:\Main\assets\css\home.css
Line count: 308
Purpose: All homepage sections beyond the hero -- marquee band, horizontal scroll product showcase, stats bar, origin story split, hunting cards, testimonials, CTA section, and footer (redeclared here).
Key selectors:
Marquee: .mq-band, .mq-track, .mq-item, .mq-dot
Horizontal scroll: .hs-wrap, .hs-intro, .hs-sticky, .hs-inner, .hs-nav, .hs-nav-btn
Stats: .stats-sec, .si, .sb2, .sn, .sl
Story: .story-sec, .sf, .si2, .st-txt, .st-bar, .st-creds
Hunting cards: .hunt-sec, .hunt-grid, .hcard, .hc-*
Testimonials: .testi-sec, .tf, .tc, .tq, .ta, .tav
CTA: .cta-sec, .cta-bg, .cr1, .cr2, .cta-in, .cta-acts
WhatsApp: .btn-wa
Footer (repeated): footer, .fg, .fb, .fa, .fsoc, .fsl, .fc, .fbot, .flegal
CSS variables defined: None
CSS variables used: --bg, --ember, --ember-lt, --ember-dk, --l1, --l2, --l3, --plat, --silver, --ash, --faint, --faint2, --border-e, --glow, --glow2, --black-*, --white-*, --ember-soft-*, --green-soft-09, --green-border-28, --green-border-60, --green-soft-18
Media queries: max-width: 75rem, max-width: 64rem, min-width: 64.0001rem, max-width: 48rem, max-width: 30rem
Notes: Footer styles are duplicated from shared.css (likely for standalone page use). Contains a local @keyframes rp override. Extensive mobile-first card redesign for hunting cards at 48rem/30rem.
6. e:\Main\assets\css\about.css
Line count: 83
Purpose: About page -- hero banner, timeline, founder cards, values grid, workshop photo mosaic.
Key selectors:
Hero: .about-hero, .about-hero-bg, .about-hero-vgr, .about-hero-ct
Timeline: .about-timeline-sec, .atl, .atl-item, .atl-dot, .atl-content
Founders: .founders-sec, .founders-grid, .founder-card, .fc-img, .fc-ov, .fc-body, .fc-role, .fc-name, .fc-bio
Values: .values-sec, .vg, .vi, .vi-num
Workshop: .workshop-sec, .wg, .wg-item
CSS variables defined: None
CSS variables used: --bg, --l1, --l2, --l3, --ember, --ember-dk, --plat, --silver, --faint, --black-95
Media queries: max-width: 64rem, max-width: 48rem
Notes: Timeline uses CSS grid with alternating left/right content columns, collapsing to single column on mobile. Workshop grid uses content: url(...) for image sourcing via CSS.
7. e:\Main\assets\css\order.css
Line count: 270
Purpose: Custom order/commission page -- hero, order summary card, contact form, budget slider, file upload, order process info, "why order" section, and success state.
Key selectors:
Layout: .order-hero, .order-layout, .order-summary-section, .order-summary-card
Order items: .order-items-list, .order-item-*
Form: .order-contact-form, .form-row, .oc-grid, .oc-field, .phone-input-group
Budget: .oc-budget-panel, .oc-range, #budgetMeterFill
Upload: .oc-upload, .oc-upload-btn
Panel/preview: .oc-panel, .oc-preview-wrap, .oc-stats
Why section: .order-why-sec, .order-why-grid, .order-why-stat
Success: #order-success, .oc-success-meta
Buttons: .order-submit, .btn-wa, .btn-email
CSS variables defined: None
CSS variables used: --bg, --l1, --l2, --ember, --ember-lt, --ember-dk, --ember-soft-*, --ember-transparent, --ember-glow-25, --plat, --silver, --ash, --faint, --faint2, --border-e, --white-02, --white-15, --black-82, --green-soft-09, --green-border-28, --green-border-60, --green-soft-18
Media queries: max-width: 64rem, max-width: 56.25rem, max-width: 48rem, max-width: 30rem
Notes: Contains local @keyframes for ocRise, ocGlow, ocPulse. Some selectors like .order-why-sec and animations are declared twice (redundant). The .btn-wa and .btn-email are redeclared here (also in products-components and home).
8. e:\Main\assets\css\info-pages.css
Line count: 334
Purpose: Template for informational/legal pages (Privacy, Terms, Shipping, FAQ, etc.) linked from footer.
Key selectors:
Body: body.info-page
Hero: .info-hero, .info-hero-grid
Typography: .info-title, .info-lead, .info-meta, .info-pill
Content: .info-content, .info-grid, .info-card, .info-note, .info-panel
Lists: .info-facts, .info-list, .faq-list
FAQ: .faq-item, .faq-item summary
Footer override: body.info-page footer, body.info-page .fg, body.info-page .fb, body.info-page .fc, body.info-page .fbot, body.info-page .flegal
CSS variables defined: None
CSS variables used: --bg, --l1, --l2, --ember, --plat, --silver, --ash, --faint
Media queries: max-width: 64rem, max-width: 48rem
Notes: Forces all headings to --ember color via !important. Re-declares footer layout within body.info-page scope (for isolation from shared.css). Uses 3-column grid collapsing to 2 then 1.
9. e:\Main\assets\css\checkout.css
Line count: 530
Purpose: Standalone checkout flow pages (cart review, payment form, success/cancel states).
Key selectors:
Shell: .checkout-page, .checkout-nav, .checkout-steps, .checkout-main, .checkout-container, .checkout-grid
Cart: .cart-items, .cart-item, .cart-item-image, .cart-item-details, .cart-item-qty, .qty-btn, .cart-item-price, .cart-item-remove, .cart-empty-state
Summary: .cart-summary, .summary-row, .summary-total, .shipping-free
Buttons: .btn-primary, .btn-full, .btn-secondary
Form: .checkout-form, .form-section, .form-field, .form-row
Order summary sidebar: .checkout-order-summary, .summary-item
Success: .checkout-success, .success-icon, .success-message, .success-details, .success-actions
Footer: .checkout-footer
CSS variables defined: None (references vars with fallback values inline, e.g., var(--bg, #050505))
CSS variables used: --bg, --plat, --l1, --l2, --l3, --faint, --ember, --ember-lt, --silver, --ash, --r
Media queries: max-width: 48rem
Notes: Self-contained page design with its own nav implementation. Uses var(--r) for border-radius (from colors.css). Checkout grid is 1.4fr/1fr splitting form and sidebar.
10. e:\Main\assets\css\promo-ad.css
Line count: 57
Purpose: Site-wide promotional popup/modal overlay (fixed position ad card with image + content).
Key selectors: .promo-ad, .promo-ad__card, .promo-ad__inner, .promo-ad__media, .promo-ad__media-badge, .promo-ad__content, .promo-ad__tag, .promo-ad__kicker, .promo-ad__title, .promo-ad__copy, .promo-ad__price-row, .promo-ad__price, .promo-ad__compare, .promo-ad__perk-list, .promo-ad__cta-row, .promo-ad__close, .promo-ad-backdrop, .btn-p.promo-ad__cta
CSS variables defined: None
CSS variables used: --ember
Media queries: max-width: 64rem, max-width: 48rem, max-width: 30rem
Notes: Uses BEM-style naming (unusual for the project). Animation entrance via .is-visible class toggle. On mobile (48rem), all transforms are forcibly disabled with !important to prevent layout issues. Imported by shared.css.
11. e:\Main\assets\css\theme-light.css
Line count: 42
Purpose: Light theme override for public-facing product pages. Redefines core color variables when html[data-theme="light"] is set.
Key selectors: html[data-theme="light"]
CSS variables DEFINED (light overrides):
--bg: #F9F8F6, --l1: #FFFFFF, --l2: #F3F0ED, --l3: #E8E6E0, --l4: #D9D6D0
--plat: #1F1F1F, --silver: #555555, --ash: #888888
--ember, --ember-lt, --ember-dk (unchanged)
--glow, --glow2 (reduced opacity)
--gold, --gold-lt, --gold-dk (unchanged)
--border-e, --faint, --faint2, --white-02
CSS variables used: None (it redefines them)
Media queries: None
Notes: Minimal file. Only overrides color tokens; all component styles automatically adapt because they reference variables.
12. e:\Main\assets\css\collection.css
Line count: 127
Purpose: Product listing/collection page (PLP) -- hero, category filter tabs, product grid layout, quick-view modal, "why no checkout" section, scarcity bar.
Key selectors:
Nav override: nav (semi-transparent start), .nav-links a.active
Hero: .plp-hero, .plp-hero-bg, .plp-hero-vgr, .plp-hero-ct
Category tabs: .cat-sec, .cat-bar, .cat-btn, .cat-desc
Grid: .grid-sec, .prod-grid, .prod-grid.switching
Modal: #p-modal, .p-modal-inner, .p-modal-close, .p-modal-grid
Why section: .why-sec, .why-grid, .why-img, .why-content, .why-stats, .ws, .ws-n, .ws-l
Scarcity: .scarcity-bar
CSS variables defined: None
CSS variables used: --bg, --l1, --ember, --ember-dk, --plat, --silver, --faint, --border-e, --ash
Media queries: min-width: 64.0625rem, max-width: 64rem + min-width: 48rem, max-width: 64rem, max-width: 48rem, max-width: 26rem
Notes: Overrides nav background (starting blurred/transparent). On tablet, wraps the hero content in a card-like styling with border-left accent. Category tabs transform into pill-buttons on mobile. Contains local @keyframes sUp.
ADMIN CSS FILES
13. e:\Main\assets\admin\css\theme.css
Line count: 360
Purpose: Admin design system foundation -- imports Google Fonts, defines ALL admin CSS variables (colors, spacing, shadows, typography, z-index), base reset, typography, buttons, inputs, tables, cards, badges, alerts, utility classes, scrollbar, settings components, theme toggle, featured product cards.
Key selectors:
Reset: *, html, body, h1-h6, p, a, code, pre, button
Components: .btn, .btn-primary, .btn-secondary, .btn-ghost, .card, .card-header, .badge, .badge-*, .alert, .alert-*
Inputs: input, textarea, select
Tables: table, thead, th, td, tbody tr
Layout helpers: .chart-card, .section-header, .section-title, .section-subtitle, .pill
Settings: .settings-grid, .settings-tabs, .nav-tab-btn, .tab-content
Theme toggle: .theme-toggle, .theme-toggle-dot
Featured products: .featured-product-card, .featured-product-thumb, .featured-product-content, .featured-toggle
Utility text/bg: .text-primary, .bg-primary, .gap-xs through .gap-xl, .rounded-*, .shadow-*, .transition-*
CSS variables DEFINED (all admin vars):
Brand: --primary-500, --primary-600, --primary-400, --accent-500, --accent-600, --accent-400
Backgrounds: --bg-primary, --bg-secondary, --bg-tertiary, --bg-quaternary, --bg-quinary
Text: --text-primary, --text-secondary, --text-tertiary, --text-disabled
Borders: --border-color, --border-light, --border-hover, --divider-color
Glows: --glow, --glow-lg, --glow-accent, --glow-accent-lg
Semantic: --success-500/600/400, --warning-500/600/400, --error-500/600/400, --info-500/600/400
Spacing: --radius-xs through --radius-2xl
Shadows: --shadow-sm through --shadow-2xl, --shadow-ember, --shadow-ember-lg
Transitions: --transition-fast, --transition-base, --transition-slow
Typography: --font-primary, --font-heading, --font-mono
Z-index: --z-hide through --z-notification
Light theme overrides (all of the above, scoped under html[data-theme="light"])
Media queries: None in this file
Notes: The admin uses a completely separate variable naming system from the public site (e.g., --primary-500 vs --ember). Imports Google Fonts at the top. Contains the SVG noise texture overlay as body::before.
14. e:\Main\assets\admin\css\components.css
Line count: 616
Purpose: Admin layout system (sidebar + header + main grid), sidebar navigation, header, button variants (extended), toast notifications, modals, mobile hamburger menu, and utility classes.
Key selectors:
Layout: .admin-container, .admin-sidebar, .admin-header, .admin-main
Sidebar collapsed: body.sidebar-collapsed .admin-container, .sidebar-toggle
Sidebar nav: .sidebar-brand, .sidebar-brand-icon, .sidebar-brand-text, .sidebar-nav, .nav-section, .nav-section-title, .nav-link, .nav-icon, .nav-badge
Sidebar footer: .sidebar-footer, .user-card, .user-avatar, .user-info
Header: .header-title, .header-actions
Buttons: .btn, .btn-primary, .btn-secondary, .btn-accent, .btn-danger, .btn-success, .btn-ghost, .btn-sm, .btn-lg, .btn-icon
Toasts: .toast-container, .toast, .toast-icon, .toast-message, .toast-success/error/warning/info
Notification: .notif-toggle
Modal: .modal-overlay, .modal, .modal-header, .modal-close, .modal-body
Mobile: .mobile-menu-btn, .mobile-overlay
Utilities: .u-hidden, .u-flex, .u-block, .u-text-center, .u-bold, .u-mt-*, .u-mb-*, .u-muted, .u-overflow-x, .u-gap-*, .u-p-md, .u-border-collapse
CSS variables defined: None
CSS variables used: All admin theme variables from theme.css
Media queries: max-width: 64rem, max-width: 48rem
Notes: Contains @keyframes toast-in. Sidebar collapses to 5.25rem width. On mobile (64rem), sidebar becomes a fixed overlay with transform animation. Grid switches from 2-column to single column.
15. e:\Main\assets\admin\css\dashboard.css
Line count: 425
Purpose: Admin dashboard page -- metric cards, chart cards, hero/welcome card, mini-list rows, orders table, status chips, theme toggle (duplicate), stats grid, chart toolbar.
Key selectors:
Shell: .dashboard-shell
Metrics: .metric-card, .metric-label, .metric-value, .metric-delta
Charts: .chart-card, .chart-wrap, .chart-toolbar, .chart-filter
Hero: .hero-card, .hero-grid, .hero-title, .hero-copy, .hero-badges, .hero-badge
Lists: .mini-list, .mini-row, .mini-avatar
Orders: .orders-table, .table-empty
Status: .status-chip, .status-chip.pending/processing/completed/shipped/cancelled
Topbar: .dashboard-topbar, .refresh-chip
Theme toggle: .theme-toggle (redeclared)
Stats: .stats-grid
Misc: .live-dot, .spinner
CSS variables defined: None
CSS variables used: Admin theme variables (--bg-, --border-, --text-, --primary-, --accent-, --shadow-, --radius-, --transition-)
Media queries: max-width: 67.5rem, max-width: 56.25rem, max-width: 43.75rem
Notes: Metric cards have a decorative radial gradient pseudo-element. The body has a radial gradient background. Stats grid uses auto-fit with 12.5rem minimum.
16. e:\Main\assets\admin\css\products.css
Line count: 615
Purpose: Admin product management page -- product grid/list views, product cards, form modal for create/edit, image upload/management, featured product cards, sort-order drag-and-drop grid.
Key selectors:
Shell: .products-shell
Page intro: .page-intro
Tabs: .tabs-nav, .tab
Panel: .panel
Status: .status-bar
Grid view: .product-grid, .product-card, .product-image, .product-info, .product-name, .product-sku, .product-price, .product-actions
List view: .product-list, .product-row, .product-row-thumb, .product-row-info, .product-row-controls
Featured: .featured-badge, .featured-product-card, .featured-product-thumb, .featured-toggle, .featured-product-description
Modal: .modal-overlay, .modal, .modal-header, .modal-close
Form: .form-grid, .form-group
Images: .image-list, .image-item, .image-item-toolbar, .image-item-btn
Sort: .sort-order-grid, .sort-card, .sort-card.dragging, .sort-card.drag-over, .sort-card-order, .sort-card-thumb, .sort-card-info, .sort-card-handle
Misc: .empty-state, .btn-row, .toolbar-note
CSS variables defined: None
CSS variables used: Admin theme variables
Media queries: max-width: 56.25rem, max-width: 48rem
Notes: Contains drag-and-drop card styling with .dragging and .drag-over states. Sort cards use cursor: grab/grabbing and touch-action: none. Product grid uses auto-fill with 17.5rem minimum.
17. e:\Main\assets\admin\css\orders.css
Line count: 286
Purpose: Admin orders management -- order creation modal with product picker, selected items list, order detail form, order summary panel, filter controls.
Key selectors:
Modal: .order-modal-overlay, .order-modal
Product picker: .order-product-grid, .order-product-card, .order-product-thumb
Selected items: .order-selected-list, .order-selected-item
Actions: .order-selected-actions, .order-qty
Filter: .orders-filter-select
View button: .order-view-btn
Detail form: .order-detail-grid, .order-detail-field
Summary: .order-summary-panel, .order-summary-row
CSS variables defined: None
CSS variables used: --bg-primary, --bg-secondary, --border-light, --text-primary, --text-secondary
Media queries: max-width: 64rem, max-width: 48rem
Notes: The order modal is 68.75rem max width. Filter select uses hardcoded white/dark colors (not theme-aware for some elements like .order-view-btn background #111827).
18. e:\Main\assets\admin\css\analytics.css
Line count: 106
Purpose: Analytics dashboard page -- stat cards grid layout and responsive adjustments.
Key selectors: .analytics-dashboard, .analytics-cards, .analytics-card, .analytics-card-icon, .analytics-card-body, .analytics-card-value, .analytics-card-label
CSS variables defined: None
CSS variables used: --card-bg, --border-color, --accent, --ember, --bg-secondary, --text-primary, --text-tertiary
Media queries: max-width: 80rem, max-width: 64rem, max-width: 48rem
Notes: Uses var(--card-bg) and var(--accent, var(--ember)) which are not defined in theme.css (likely set inline or via JS). Analytics cards use a 6-column grid that collapses to 3 > 2 > 1.
19. e:\Main\assets\admin\css\promotions.css
Line count: 344
Purpose: Admin promotions management -- tab buttons, promo form/table layout, form inputs, toggle buttons, image upload, products table, review card system, review modal, campaign status bar.
Key selectors:
Tabs: .tabs-container, .tab-btn, .tab-content
Layout: .promo-layout, .promo-form-panel, .promo-table-panel
Cards: .form-card, .table-card
Form: .form-group, .toggle-btn, .toggle-hint, .image-upload
Table: .products-table
Reviews: .review-card-shell, .review-card-shell .tc/.ts/.tq/.ta/.tav/.tn/.tl, .review-card-actions
Review modal: .review-modal, .review-modal-panel, .review-modal-head, .review-modal-close
Campaign: .campaign-status-bar
CSS variables defined: None
CSS variables used: Admin theme variables (--bg-, --border-, --text-, --primary-, --shadow-, --radius-, --transition-*)
Media queries: max-width: 64rem, max-width: 48rem
Notes: Tab buttons use flex: 1 1 calc(50% - 0.5rem) on tablet and full width on mobile. Review cards reuse testimonial class names from the public site (.tc, .tq, .ts, .ta, .tav, .tn, .tl) but override them within .review-card-shell scope.
20. e:\Main\assets\admin\css\logs.css
Line count: 279
Purpose: Admin activity/session logs page -- log table, stat cards, session status indicators, action buttons, empty/unauthorized states.
Key selectors:
Container: .logs-container, .logs-controls
Table: .logs-table-wrapper, .logs-table, .logs-table th/td
Data display: .admin-email, .session-status, .session-status.active/.inactive, .timestamp-cell, .ip-address, .session-details
Actions: .action-button, .action-button.delete, .delete-all-btn
Stats: .logs-stats, .logs-stat-card, .logs-stat-label, .logs-stat-value
States: .logs-empty, .unauthorized-message
Header: .logs-header, .header-actions
CSS variables defined: None
CSS variables used: --border-light, --bg-primary, --bg-secondary, --bg-tertiary, --text-primary, --text-secondary, --text-tertiary, --error-400
Media queries: max-width: 48rem
Notes: Session status uses a ::before pseudo-element dot with currentColor. The table has min-width: 48rem on mobile forcing horizontal scroll.
21. e:\Main\assets\admin\css\settings.css
Line count: 308
Purpose: Admin settings page -- tabbed navigation, settings form cards, input/select styles, admin user table, checkbox groups, permissions panel, toast notification.
Key selectors:
Tabs: .tab-content, .settings-tabs, .nav-tab-btn
Layout: .settings-grid, .settings-grid-half
Form card: .settings-form-card
Inputs: .settings-label, .settings-input, .settings-select
Buttons: .settings-btn, .settings-btn-outline
Table: .settings-table-wrapper, .settings-table
Delete: .settings-delete-btn
Field groups: .settings-field-group, .settings-checkbox-group, .settings-checkbox-label, .settings-checkbox-desc
Permissions: .permissions-panel, .permissions-grid
Toast: .toast-saved
Empty: .table-empty
CSS variables defined: None
CSS variables used: --border-light, --bg-primary, --bg-secondary, --bg-tertiary, --text-primary, --text-secondary, --text-tertiary, --primary-400, --success-500, --error-400
Media queries: max-width: 64rem, max-width: 48rem
Notes: Contains @keyframes toastSlideIn. Settings grid collapses to single column on mobile. Permissions panel is hidden by default, shown with .visible class.
22. e:\Main\assets\admin\css\login.css
Line count: 445
Purpose: Admin login/authentication page -- auth card with blur backdrop, form fields, password toggle, OTP input, alert boxes, loading states, form transitions.
Key selectors:
Layout: body, .auth-container, .auth-card
Header: .auth-header, .auth-logo
Form: .form-group, .form-label, .form-input, .pw-wrapper, .toggle-password
Divider: .auth-divider
Remember/Forgot: .remember-forgot, .checkbox-wrapper, .forgot-link
Alert: .alert-box, .alert-box.error/.success/.info
Buttons: .btn-submit, .btn-submit.btn-primary, .btn-submit.btn-ghost
OTP: .otp-input-group, .otp-input
Form toggle: .hidden-form, .form-active
Misc: .code-meta-row, .form-help, .form-error, .loading-spinner
CSS variables defined: None (uses hardcoded colors like #050505, #D4500A, #C8A96E, etc.)
CSS variables used: None (self-contained page, does not reference admin theme vars)
Media queries: max-width: 40rem
Notes: Contains @keyframes cardIn, logoPulse, alertSlide, formIn, spinLoader. Fully self-contained page with no dependency on theme.css variables (hardcoded palette). Hides browser password reveal buttons. OTP grid collapses from 6 columns to 3 on mobile.
23. e:\Main\assets\admin\css\chat.css
Line count: 793
Purpose: Admin live chat interface -- sidebar with conversation list, main chat area with messages, input area, FAQ management panel and modal, typing indicator.
Key selectors:
Layout: .chat-layout
Sidebar: .chat-sidebar, .chat-sidebar-header, .chat-search, .chat-sidebar-tabs, .chat-list, .chat-list-item, .chat-list-avatar, .chat-list-info, .chat-list-meta, .chat-list-time, .chat-list-badge, .chat-list-stats
Main: .chat-main, .chat-main-header, .chat-header-user, .chat-header-avatar, .chat-header-info, .chat-header-actions, .chat-action-btn
Messages: .chat-messages, .chat-date-divider, .chat-msg-group, .chat-msg, .chat-msg.customer, .chat-msg.admin, .chat-msg-time
Input: .chat-input-area, .chat-input-wrapper, .chat-send-btn
Empty state: .chat-empty
FAQ panel: .faq-panel, .faq-panel-header, .faq-add-btn, .faq-items, .faq-card, .faq-card-header, .faq-card-q, .faq-card-actions, .faq-card-a
FAQ modal: .faq-modal-overlay, .faq-modal, .faq-modal-btns
Typing: .typing-indicator, .typing-dot
CSS variables defined: None
CSS variables used: --border-light, --bg-primary, --bg-secondary, --bg-hover, --text-primary, --text-muted, --primary (Note: uses --primary and --text-muted and --bg-hover which are NOT defined in theme.css -- likely set inline or missing)
Media queries: max-width: 64rem
Notes: Contains @keyframes typingBounce. Uses a 2-column grid (22rem sidebar + 1fr) that collapses to stacked rows on mobile. Chat messages use gradient backgrounds for admin bubbles. References undefined variables like --primary, --text-muted, --bg-hover (may need to be set via inline styles or a missing import).
24. e:\Main\assets\admin\css\editor.css
Line count: 81
Purpose: Visual page editor -- toolbar, section panel (left), properties panel (right), iframe canvas with responsive preview modes, toast notifications.
Key selectors:
Layout overrides: html,body (100% height, overflow hidden), .admin-container, .admin-sidebar, .admin-header (hidden), .admin-main
Toolbar: .ed-toolbar, .ed-sep, .ed-btn, .ed-save, .ed-save.unsaved, .ed-save.saving, .ed-right
Body: .ed-body
Section panel: .ed-panel, .ed-panel-section, .ed-panel-title, .ed-section-item
Properties: .ed-props, .prop-group, .prop-label, .prop-input, .prop-row, .prop-color, .prop-btn, .prop-btn-danger, .no-sel
Canvas: .ed-canvas, .ed-iframe-wrap, .ed-iframe-wrap.tablet, .ed-iframe-wrap.mobile, .ed-placeholder
Toast: .ed-toast-wrap, .ed-toast, .ed-toast.success/.error/.info
CSS variables defined: None
CSS variables used: --bg-secondary, --bg-tertiary, --border-color, --border-light, --text-primary, --text-secondary, --text-tertiary, --primary-500, --primary-600, --primary-400, --radius-md, --radius-sm, --success-500, --error-500
Media queries: max-width: 64rem
Notes: Contains @keyframes pulse (save button glow) and @keyframes edSlide (toast entrance). Overrides .admin-header to display:none!important. Panels become fixed-position overlays on mobile with transform-based show/hide. Canvas uses box-shadow "device frames" for tablet/mobile preview modes.
CROSS-FILE OBSERVATIONS
Variable systems are separate: Public site uses --ember, --bg, --plat etc. from colors.css. Admin uses --primary-500, --bg-primary, --text-primary etc. from theme.css. They are not interchangeable.

Duplicate declarations: Footer styles appear in shared.css, home.css, and info-pages.css. Button styles .btn-wa and .btn-email are declared in products-components.css, home.css, and order.css.

Undefined variables in admin/chat.css: References --primary, --text-muted, --bg-hover which do not match the admin theme system naming convention.

Login page is self-contained: Does not use CSS variables at all, using hardcoded hex values.

Breakpoints summary:

Public: 75rem, 64rem, 56.25rem, 48rem, 30rem, 26rem
Admin: 80rem, 67.5rem, 64rem, 56.25rem, 48rem, 43.75rem, 40rem
Font families used: 'Bebas Neue' (headings), 'IBM Plex Mono' (labels/monospace), 'Outfit' (body), 'Cormorant Garamond' (testimonial quotes).