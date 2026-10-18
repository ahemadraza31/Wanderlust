# Wanderlust – App Map

> Generated: 2026-10-18 | Stack: Node/Express + EJS + MongoDB Atlas + Cloudinary + Mapbox

---

## 1. Architecture Overview

```
Browser ──► Vercel Edge (vercel.json)
                │
                ▼
          app.js  (Express server, Node 20.11.0)
                │
        ┌───────┼───────────┬───────────┐
        ▼       ▼           ▼           ▼
   userRouter  listingRouter  reviewRouter  profileRouter
        │       │           │           │
        ▼       ▼           ▼           ▼
  controllers/  controllers/  controllers/  controllers/
   users.js     listings.js   reviews.js    profiles.js
        │       │           │
        ▼       ▼           ▼
    models/user  models/listing  models/review
        │
        ▼
   MongoDB Atlas (ATLASDB_URL)
        │
   connect-mongo (session store)

External Services:
  - Cloudinary  → image upload/storage
  - OpenStreetMap Nominatim → geocoding (replaces Mapbox SDK for geocode)
  - Mapbox GL JS → client-side map rendering
  - Passport (local / Google / Facebook) → auth
```

---

## 2. Database

| Variable | Purpose |
|---|---|
| ATLASDB_URL | Primary: MongoDB Atlas connection string |
| MONGODB_URI | Fallback alias for same |
| Fallback | mongodb://127.0.0.1:27017/Airbnb (dev only) |

> **Confirmed MongoDB Atlas** (not AstraDB). The driver is `mongoose ^8.6.1`.

Sessions are stored in MongoDB via `connect-mongo`. Session store shares the same Atlas cluster.

---

## 3. Models

### Listing
| Field | Type | Notes |
|---|---|---|
| title | String | required, unique |
| description | String | |
| image.url | String | Cloudinary URL |
| image.filename | String | Cloudinary public_id |
| price | Number | |
| location | String | |
| country | String | |
| reviews | [ObjectId -> Review] | |
| owner | ObjectId -> User | |
| geometry | GeoJSON Point | from OpenStreetMap Nominatim |
| category | [String] | |

**Hooks:** post("findOneAndDelete") cascades Review.deleteMany; pre("deleteMany") cascades reviews for bulk delete.

### Review
| Field | Type | Notes |
|---|---|---|
| comment | String | |
| rating | Number | min 1, max 5 |
| createAt | Date | **TYPO** should be createdAt |
| author | ObjectId -> User | |
| listing | ObjectId -> Listing | |

### User
| Field | Type | Notes |
|---|---|---|
| email | String | required |
| fName | String | required |
| lName | String | |
| googleId | String | OAuth |
| facebookId | String | OAuth |
| image.url | String | profile pic |
| image.filename | String | |
| username | String | passport-local-mongoose |
| hash, salt | String | passport-local-mongoose |

---

## 4. All Routes

### User Router (/)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | / | No | Redirects to /listings |
| GET | /signup | No | Render signup form |
| POST | /signup | No | varifyEmail + validateUser + register |
| GET | /login | No | Render login form |
| POST | /login | No | passport.authenticate("local") |
| GET | /logout | No | Logout |
| GET | /auth/google | No | Google OAuth initiate |
| GET | /auth/google/callback | No | Google OAuth callback |
| GET | /auth/facebook | No | Facebook OAuth initiate |
| GET | /auth/facebook/callback | No | Facebook OAuth callback |
| GET | /update-form/:id | Yes | Render account update form |
| POST | /update-password/:id | Yes | Change password |
| POST | /update-account/:id | Yes | Update name/email/username |
| POST | /update-image/:id | Yes | Update profile image |
| GET | /change-image/:id | Yes | Render image-change form |
| POST | /change-image/:id | Yes | Submit new profile image |
| DELETE | /delete/:id | Yes | Delete account + all listings + reviews |

### Listing Router (/listings)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /listings | No | Index - all listings |
| GET | /listings/filter/:id | No | Filter by category |
| GET | /listings/filterbtn | No | Filter button page |
| GET | /listings/search?q= | No | Search by title/category/country/location/price |
| GET | /listings/new | Yes | Render new listing form |
| POST | /listings | Yes | Create listing (image upload) |
| GET | /listings/:id | No | Show single listing |
| GET | /listings/:id/edit | Yes+isOwner | Render edit form |
| PUT | /listings/:id | Yes+isOwner | Update listing |
| DELETE | /listings/:id | Yes+isOwner | Delete listing |

### Review Router (/listings/:id/reviews)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /listings/:id/reviews | Yes | Create review |
| DELETE | /listings/:id/reviews/:reviewId | Yes+isReviewAuthor | Delete review |

### Profile Router (/profile)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /profile | Yes | View own profile |
| DELETE | /profile/all-listings-delete/:id | Yes | Delete all own listings |
| DELETE | /profile/listing/:id | Yes+isOwner | Delete one listing from profile |
| DELETE | /profile/all-reviews-delete/:id | Yes | Delete all own reviews |
| DELETE | /profile/review/:id/:reviewId | Yes+isReviewAuthorProfile | Delete one review from profile |

---

## 5. Environment Variables (names only - no values)

| Variable | Used In | Purpose |
|---|---|---|
| NODE_ENV | app.js | Controls dotenv loading |
| ATLASDB_URL | app.js | MongoDB Atlas URI |
| MONGODB_URI | app.js | Alternate Atlas URI alias |
| SECRET | app.js | Session secret + MongoStore crypto |
| PORT | app.js | Server port (default 8080) |
| GOOGLE_CLIENT_ID | app.js | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | app.js | Google OAuth client secret |
| CALLBACK_URL | app.js | Google OAuth callback URL |
| FACEBOOK_APP_ID | app.js | Facebook OAuth app ID |
| FACEBOOK_APP_SECRET | app.js | Facebook OAuth app secret |
| FACEBOOK_CALLBACK_URL | app.js | Facebook OAuth callback URL |
| CLOUD_NAME | cloudConfig.js | Cloudinary cloud name |
| CLOUD_API_KEY | cloudConfig.js | Cloudinary API key |
| CLOUD_API_SECRET | cloudConfig.js | Cloudinary API secret |
| MAPBOX_TOKEN | app.js (locals) | Mapbox GL JS public token |

---

## 6. Services

| Service | Purpose | SDK/Package |
|---|---|---|
| MongoDB Atlas | Primary data store + session store | mongoose, connect-mongo |
| Cloudinary | Image storage | cloudinary, multer-storage-cloudinary |
| OpenStreetMap Nominatim | Geocoding | Native fetch |
| Mapbox GL JS | Client-side map | CDN in views |
| Vercel | Hosting | vercel.json |
| Passport | Auth framework | passport + strategies |

---

## 7. Known Issues (pre-audit)

1. **Facebook Login broken** - FACEBOOK_APP_ID/SECRET/CALLBACK_URL missing from .env; routes still registered even when strategy is absent.
2. **Secrets may be tracked** - .gitignore has trailing space on `.env ` line.
3. **createAt typo** in Review model (should be createdAt).
4. **No secure cookie flag** - cookies are httpOnly but not secure:true in production.
5. **Search regex injection** - $regex used directly on user input without sanitization.
6. **Profile delete-listing does NOT cascade reviews** - uses findByIdAndDelete but cascade hook only fires on findOneAndDelete.
7. **Image upload crash** - createListing calls req.file.path without null-check; no-image submission causes TypeError.
8. **isProfileOwner wrong redirect** - redirects to /listings/:id (listing URL) instead of /profile on unauthorized.
