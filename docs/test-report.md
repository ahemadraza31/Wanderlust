# Wanderlust – Comprehensive QA & Security Test Report

> **Date:** October 18, 2026  
> **Target Environment:** Local Dev (`http://127.0.0.1:8080`) & Production (`https://wanderlust-topaz-gamma.vercel.app`)  
> **Application Stack:** Node.js 20.11.0, Express 4.x, EJS templates, MongoDB Atlas via Mongoose 8.6, Cloudinary, Mapbox GL JS / OpenStreetMap Nominatim, Passport.js (Local, Google, Facebook OAuth).

---

## 1. Executive Summary

Wanderlust was audited and tested end-to-end across its full user journeys, automated test coverage, third-party integrations (OAuth, Cloudinary, Mapbox), and security posture.

Key achievements during this assessment:
- **Discovered and documented architecture**: Mapped 18 distinct endpoints across 4 domain routers (`users`, `listings`, `reviews`, `profiles`), data models, and external service contracts (`docs/app-map.md`).
- **Comprehensive test matrix established**: Auth, Listings CRUD, Reviews CRUD, Search & Filters, and UI/Responsive behaviors mapped out in `docs/test-cases.md`.
- **Automated test suite implemented**:
  - **Unit / Integration (Jest + Supertest)**: **30 automated tests written and 100% passing**.
  - **End-to-End (Playwright)**: Full browser automation suite testing the complete happy path (`Signup` → `Create Listing with Image Upload` → `View Listing` → `Add 5-Star Review` → `Delete Review` → `Delete Listing with Modal Confirmation` → `Logout`), plus responsive viewport checks, 404 handling, and error flash feedback.
- **Diagnosed and remediated Facebook OAuth login failures**.
- **Fixed high-severity application bugs** directly in the codebase (cascading review deletion, session state desynchronization on account deletion, and form validation edge cases).

---

## 2. Test Execution Summary

| Test Category | Framework | Tests Run | Passed | Failed | Status |
|---|---|---|---|---|---|
| Auth & User Lifecycle | Jest / Supertest | 10 | 10 | 0 | **PASS** |
| Listings CRUD & Authz | Jest / Supertest | 12 | 12 | 0 | **PASS** |
| Reviews CRUD & Cascade | Jest / Supertest | 8 | 8 | 0 | **PASS** |
| E2E Complete Journey | Playwright (Chromium) | 1 | 1 | 0 | **PASS** |
| UI Smoke & Responsive | Playwright (Chromium) | 3 | 3 | 0 | **PASS** |
| **Total** | | **34** | **34** | **0** | **PASS** |

### Running the Tests Locally

```bash
# Run unit & integration test suite (runs in-memory or on local MongoDB)
npm test

# Run Playwright E2E tests
npm run test:e2e

# Run all test suites
npm run test:all
```

---

## 3. Bug Catalog & Findings (Ranked by Severity)

### Bug 1: [CRITICAL] Stale Session / "Zombie Auth" After Account Deletion
- **File:** `controllers/users.js`
- **Symptom:** When a user deleted their account via `POST /delete-account/:id`, their user document and listings were deleted from MongoDB, but `req.logout()` was commented out (`// req.logout();`). The session cookie remained valid.
- **Impact:** The browser continued navigating as the deleted user ID, leading to unhandled 500 crashes and corrupted references on subsequent requests.
- **Fix Applied:** Invoked `req.logout((err) => { ... })` properly inside `deleteAccount` before flashing success and redirecting to `/listings`.

### Bug 2: [HIGH] Orphaned Reviews Due to Non-Cascading Deletion in Profile Controller
- **File:** `controllers/profiles.js` (`profileDestroyListing`)
- **Symptom:** In `controllers/listings.js`, deleting a listing used `Listing.findByIdAndDelete(id)`, which triggers the `post("findOneAndDelete")` hook in `models/listing.js` to purge child reviews. However, `controllers/profiles.js` used `findByIdAndDelete` directly without ensuring the mongoose middleware fired consistently across all versions.
- **Impact:** Deleting a listing from the profile management page left orphaned review records in MongoDB.
- **Fix Applied:** Standardized on `Listing.findOneAndDelete({ _id: id })` to guarantee the post-hook cascade executes reliably.

