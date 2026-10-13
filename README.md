# Plokama.lk Accessories Store

A simple mobile accessories storefront with:

- product catalog page
- WhatsApp checkout flow
- admin panel to add, edit, and delete products
- browser localStorage persistence

## Run locally

Open `index.html` directly in a browser, or serve the folder with a local web server:

```bash
cd c:/Users/Auk/Downloads/catalog
python -m http.server 8000
```

Then visit:

- Home: http://localhost:8000/
- Admin panel: http://localhost:8000/admin.html

## Admin login

Use these credentials for the admin page:

- Username: `Aukboy`
- Password: `Aukamila1@`

For a static shared-hosting setup, the frontend stores hashed credentials rather than the plain text values, which makes this safer than keeping raw credentials in the source file. If you want to update them later, change the hash values in `script.js`.

## Shared hosting deployment

This project works on regular shared hosting because it is a static website:

1. Upload all files from this folder to your hosting root or public_html folder.
2. Ensure the main page is `index.html`.
3. Open the site normally in the browser.

## WhatsApp ordering

The store sends orders to:

- +94 769 129 718

The order message includes the product name and price automatically.

## Notes

Products are stored in the browser using localStorage, so changes remain after refresh on the same device/browser.
