# Render Deployment TODO

## Current Progress
- [x] Fix dynamic PORT in app.js
- [x] Add env-based Google OAuth callbackURL
- [x] Add npm start script in package.json

## Remaining Steps
1. Create Render account at render.com, connect GitHub repo (ahemadraza31/Wanderlust)
2. New Web Service > Build: auto (Node), Start: `npm start`
3. Set env vars:
   ```
   ATLASDB_URL=...
   SECRET=...
   CLOUD_NAME=...
   CLOUD_API_KEY=...
   CLOUD_API_SECRET=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
   NODE_ENV=production
   ```
4. Deploy - URL issued: https://your-app.onrender.com
5. Update Google OAuth console with prod CALLBACK_URL
6. Test listings/auth/maps/uploads

## Notes
- Leaflet maps free, no token.
- MongoDB Atlas required (no local).
- Free tier sleeps after inactivity.