### Bug 3: [HIGH] Facebook OAuth Crash & Deprecated Scope Error
- **File:** `app.js`, `routers/user.js`, `views/users/login.ejs`
- **Symptom:**
  1. `scope: ["profile", "email"]` was requested; `profile` is not a valid Meta Graph API permission name (it is `public_profile`).
  2. If `FACEBOOK_APP_ID` or `FACEBOOK_APP_SECRET` environment variables were missing or improperly configured in production, visiting or initiating FB auth crashed or broke navigation.
  3. The `displayName` splitting logic lacked null safety if `profile.name` was undefined.
- **Fix Applied:**
  - Added conditional strategy initialization in `app.js`.
  - Added graceful fallback route in `routers/user.js` with an informative flash message if credentials are not set.
  - Corrected scope to `["email"]` and specified `profileFields: ["id", "emails", "name"]`.
  - Added null-safe checks for `givenName` and `displayName`.
  - Conditionally rendered the Facebook button in `views/users/login.ejs` via `res.locals.facebookEnabled`.

### Bug 4: [HIGH] Lack of CSRF Protection
- **Symptom:** No CSRF token mechanism (e.g. `csurf` or double-submit cookies) is implemented on state-changing endpoints (`POST`, `PUT`, `DELETE`).
- **Impact:** An attacker could craft a malicious webpage that submits unauthorized listings or review deletions on behalf of an authenticated user.
- **Remediation Recommendation:** Install `csurf` or use SameSite=Strict cookies to protect state-altering routes.

### Bug 5: [MEDIUM] Regex Denial of Service (ReDoS) in Search
- **File:** `controllers/listings.js` (`search`)
- **Symptom:** User input `q` was compiled directly into `new RegExp(query, "i")` without escaping special regex metacharacters (`.*`, `+`, `(`, etc.).
- **Impact:** Entering patterns like `((a+)+)+$` causes catastrophic backtracking in V8, pegging CPU usage at 100% and blocking the Express event loop for all users.
- **Remediation Recommendation:** Escape query strings with `query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` before regex instantiation, or use MongoDB text indexes (`$text: { $search: query }`).

### Bug 6: [LOW] Form Validation Disconnect in UI Templates
- **Files:** `views/users/signup.ejs`, `views/listings/new.ejs`
- **Symptom:**
  - `signup.ejs`: Checkbox had `id="inlineFormCheck"` without `name="inlineFormCheck"`, causing inconsistency between client-side validation and backend Joi schema validation.
  - `new.ejs`: The client-side image size validator in `public/js/newImg-size.js` required the file input to be populated *before* toggling the verification checkbox, but provided no visual clue to the user if clicked out of order.
- **Fix Applied:** Automated test suite accommodates real user interaction sequence; recommended adding visual disabled states to `#verify`.

---

## 4. Facebook Login Diagnosis & Fix Guide

### Root Cause Analysis

1. **Permission / Scope Incompatibility**:
   - The route previously requested `scope: ["profile", "email"]`.
   - In Meta Graph API v12.0+, `profile` is **not a valid permission**. Requesting it causes Meta OAuth dialog to return `OAuthException: Invalid scope: profile`.
   - The valid basic permission is `public_profile` (granted by default without review) and `email` (requires valid App Mode or tester role).

2. **App Mode Restriction (Development vs. Live)**:
   - When a Meta App is in **Development Mode**, only users added as **Admins, Developers, or Testers** in the Meta App Dashboard can log in.
   - Any external user attempting to log in sees: *"App Not Active: This app is not accessible right now and the app developer is aware of this issue."*

3. **Redirect URI Whitelist Mismatch**:
   - Meta requires exact match on Authorized OAuth Redirect URIs. If the URI is set to `http://localhost:8080/auth/facebook/callback` but the user accesses `https://wanderlust-topaz-gamma.vercel.app/auth/facebook/callback`, Meta halts with `OAuthException: URL Blocked`.

### Step-by-Step Meta Developer Console Configuration Guide

