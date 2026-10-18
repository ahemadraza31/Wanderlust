# Wanderlust – Manual Test Cases

> Version: 1.0 | Generated: 2026-10-18
> Priority: P0 = critical/blocking, P1 = high, P2 = medium/nice-to-have

---

## 1. Authentication

### 1.1 Signup / Registration

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| AUTH-001 | Happy-path email signup | 1. Go to /signup 2. Fill fName, lName, username, email, password (≥8 chars) 3. Submit | Account created, logged in, redirected to /listings with "User was registered and Login" flash | P0 |
| AUTH-002 | Duplicate email on signup | 1. Register user with email@test.com 2. Try signup again with same email | Flash error "Account with that email address already exists", redirect back to /signup | P0 |
| AUTH-003 | Duplicate username on signup | 1. Register with username "john" 2. Try signup again with same username | Flash error from passport-local-mongoose about duplicate username | P0 |
| AUTH-004 | Invalid email format on signup | 1. Enter "notanemail" in email field 2. Submit | Joi validation error: invalid email format | P1 |
| AUTH-005 | Password too short on signup | 1. Enter password with 7 chars 2. Submit | Joi validation error: password must be at least 8 chars | P1 |
| AUTH-006 | Empty required fields on signup | 1. Leave fName blank 2. Submit | Joi/browser validation rejects submission | P1 |

### 1.2 Login / Logout

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| AUTH-007 | Happy-path local login | 1. Go to /login 2. Enter valid credentials 3. Submit | Redirected to /listings with "Welcome back to Wanderlust!" flash | P0 |
| AUTH-008 | Wrong password | 1. Enter valid username + wrong password | Redirect back to /login with Passport flash error "Missing credentials" or "Incorrect password" | P0 |
| AUTH-009 | Non-existent username | 1. Enter unknown username | Redirect back to /login with error flash | P0 |
| AUTH-010 | Logout | 1. Login 2. Click Logout | Redirected to /listings, session cleared, "You are logged out!" flash | P0 |
| AUTH-011 | Login redirect after protected page | 1. Visit /listings/new while logged out 2. Login | After login, redirected back to /listings/new | P1 |
| AUTH-012 | Session expiry | 1. Login 2. Wait 7 days (or manually expire cookie) 3. Visit a protected route | Redirected to /login with error flash | P1 |

### 1.3 Google OAuth

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| AUTH-013 | Google OAuth login – new user | 1. Click "Sign in with Google" 2. Authorize on Google | New user created, redirected to /listings with success flash | P0 |
| AUTH-014 | Google OAuth login – existing user | 1. Repeat Google login with same Google account | Logs in to existing account, no duplicate user created | P0 |
| AUTH-015 | Google OAuth – cancel | 1. Click Google login 2. Cancel on Google consent screen | Redirected to /login with failure flash | P1 |

### 1.4 Facebook OAuth

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| AUTH-016 | Facebook OAuth – credentials missing | 1. Visit /auth/facebook when FACEBOOK_APP_ID not set | Flash "Facebook login is not configured", redirect to /login | P0 |
| AUTH-017 | Facebook OAuth – new user (when configured) | 1. Add FB credentials to env 2. Click FB login 3. Authorize | New user created, redirect /listings with success flash | P0 |
| AUTH-018 | Facebook OAuth – callback URL mismatch | 1. Use wrong FACEBOOK_CALLBACK_URL 2. Attempt FB login | FB returns error; verify it redirects to /login gracefully | P1 |
| AUTH-019 | Facebook App in Development mode | When app is in Dev mode, only test users can login | Non-test Facebook users get "App Not Live" error from FB | P1 |

---

