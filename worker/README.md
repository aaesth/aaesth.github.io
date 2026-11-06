# aesth-api

Visitor counter + guestbook for aesth.cc, running on Cloudflare Workers (free plan is plenty).

## setup

```sh
cd worker
npx wrangler login                      # opens the browser, log in / sign up to cloudflare
npx wrangler kv namespace create KV     # prints an id
# paste that id into wrangler.toml where it says PASTE_KV_ID_HERE
npx wrangler deploy                     # prints the url, e.g. https://aesth-api.<you>.workers.dev
```

Then put that url in `js/config.js` as `api`.

## moderating

Notes are stored as one JSON array under the key `notes`. To delete one, edit it in the
Cloudflare dashboard (Storage & Databases → KV → your namespace → `notes`) or:

```sh
npx wrangler kv key get notes --binding KV --remote > notes.json
# edit notes.json
npx wrangler kv key put notes --binding KV --remote --path notes.json
```