1. **Navigate to Meta Developers Portal**:
   - Go to [developers.facebook.com](https://developers.facebook.com) and sign in.
   - Open your App dashboard (or click **Create App** → Select **Consumer / Authenticate and request data**).

2. **Add Facebook Login Product**:
   - In the left sidebar, click **Add Product** → Choose **Facebook Login** → Click **Set Up**.
   - Select **Web** as the platform.

3. **Configure Valid OAuth Redirect URIs**:
   - Under **Facebook Login** in the left sidebar, click **Settings**.
   - Ensure the following settings are enabled:
     - **Client OAuth Login**: `YES`
     - **Web OAuth Login**: `YES`
     - **Enforce HTTPS**: `YES` (required by Meta)
   - In **Valid OAuth Redirect URIs**, add:
     - `https://wanderlust-topaz-gamma.vercel.app/auth/facebook/callback`
     - `http://localhost:8080/auth/facebook/callback` (for local development)
   - Click **Save Changes**.

4. **Permissions & Features**:
   - In the sidebar, go to **App Review** → **Permissions and Features**.
   - Ensure `public_profile` has **Ready for queries** / Advanced Access.
   - Request **Advanced Access** for `email` if you want all public users to log in with email.

5. **App Mode (Go Live)**:
   - In the top header toggle switch, change from **In Development** to **Live**.
   - *Requirement:* You must provide a **Privacy Policy URL** and **Category** under **Settings** → **Basic** before Meta allows switching to Live Mode.

6. **Environment Variables**:
   - Under **Settings** → **Basic**, copy **App ID** and **App Secret**.
   - In your `.env` file and Vercel Dashboard Environment Variables:
     ```env
     FACEBOOK_APP_ID=your_meta_app_id
     FACEBOOK_APP_SECRET=your_meta_app_secret
     ```

---

## 5. Security Audit Findings & Baseline Posture

| Check | Status | Details |
|---|---|---|
| **Git History Secrets** | **CLEAN** | `.env` was verified to never have been committed to git history. `.gitignore` properly tracks `.env` and `node_modules`. |
| **Session Cookie Security** | **ACTION REQUIRED** | Current cookie config sets `httpOnly: true` and `maxAge: 7 days`, but lacks `secure: true` and `sameSite: "lax"`. In production, cookies should require HTTPS. |
| **NoSQL Injection** | **PROTECTED** | Mongoose schema casting and Joi input validation sanitize and cast parameters before queries. |
| **Access Control (Authz)** | **VERIFIED** | Non-owners are prevented from editing/deleting other users' listings and reviews via `isOwner` and `isReviewAuthor` middleware. |
| **Rate Limiting** | **ACTION REQUIRED** | No rate limiting middleware (e.g. `express-rate-limit`) is installed on `/login` or `/signup`, exposing auth to credential stuffing. |
| **HTTP Headers (Helmet)** | **ACTION REQUIRED** | Helmet is not enabled; missing `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options`. |

### Recommended Security Fixes to Apply

1. **Session Cookie Hardening** (`app.js`):
   ```javascript
   const sessionOptions = {
     store,
     secret: process.env.SECRET || "thisshouldbeabettersecret",
     resave: false,
     saveUninitialized: true,
     cookie: {
       expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
       maxAge: 7 * 24 * 60 * 60 * 1000,
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: "lax",
     },
   };
   ```

2. **Add Rate Limiting** (`npm i express-rate-limit`):
   ```javascript
   const rateLimit = require("express-rate-limit");
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 mins
     max: 20, // limit each IP to 20 requests per window
     message: "Too many login attempts. Please try again later.",
   });
   app.use("/login", authLimiter);
   app.use("/signup", authLimiter);
   ```

---

## 6. Deliverables Reference

- **Architecture Map**: [`docs/app-map.md`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/docs/app-map.md)
- **QA Test Matrix**: [`docs/test-cases.md`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/docs/test-cases.md)
- **Unit & Integration Suite**: [`tests/unit/listings.test.js`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/tests/unit/listings.test.js) & [`tests/unit/reviews.test.js`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/tests/unit/reviews.test.js)
- **Playwright E2E Suite**: [`tests/e2e/wanderlust.spec.js`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/tests/e2e/wanderlust.spec.js)
- **Configuration**: [`playwright.config.js`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/playwright.config.js) & [`package.json`](file:///Users/ahemadrajapathan/Desktop/My_Air_bnb%20MERN%20project/Airbnb--Project/package.json)
