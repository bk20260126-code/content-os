<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/37e54598-b684-4bb7-b9c9-dcda9af55fed

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and configure the required values.
   Production requires `APP_ACCESS_USERNAME` and `APP_ACCESS_PASSWORD`; without
   them the app fails closed. Supabase cloud storage additionally requires
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `NEXT_PUBLIC_STORE_BACKEND=supabase`.
3. Run the app:
   `npm run dev`

Run the verification suite with `npm test`, `npm run lint`, and `npm run build`.
