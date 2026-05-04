# Project TODO - Render Deployment + Facebook Auth

## Deployment Progress
- [x] Dynamic PORT, callback env, npm start
- [ ] Deploy to Render & test

## Facebook Auth Progress
- [ ] Add deps/strategy/routes/button/user field
- [ ] Update TODO after complete

## Env Vars for Facebook (add to Render)
```
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_secret
FACEBOOK_CALLBACK_URL=https://yourapp.onrender.com/auth/facebook/callback
```
Get from developers.facebook.com > App > Facebook Login > Valid OAuth URIs: above URL + http://localhost:8080/auth/facebook/callback