## 2. Authorization

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| AUTHZ-001 | User B edits User A's listing via UI | 1. Login as User A, create listing 2. Login as User B 3. Manually navigate to /listings/:id/edit | isOwner middleware redirects to /listings/:id with error flash | P0 |
| AUTHZ-002 | User B sends PUT directly to User A's listing | 1. Using curl/Postman, PUT /listings/:id with User B's session cookie | isOwner middleware blocks; redirect response returned | P0 |
| AUTHZ-003 | User B deletes User A's listing via API | 1. DELETE /listings/:id with User B session | isOwner blocks; redirect response | P0 |
| AUTHZ-004 | User B deletes User A's review | 1. User A creates review 2. User B sends DELETE /listings/:id/reviews/:reviewId | isReviewAuthor blocks; redirect to listing with error flash | P0 |
| AUTHZ-005 | Unauthenticated create listing | 1. POST /listings without a session cookie | Redirect to /login | P0 |
| AUTHZ-006 | Unauthenticated create review | 1. POST /listings/:id/reviews without session | Redirect to /login | P0 |
| AUTHZ-007 | Unauthenticated delete listing | 1. DELETE /listings/:id without session | Redirect to /login | P0 |
| AUTHZ-008 | Profile page – accessing another user's profile edit | 1. Login as User B 2. Navigate to /update-form/{UserA._id} | isProfileOwner blocks; redirect with error flash | P0 |
| AUTHZ-009 | User B deletes User A's account | 1. DELETE /delete/:id with User B's session | isProfileOwner blocks | P0 |

---

## 3. Listings CRUD

### 3.1 Create

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| LIST-001 | Create listing happy path | 1. Login 2. /listings/new 3. Fill all fields + upload valid image 4. Submit | Listing created, redirected to /listings, "New Listing Created!" flash | P0 |
| LIST-002 | Create listing without image | 1. Submit form with no image file | Crashes with TypeError on req.file.path (BUG – needs null-check) | P0 |
| LIST-003 | Create listing with empty title | 1. Leave title blank 2. Submit | Joi validation error: title required | P0 |
| LIST-004 | Create listing with empty description | 1. Leave description blank | Joi validation error | P0 |
| LIST-005 | Negative price | 1. Enter price = -100 | Joi validation error: min(0) | P1 |
| LIST-006 | Zero price | 1. Enter price = 0 | Should be accepted (min 0 in Joi) | P2 |
| LIST-007 | Very large price | 1. Enter price = 999999999 | Accepts; no upper bound defined | P2 |
| LIST-008 | Very long title/description | 1. Enter 10,000 char string | No max length set in schema – accepted | P2 |
| LIST-009 | Special chars in title | 1. Enter title with <script>alert(1)</script> | Stored and rendered – must be HTML-escaped in EJS | P0 |
| LIST-010 | Duplicate title | 1. Create listing with "Beach House" 2. Create another with same title | MongoDB unique index throws error – should show user-friendly error | P1 |
| LIST-011 | Wrong image format (PDF) | 1. Upload a .pdf file | Cloudinary/multer should reject; currently allowedFormats = png/jpg/jpeg only | P1 |
| LIST-012 | Oversized image (>10MB) | 1. Upload very large image | No size limit set in multer – may succeed or timeout | P1 |

### 3.2 Read / Show

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| LIST-013 | Show existing listing | 1. Click on listing card | Shows listing detail with map, reviews, owner info | P0 |
| LIST-014 | Show non-existent listing | 1. Navigate to /listings/invalidid | Flash "Listing you requested for does not exist!", redirect /listings | P0 |
| LIST-015 | Map renders for valid location | 1. View listing with known location | Mapbox map renders with pin | P0 |
| LIST-016 | Map fallback for unknown location | 1. View listing with unmappable location | Map shows Mumbai fallback coords | P2 |

### 3.3 Update / Edit

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| LIST-017 | Edit listing happy path | 1. Login as owner 2. /listings/:id/edit 3. Change fields 4. Submit | Listing updated, redirect to /listings/:id, "Listing Updated!" flash | P0 |
| LIST-018 | Edit listing without changing image | 1. Edit form, leave image blank | Existing image preserved | P0 |
| LIST-019 | Edit with new image | 1. Upload new image on edit | New image replaces old | P1 |
| LIST-020 | Edit creates a renderEditForm crash | 1. View listing with no image.url | listing.image.url accessed without null-check → TypeError | P1 |

### 3.4 Delete

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| LIST-021 | Delete listing – cascades reviews | 1. Create listing with reviews 2. Delete listing | Reviews deleted from DB (verified via "findOneAndDelete" hook) | P0 |
| LIST-022 | Delete listing from profile page | 1. Delete listing via /profile/listing/:id | Uses findByIdAndDelete – cascade hook NOT triggered → reviews orphaned (BUG) | P0 |

---

