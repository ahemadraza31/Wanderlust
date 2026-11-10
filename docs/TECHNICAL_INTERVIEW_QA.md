# Wanderlust – Technical Interview Q&A Cheatsheet

> **Role Focus:** Full-Stack / MERN-Adjacent Software Engineer  
> **Repository:** Wanderlust (Airbnb Clone)  
> **Key Tech Stack:** Node.js, Express.js, MongoDB Atlas (Mongoose), EJS, Passport.js (Local & OAuth 2.0), Cloudinary, Mapbox GL JS / OpenStreetMap Nominatim, connect-mongo.

---

## Table of Contents
1. [Project Overview & Elevator Pitch](#1-project-overview--elevator-pitch)
2. [Architecture & Request Lifecycle](#2-architecture--request-lifecycle)
3. [Authentication & Authorization (Deep Dive)](#3-authentication--authorization-deep-dive)
4. [Database Design & Mongoose ORM](#4-database-design--mongoose-orm)
5. [File Uploads & Cloudinary CDN](#5-file-uploads--cloudinary-cdn)
6. [Geocoding, Maps & Mapbox GL JS](#6-geocoding-maps--mapbox-gl-js)
7. [Validation, Error Handling & Middleware](#7-validation-error-handling--middleware)
8. [Security & Vulnerability Assessment](#8-security--vulnerability-assessment)
9. [Debugging Stories (STAR Method)](#9-debugging-stories-star-method)
10. [System Design & Scaling Tradeoffs](#10-system-design--scaling-tradeoffs)

---

## 1. Project Overview & Elevator Pitch

### Q1: "Can you give me a 60-second walkthrough of your Wanderlust project?"
**Answer:**
> "Wanderlust is a full-stack vacation rental marketplace modeled after Airbnb, built with Node.js, Express, MongoDB Atlas, and EJS templates following the MVC pattern.
> 
> The core capabilities include:
> - **Full CRUD on Listings & Reviews**: Users can create listings with image uploads, edit/delete them, and post 1-to-5 star ratings.
> - **Authentication & Authorization**: Handled via Passport.js supporting email/password and OAuth 2.0 (Google & Facebook). Granular middleware (`isLoggedIn`, `isOwner`, `isReviewAuthor`) restricts mutations to data owners.
> - **Location & Maps**: Address geocoding converts property text addresses into GeoJSON coordinates, rendered client-side on interactive Mapbox maps.
> - **Cloud Media Storage**: Direct multipart upload pipeline to Cloudinary via Multer.
> - **Production Data Integrity**: Mongoose cascade middleware cleans up associated reviews when a listing is removed, and sessions are persisted in MongoDB via `connect-mongo`."

---

### Q2: "Why did you use EJS (Server-Side Rendering) instead of a React SPA?"
**Answer:**
> "I chose EJS with Express for three architectural reasons:
> 1. **SEO & Initial Page Load**: Vacation rentals require search engine discoverability. Server-rendered HTML is crawlable out of the box without needing pre-rendering or SSR frameworks like Next.js.
> 2. **Session Security Simplicity**: Traditional session cookies with `httpOnly: true` can be managed directly on HTTP redirects without storing tokens in browser `localStorage` (which is vulnerable to XSS).
> 3. **Reduced Client-Side Bundle**: Lightweight pages load quickly on mobile networks without loading large JavaScript runtimes.
> 
> **Tradeoff acknowledged**: An SPA provides smoother, app-like transitions and component reusability. In a V2 rewrite, I would separate the backend into a RESTful API and build a React/Next.js frontend."

---

## 2. Architecture & Request Lifecycle

### Q3: "Walk me step-by-step through what happens when a user creates a new listing."
**Answer:**
> 1. **Client Submission**: The browser sends a `POST /listings` request with `Content-Type: multipart/form-data` containing text inputs (`title`, `price`, `location`, `country`, `category`) and the binary image file.
> 2. **Auth Guard (`isLoggedIn`)**: Checks `req.isAuthenticated()`. If false, saves `req.originalUrl` to `req.session.redirectUrl` for post-login redirection and halts.
> 3. **Multer Middleware (`upload.single('listing[image]')`)**:
>    - Intercepts the multipart stream.
>    - Streams the file directly to Cloudinary (`multer-storage-cloudinary`).
>    - Cloudinary returns the secure URL and public `filename`.
>    - Multer populates `req.file` with `{ path, filename }` and `req.body` with text fields.
> 4. **Input Validation (`validateListing`)**:
>    - Validates `req.body` against a strict Joi schema (`listingSchema`).
>    - Verifies `price >= 0`, required strings, etc. If invalid, throws an `ExpressError(400)`.
> 5. **Controller Execution (`createListing`)**:
>    - Calls `getMapboxCoords()`: Geocodes location + country into `[longitude, latitude]`.
>    - Instantiates `new Listing(...)` with `owner: req.user._id`, image details, and GeoJSON geometry.
>    - Calls `await newListing.save()`.
> 6. **Response & Flash**:
>    - `req.flash('success', 'New Listing Created!')` sets a flash message in the session.
>    - Sends `302 Redirect` to `/listings`.
>    - Browser renders `/listings` displaying the flash banner and newly created listing.

---

## 3. Authentication & Authorization (Deep Dive)

### Q4: "How does Session-based authentication work in your application compared to JWT?"
**Answer:**
> - **Session-Based (Our App)**:
>   - When the user logs in, Express creates a session object in MongoDB (`connect-mongo`) and signs a unique Session ID (`connect.sid`).
>   - This signed ID is stored in an HTTP cookie (`httpOnly: true`).
>   - On subsequent requests, the cookie is sent automatically. The server looks up the session in MongoDB, decrypts the user ID, and hydrates `req.user`.
>   - **Advantage**: Instant server-side revocation (calling `req.logout()` immediately invalidates the session).
> - **JWT (JSON Web Tokens)**:
>   - Stateless; credentials and claims are encoded and cryptographically signed.
>   - Server doesn't store session state; validation is purely mathematical via public/private key.
>   - **Tradeoff**: Harder to invalidate before token expiration without maintaining a Redis revocation blocklist.

---

### Q5: "What are `passport.serializeUser` and `passport.deserializeUser`?"
**Answer:**
> - `serializeUser`: Determines **what user data should be stored in the session**. To keep session size small, we only store the user's MongoDB `_id` (`done(null, user.id)`).
> - `deserializeUser`: On every subsequent HTTP request, Passport retrieves the user ID from the session cookie and queries the database (`User.findById(id)`) to attach the full user document to `req.user`.

---

### Q6: "How does Google OAuth 2.0 work under the hood in your app?"
**Answer:**
> 1. User clicks **'Sign in with Google'** (`GET /auth/google`).
> 2. App redirects user to Google’s OAuth consent screen with `client_id`, `scope: ['profile', 'email']`, and `redirect_uri`.
> 3. User authenticates with Google and grants permission.
> 4. Google redirects back to `GET /auth/google/callback` with a one-time **Authorization Code**.
> 5. Express backend exchanges that code for an **Access Token** and User Profile via a server-to-server request to Google.
> 6. In our verify callback:
>    - We check if `User.findOne({ googleId: profile.id })` exists.
>    - If not, we create a new user with their Google email and display name.
>    - We invoke `done(null, user)`, which serializes the user into our Express session.

---

### Q7: "How is Authorization (RBAC) enforced in the routes?"
**Answer:**
> We use custom middleware functions placed before controller actions:
> 1. `isLoggedIn`: Ensures the request has a valid session.
> 2. `isOwner`: Before editing or deleting a listing, it loads the listing from DB and checks:
>    ```javascript
>    if (!listing.owner.equals(res.locals.currUser._id)) {
>      req.flash("error", "You don't have permission to edit this listing!");
>      return res.redirect(`/listings/${id}`);
>    }
>    ```
> 3. `isReviewAuthor`: Before deleting a review, checks if `review.author.equals(currUser._id)`.
> 
> *Key detail*: We check authorization on **both the UI** (hiding Edit/Delete buttons with `<% if (currUser && currUser._id.equals(listing.owner._id)) %>`) and **on the server API endpoint** so Postman/curl requests cannot bypass UI restrictions.

---

## 4. Database Design & Mongoose ORM

### Q8: "Why did you choose Referencing over Embedding for Reviews in Listings?"
**Answer:**
> In MongoDB, you choose between **Embedding (denormalization)** and **Referencing (normalization)**:
> - **Why Referencing was chosen for Reviews**:
>   1. **Unbounded Growth**: Listings can have hundreds or thousands of reviews. MongoDB has a 16MB document size limit. Embedding arrays of reviews inside the listing could exceed this limit.
>   2. **Independent Operations**: Reviews have their own lifecycle (editing, author tracking, individual deletion). A separate `Review` collection allows querying reviews directly.
>   3. **Author Population**: Each review references a `User` (`author`). Storing an `ObjectId` array (`reviews: [{ type: ObjectId, ref: 'Review' }]`) allows clean two-stage population:
>      ```javascript
>      Listing.findById(id).populate({ path: "reviews", populate: { path: "author" } });
>      ```

---

### Q9: "How does Cascade Deletion work when a Listing is deleted?"
**Answer:**
> We implemented a Mongoose **post-hook middleware** in `models/listing.js`:
> ```javascript
> listingSchema.post("findOneAndDelete", async (listing) => {
>   if (listing && listing.reviews.length) {
>     await Review.deleteMany({ _id: { $in: listing.reviews } });
>   }
> });
> ```
> When a listing is removed, Mongoose automatically intercepts the deleted document and issues a `$in` query to remove all orphaned review documents.

---

### Q10: "What is the critical difference between `findByIdAndDelete` and `findOneAndDelete`?"
**Answer:**
> `findByIdAndDelete(id)` is essentially syntactic sugar for `findOneAndDelete({ _id: id })`.
> However, in Mongoose, middleware hooks are attached to query method names (e.g. `post('findOneAndDelete')`). If code uses custom queries or raw collection methods, the hook will not fire unless the exact method name configured in the schema is called.

---

## 5. File Uploads & Cloudinary CDN

### Q11: "Why use Cloudinary instead of storing images directly in MongoDB or on the local server disk?"
**Answer:**
> 1. **Stateless Hosting (Vercel)**: Serverless environments like Vercel have an ephemeral filesystem. Any file written to local disk (`/uploads`) is wiped when the container spins down.
> 2. **Database Bloat**: Storing raw binary buffers in MongoDB (`BSON BinData`) degrades query performance, slows down backups, and increases database storage costs.
> 3. **CDN & Image Transformations**: Cloudinary provides automatic format conversion (WebP/AVIF), on-the-fly resizing, thumbnail caching, and low-latency global CDN delivery.

---

### Q12: "How is image upload validated to prevent malicious files?"
**Answer:**
> - **Multer Storage Level**: `allowedFormats: ['png', 'jpg', 'jpeg']` in `cloudConfig.js` rejects non-image formats.
> - **Client-Side Validation**: `public/js/newImg-size.js` checks file size before submission (< 100KB limit).
> - **Backend Schema Level**: Joi schema validates `image.url` as an allowed string/null.

---

## 6. Geocoding, Maps & Mapbox GL JS

### Q13: "How does the Map feature work from address input to map rendering?"
**Answer:**
> 1. **Geocoding**: When saving a listing, the controller calls `getMapboxCoords(location, country)` using OpenStreetMap Nominatim:
>    ```javascript
>    https://nominatim.openstreetmap.org/search?format=json&q=Mumbai,India
>    ```
> 2. **GeoJSON Storage**: The resulting longitude and latitude are saved in GeoJSON format:
>    ```json
>    "geometry": {
>      "type": "Point",
>      "coordinates": [72.8777, 19.0760]
>    }
>    ```
>    *(Note: GeoJSON is `[longitude, latitude]`, reverse of standard latitude/longitude order).*
> 3. **Client-Side Map Rendering**:
>    - In `views/listings/show.ejs`, the coordinates and public Mapbox token are passed to client JS:
>    ```javascript
>    mapboxgl.accessToken = mapToken;
>    const map = new mapboxgl.Map({
>      container: "map",
>      style: "mapbox://styles/mapbox/streets-v12",
>      center: listing.geometry.coordinates,
>      zoom: 9
>    });
>    new mapboxgl.Marker({ color: "red" })
>      .setLngLat(listing.geometry.coordinates)
>      .addTo(map);
>    ```

---

## 7. Validation, Error Handling & Middleware

### Q14: "Why use both client-side HTML/Bootstrap validation and server-side Joi validation?"
**Answer:**
> - **Client-side (`needs-validation`)**: Provides immediate visual feedback (e.g. green borders, warning text) to improve user experience without waiting for a server round-trip.
> - **Server-side (Joi Schema Validation)**: **Critical for security**. Client-side validation can be completely bypassed by sending HTTP requests via curl, Postman, or disabled JavaScript. Joi ensures only sanitized, typed data enters MongoDB.

---

### Q15: "What is `wrapAsync` and why is it needed in Express 4?"
**Answer:**
> In Express 4, asynchronous route handlers that throw an unhandled rejected promise do **not** automatically pass errors to the next error middleware. The server would hang or crash with an `UnhandledPromiseRejection`.
> 
> `wrapAsync` is a higher-order function:
> ```javascript
> module.exports = (fn) => {
>   return (req, res, next) => {
>     fn(req, res, next).catch(next);
>   };
> };
> ```
> It wraps any async controller and ensures any thrown error is caught and routed to `next(err)`.

---

### Q16: "Explain your centralized Express Error Handler."
**Answer:**
> Located at the bottom of `app.js`:
> ```javascript
> app.all("*", (req, res, next) => {
>   next(new ExpressError(404, "Page Not Found!"));
> });
> 
> app.use((err, req, res, next) => {
>   let { statusCode = 500, message = "Something went wrong!" } = err;
>   res.status(statusCode).render("listings/error.ejs", { message });
> });
> ```
> - Catches both 404s (unmatched routes) and 500s (operational errors).
> - Renders a user-friendly `error.ejs` template rather than exposing raw stack traces in production.

---

## 8. Security & Vulnerability Assessment

### Q17: "How do you protect against NoSQL Injection in Mongoose?"
**Answer:**
> 1. **Schema Casting**: Mongoose schemas strictly enforce types. If an attacker passes `{ "$gt": "" }` where a `String` or `ObjectId` is expected, Mongoose fails type casting before the query reaches MongoDB.
> 2. **Joi Validation**: Explicitly validates data types before controllers query the database.
> 3. *Future hardening*: Install `express-mongo-sanitize` to strip `$` and `.` operators from `req.body` and `req.query`.

---

### Q18: "What is ReDoS (Regular Expression Denial of Service) and how do you prevent it in Search?"
**Answer:**
> In our search endpoint, user input `q` was passed into `new RegExp(query, 'i')`.
> If a malicious user supplies nested quantifiers like `((a+)+)+$`, the regex engine undergoes exponential catastrophic backtracking, locking the single-threaded Node.js event loop.
> 
> **Fix**: Escape special regex characters before compiling:
> ```javascript
> const sanitized = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
> const regex = new RegExp(sanitized, "i");
> ```
> Or use MongoDB full-text indexes (`$text: { $search: query }`).

---

### Q19: "What cookie security flags should be set in production?"
**Answer:**
> ```javascript
> cookie: {
>   httpOnly: true, // Prevents client-side scripts from reading session cookie via document.cookie (protects against XSS)
>   secure: process.env.NODE_ENV === "production", // Ensures cookie is only sent over HTTPS
>   sameSite: "lax", // Protects against Cross-Site Request Forgery (CSRF)
>   maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days expiration
> }
> ```

---

## 9. Debugging Stories (STAR Method)

### Story 1: The Facebook OAuth Crash & Deprecated Scope Bug
- **Situation**: Users attempting to log in via Facebook encountered unhandled server crashes and redirect failures.
- **Task**: Diagnose why Facebook OAuth was failing while Google OAuth and local authentication worked.
- **Action**:
  1. Inspected route handler and found `scope: ['profile', 'email']`. Meta Graph API v12+ deprecated `profile` (the valid basic permission is `public_profile`).
  2. Discovered that if `FACEBOOK_APP_ID` or `SECRET` was missing in environment variables, Passport crashed on startup.
  3. Audited the user creation callback and found `profile.displayName.split(" ")[0]` threw a `TypeError` if `profile.name` was missing.
  4. **Solution**: Refactored strategy initialization to be conditional, added null-safe name fallback guards, changed scope to `['email']`, added a user-friendly error fallback route, and conditionally rendered the Facebook button only when credentials exist.
- **Result**: Completely eliminated server crashes, added graceful UI degradation, and ensured full OAuth compliance with Meta’s latest API.

---

### Story 2: The "Zombie Session" on Account Deletion
- **Situation**: Users could delete their account, but remained authenticated in the browser.
- **Task**: Trace why deleting an account didn't log the user out.
- **Action**:
  1. Inspected `deleteAccount` in `controllers/users.js`.
  2. Found that `// req.logout();` was commented out! The user document was deleted from MongoDB, but the session cookie remained active.
  3. When the user refreshed, `deserializeUser` could not find the deleted user in MongoDB, causing 500 crashes and broken headers.
  4. **Solution**: Re-enabled `req.logout()` with proper callback error handling before redirecting to `/listings`.
- **Result**: Guaranteed clean session destruction and seamless redirection upon account deletion.

---

### Story 3: Orphaned Reviews on Profile Listing Deletion
- **Situation**: When deleting a listing from the profile management page, reviews associated with the listing remained in MongoDB indefinitely.
- **Task**: Investigate why cascading deletion worked on the main listing page, but failed on the profile page.
- **Action**:
  1. Compared `controllers/listings.js` and `controllers/profiles.js`.
  2. In `profiles.js`, the code called `Listing.findByIdAndDelete(id)`, but didn't ensure the `findOneAndDelete` post-hook fired reliably.
  3. **Solution**: Standardized to `Listing.findOneAndDelete({ _id: id })` across both controllers, triggering the review cleanup hook uniformly.
- **Result**: Verified via automated integration tests that all related reviews are purged when a listing is deleted from anywhere in the app.

---

## 10. System Design & Scaling Tradeoffs

### Q20: "If Wanderlust gets 100,000 active users tomorrow, what breaks first?"
**Answer:**
> 1. **MongoDB Connection Limits**:
>    - Every serverless function invocation on Vercel opens a new connection to MongoDB Atlas. Under spike traffic, it will exhaust the connection pool.
>    - *Solution*: Enable connection pooling, use Mongoose connection caching, or use MongoDB Atlas Serverless / Prisma Accelerate.
> 2. **Session Storage (`connect-mongo`)**:
>    - Looking up sessions in MongoDB for *every single HTTP request* adds 15-30ms latency.
>    - *Solution*: Move session store to **Redis** (in-memory caching with sub-millisecond lookups).
> 3. **Image Delivery Bandwidth**:
>    - Large raw images would slow down rendering.
>    - *Solution*: Cloudinary auto-formatting (`f_auto,q_auto`) and client-side lazy loading (`loading="lazy"`).
> 4. **Node.js Single-Thread CPU (Search Regex)**:
>    - Multiple unindexed regex queries across the `Listing` collection will saturate CPU.
>    - *Solution*: Create compound text indexes in MongoDB (`Listing.index({ title: 'text', location: 'text' })`) or integrate **Elasticsearch / Algolia**.

---

### Quick Recall Cheatsheet (Before Stepping Into the Interview)

| Concept | Key Keywords to Say |
|---|---|
| **Architecture** | MVC Pattern, RESTful conventions, Server-Side Rendering (EJS). |
| **Auth** | Passport.js, Session cookies (`httpOnly`), `connect-mongo`, OAuth 2.0 authorization code grant. |
| **Data Integrity** | Mongoose post-hooks for cascade review deletion, 2-stage population. |
| **Media Pipeline** | Multer memory stream ➔ Cloudinary CDN ➔ Mongo URL storage. |
| **Validation** | Dual-layer: Client-side Bootstrap (`needs-validation`) + Server-side Joi schema. |
| **Error Handling** | `wrapAsync` for async errors, centralized Express error middleware, custom `ExpressError` class. |
| **Maps** | GeoJSON Point `[lng, lat]`, Nominatim geocoding, Mapbox GL JS client-side markers. |
