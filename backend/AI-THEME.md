# Logo theme recommendations

Set `GEMINI_API_KEY` in the backend environment and restart the backend. Never put the key in a `VITE_` variable. `GEMINI_THEME_MODEL` defaults to `gemini-3.8-flash` and can be overridden with a compatible image-capable Gemini model.

Google's "model is currently experiencing high demand" outages are per model, so `GEMINI_THEME_FALLBACK_MODELS` lists comma-separated image-capable models to try after the primary one (default `gemini-3.5-flash,gemini-flash-lite-latest`). Set it to an empty value to disable fallback. A fallback model that no longer exists is reported like an unavailable primary model, so keep this list current.

The server prefers IPv4 when resolving hostnames. Some networks have a broken IPv6 route to Google APIs where TLS handshakes are reset after about 10 seconds, which otherwise surfaces as connection errors.

For multiple keys, set `GEMINI_API_KEYS` to a comma-separated list in the ignored `backend/.env.local` file (loaded by the server), or in the deployment environment. This list takes precedence over `GEMINI_API_KEY`. Requests try keys in order, advancing on HTTP 429 quota/rate-limit responses only. All attempts share a 45-second deadline. If every key is limited, the UI reports that quota is exhausted. Transient connection failures and HTTP 500/502/503/504 responses retry the same key up to three attempts within the shared deadline. Connection retries keep the current model; each 5xx retry moves to the next configured model, wrapping around when the list is shorter than three. Other errors do not rotate credentials. Keys belonging to the same Google project may share quota, so fallback cannot guarantee additional capacity.

Uploading a logo in Theme Settings requests three distinct complete themes. The logo is sent to Google Gemini. **Suggest new themes with AI** requests three more for the saved logo. Each request sends the defining colors of up to the last 12 suggestions shown, and the AI is told to make the new themes clearly different from them. Each suggestion shows a mini layout preview, an explanation and all 14 colors; **Preview theme** applies it to the draft. **Undo preview** restores the draft from before the first AI preview. Only **Save theme** persists changes. If a request fails, the previous suggestions stay visible.

The authenticated endpoint is `POST /api/auth/me/appearance/recommend`, accepting `{ logo, mode, exclude? }` and returning `{ themes }`. `exclude` is an optional list of up to 12 `{ themeColor, secondaryColor, backgroundColor, sidebarColor, navbarColor }` hex palettes. The endpoint validates image data and size, requires at least three themes with complete hex color output, corrects low-contrast text pairs, times out after 45 seconds, and combines concurrent identical requests (same user, logo, mode and `exclude`). Results are not cached, so every finished request produces fresh themes, and failed requests can be retried immediately. A different request can start after the active analysis finishes.

Without the server API key, the UI shows a configuration message and manual editing remains available. Provider failures do not change the user's theme. No logo or credentials are written to application logs by this endpoint.

Run focused checks from `backend`:

```sh
node -r ts-node/register/transpile-only --test src/services/logoTheme.test.ts
```

Provider references: [image inputs](https://ai.google.dev/gemini-api/docs/image-understanding), [structured output](https://ai.google.dev/gemini-api/docs/structured-output).
