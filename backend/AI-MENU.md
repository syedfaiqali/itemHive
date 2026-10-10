# Inventory menu assistant

The **AI menu assistant** on Make your menu calls authenticated `POST /api/digital-menus/ai/suggest`. It uses the existing Google Gemini integration; configure `GEMINI_API_KEY` or comma-separated `GEMINI_API_KEYS` on the backend. Credentials never go to the browser.

For local development, set `VITE_API_URL=http://localhost:5050/api` in `.env.development.local` and run the backend on port 5050. A hosted API must be deployed with these changes before it can serve the new endpoint.

Production frontend builds default to `https://itemhive-8552.onrender.com/api`. A valid remote `VITE_API_URL` can override it, but localhost/loopback overrides are ignored in production. Include all new backend and frontend source files in the Git commit used for deployment; tracked controllers importing untracked files will fail the hosted TypeScript build.

By default it uses the existing theme model and fallback settings. To configure it independently, set `GEMINI_MENU_MODEL` and optionally comma-separated `GEMINI_MENU_FALLBACK_MODELS`. Models must support Gemini generateContent structured JSON output. See [Google's API documentation](https://ai.google.dev/api/generate-content).

Users choose up to 200 inventory items, enter an optional brief, and opt into **Suggest deals / combos**. Only tenant-owned item IDs, names, categories, selling/menu prices and menu preferences are sent. Purchase prices, suppliers, images, customer data, and exact stock levels are excluded. No products or prices are changed in inventory.

AI output is validated against the selected inventory. Sections cannot duplicate items. Combos contain 2–5 distinct products from suggested sections, each once, with an editable combined price. Unchecked deals are always excluded. Invalid output and provider failures leave the draft unchanged. The provider deadline is 45 seconds, with the existing key/model retry behavior. Closing the dialog discards its response.

Suggestions are reviewed before being added to the draft. Matching sections retain their styling; additional sections/pages are created as needed, with at most 15 items per generated section, 20 pages, and 100 elements. Users can continue editing afterward.

Accepted combos are saved as standard child deals when saving the draft or publishing, before the publication snapshot is made. A tenant/parent/request-ID unique index makes combo save retries idempotent. Pending combos remain editable and removable before saving. Deals are included in the A4 print preview. Publishing retains the existing single-active-menu behavior.

Run `npm run test:digital-menus` in backend and `npm run test:menu-ai` in the project root for focused verification.

## Revamp an existing menu

**Upload existing menu** is available beside templates/custom and in the menu builder. Users can supply a JPG, PNG, WebP photo or PDF up to 2 MB, or paste up to 20,000 characters. Authenticated `POST /api/digital-menus/ai/import` uses the same server-side Gemini configuration and deadline. Images are decoded, oriented, resized and stripped of metadata; PDFs are passed inline to Gemini. Uploaded files and extraction results are not stored by ItemHive. The dialog identifies Google AI as the reader.

The extraction preserves visible headings, item names, printed prices and page numbers. Unclear prices are returned as null and flagged for review; names and prices are never invented. Extracted output is validated and limited to 200 items, 40 sections and 20 pages. Invalid files, provider errors and malformed responses leave the current menu unchanged.

Review includes editable section headings, pages and menu prices. Only unique exact inventory-name matches are automatic. Users must match ambiguous/missing items manually, add missing products through Inventory and refresh, or untick them. No products are automatically created and inventory prices are never changed. One inventory product can be selected only once. An unclear printed price may default to the current menu/inventory selling price, with a visible confirmation reminder.

**Replace current layout** recreates reviewed sections using the chosen template's typography/columns and replaces the draft's name, items and menu prices. **Add as new pages** preserves the existing menu and adds imported sections after it; imported products move to their new sections if already present. Sections continue after 15 items, subject to the existing 20-page/100-element limits. The result remains editable and uses the existing Save Draft, Publish and A4 print flows. Importing never publishes or replaces the live menu automatically.
