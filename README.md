# Plokama.lk Store

The storefront reads its product catalog from Supabase, so products are shared between visitors and devices. The admin panel uses Supabase Auth and database row-level security to manage inventory. Orders are sent to WhatsApp.

## Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, open and run [`supabase/schema.sql`](supabase/schema.sql). Replace each `REPLACE_WITH_ADMIN_EMAIL` with the exact email address you will use for the store admin.
3. In **Authentication → Users**, create that admin user and confirm its email.
4. In **Project Settings → API**, copy the Project URL and the publishable/anon key. Add them to `config.js`:

   ```js
   window.PLOKAMA_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_PUBLISHABLE_OR_ANON_KEY"
   };
   ```

   The publishable/anon key is intended for browser use. **Never put a `service_role` key in `config.js` or any frontend file.**
5. Upload `index.html`, `admin.html`, `script.js`, `styles.css`, and the configured `config.js` to the hosting root (usually `public_html`). The SQL setup file does not need to be deployed.
6. Open `/admin.html`, sign in with the Supabase admin email and password, and add products. Products you add will appear on the storefront for all visitors.

The current product form uses LKR, and each product needs an HTTPS/HTTP image URL. Real inventory and images must be entered by the store owner; no sample products are presented as real stock.

## Run locally

Serve this folder over HTTP (do not open the HTML file directly, because browser modules/network requests require a web origin):

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000/` or `http://localhost:8000/admin.html`.

## Troubleshooting

- **Catalog cannot load:** verify the project URL/key in `config.js`, the `products` table exists, and the SQL setup completed.
- **Admin can sign in but cannot change inventory:** make sure the login email exactly matches the email used in all three admin RLS policies in `supabase/schema.sql`.
- **Images do not appear:** use a publicly accessible HTTP/HTTPS image URL.
- **Changes are not on the hosted site:** upload the updated files to the same document root that serves `plokama.lk`.

WhatsApp orders are sent to **+94 769 129 718**.