## 4. Reviews

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| REV-001 | Add review happy path | 1. Login 2. View listing 3. Submit rating (1–5) + comment 4. Submit | Review appears on listing page, "New Review Created!" flash | P0 |
| REV-002 | Rating = 0 (below min) | 1. Submit rating 0 | Joi validation error: min(1) | P0 |
| REV-003 | Rating = 6 (above max) | 1. Submit rating 6 | Joi validation error: max(5) | P0 |
| REV-004 | Non-numeric rating | 1. Submit rating = "abc" | Joi validation error | P0 |
| REV-005 | Empty comment | 1. Leave comment blank | Joi validation error: comment required | P0 |
| REV-006 | Only author can delete review | 1. User A creates review 2. User B tries to delete it | isReviewAuthor blocks with error flash | P0 |
| REV-007 | Author deletes own review | 1. Login as review author 2. Delete review | Review removed from listing, "Review Deleted!" flash | P0 |
| REV-008 | Delete listing cascades reviews | 1. Add reviews to listing 2. Delete listing (via /listings/:id) | Reviews are deleted (findOneAndDelete hook triggers) | P0 |
| REV-009 | XSS in review comment | 1. Submit <script>alert(1)</script> as comment | EJS must escape output; no JS executes | P0 |
| REV-010 | Review on non-existent listing | 1. POST /listings/invalidid/reviews | Should 404 or flash "does not exist" | P1 |

---

## 5. Search / Filter

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| SEARCH-001 | Search by title | 1. Enter existing listing title in search | Listing appears in results | P0 |
| SEARCH-002 | Search by category | 1. Enter "Beach" (or any category) | Listings with that category shown | P0 |
| SEARCH-003 | Search by country | 1. Enter "India" | Listings in India shown | P0 |
| SEARCH-004 | Search by price (integer) | 1. Enter "5000" | Listings priced ≤ 5000 shown | P1 |
| SEARCH-005 | No results | 1. Search "zzzyyyxxx" | Flash "Listings is not here !!!", redirect /listings | P0 |
| SEARCH-006 | Empty search | 1. Submit empty search string | Flash "Search value empty !!!", redirect /listings | P0 |
| SEARCH-007 | Regex injection | 1. Search ".*" or "(a+)+" | All listings returned or crash (BUG – unescaped $regex) | P0 |
| SEARCH-008 | Special characters | 1. Search "<script>", "'; DROP" | Should handle gracefully; not crash | P0 |
| FILTER-001 | Filter by category button | 1. Click category filter for "Trending" | Shows only listings in that category | P0 |
| FILTER-002 | Filter – no matching category | 1. Filter by category with no listings | Flash error, redirect /listings | P0 |

---

## 6. Map

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| MAP-001 | Valid location renders pin | 1. Create listing with "Paris, France" 2. View listing | Map shows pin at correct Paris coordinates | P0 |
| MAP-002 | Invalid/unrecognized location | 1. Create listing with "Xyzzy123" location | Falls back to Mumbai coords (72.8777, 19.0760) | P1 |
| MAP-003 | Mapbox token missing | 1. Remove MAPBOX_TOKEN from env 2. View listing | Map fails to load; no JS crash that blocks page | P1 |
| MAP-004 | Nominatim geocode failure | 1. Simulate Nominatim timeout/error 2. Create listing | Falls back to Mumbai coords gracefully | P2 |

---

## 7. UI / UX

| ID | Scenario | Steps | Expected | Priority |
|---|---|---|---|---|
| UI-001 | Responsive – mobile (375px) | 1. Open Chrome DevTools at 375px 2. Browse index, show, login pages | No horizontal overflow, nav usable, images scale | P0 |
| UI-002 | Responsive – tablet (768px) | 1. Open at 768px 2. Browse key pages | Layout adapts appropriately | P1 |
| UI-003 | Responsive – desktop (1440px) | 1. Open at 1440px | Full layout, no content squishing | P1 |
| UI-004 | Flash messages display | 1. After login/create/delete | Flash messages appear and disappear | P0 |
| UI-005 | 404 page | 1. Visit /some/random/path | Shows custom error page (listings/error.ejs) with "Page Not Found!" | P0 |
| UI-006 | Back button after delete | 1. Delete listing 2. Press browser back | Should not re-submit delete form (POST-redirect-GET pattern not used for DELETE) | P1 |
| UI-007 | Refresh on flash message page | 1. After login (flash shown) 2. Refresh page | Flash should NOT re-appear on refresh | P1 |
| UI-008 | Nav shows correct state | 1. Logged out: shows Login/Signup 2. Logged in: shows user name + Logout | Correct nav items displayed | P0 |
