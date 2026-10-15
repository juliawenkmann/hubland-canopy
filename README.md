# Tree Tracker — Campus Hubland

A map for recording the trees of Campus Hubland Nord in Würzburg. Map trees on
your phone in the field and review them on your laptop; both stay in sync
through Firebase.

**Live:** https://juliawenkmann.github.io/hubland-canopy/

## Using it

1. Open the live URL and tap the **lock** in the top bar to sign in (or *Create
   account* the first time). Do this once per device. Only the editor account in
   `firebase/firestore.rules` can add or edit trees; everyone else sees a
   read-only map.
2. On the phone, add it to the home screen so it opens full screen:
   - iPhone: Safari → Share → *Add to Home Screen*. The home-screen app has its
     own storage, so sign in once more inside it.
   - Android: Chrome menu → *Install app*.
3. In the field:
   - **Track tree** adds a tree at your GPS position and opens the edit form.
   - **Place tree** (dashboard) adds a tree wherever you tap the map.
   - No signal is fine: the app opens offline, keeps what you map and uploads it
     when you're back online. Map imagery you've already viewed is cached.

**Import / export:** *Import GeoJSON* and *Export GeoJSON* sit under "Your
trees" in the dashboard. Import needs you to be signed in.

### Mac app

```bash
./scripts/install-mac-app.sh
```

Installs **Tree Tracker** in `~/Applications` and the Dock. Clicking it starts a
small local server (`scripts/serve.mjs`, port 27190, needs Node.js) and opens
the app in your browser, like FocusFrog. It doesn't start at login. It uses the same
cloud as the phone, so sign in once there too. Re-run the script after
changing the code.

## Project layout

```
index.html              page markup
css/app.css             styles
js/
  data/                 catalogues, fruit locations, UI text (EN/DE), map style
  state.js              shared app state and storage keys
  storage.js            this device's copy of the trees and the upload outbox
  cloud-sync.js         Firestore sync through the outbox
  account.js            lock button and sign-in panel
  map-layers.js         map sources and layers
  map-view.js           colours, legend, what the map shows
  field-capture.js      GPS / tap-to-place capture
  …                     dashboard, filters, fruit mode, popup, editor
  main.js               start-up and event wiring (loads last)
  firebase-config.js    public Firebase web config
assets/                 logo, app icons, botanical plates
sw.js                   service worker (offline support)
manifest.webmanifest    home-screen install metadata
firebase/               Firestore security rules and indexes
```

No build step: the scripts are plain `<script defer>` files that share globals
and load in the order listed in `index.html`.

## Running locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. To test sync without touching real data, start
the Firebase emulators and open http://localhost:8000/?firebase-emulator=1:

```bash
npx firebase-tools emulators:start --only auth,firestore --project tree-tracker-rules-test
```

The rules only let the editor UID write, so create the emulator user with that
UID (any email and password; they exist only in the emulator):

```bash
curl -X POST -H 'Authorization: Bearer owner' -H 'Content-Type: application/json' \
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/tree-tracker-rules-test/accounts' \
  -d '{"localId":"<editor UID from firestore.rules>","email":"<email>","password":"<password>"}'
```

## Deploying

- **App:** GitHub Pages serves the `main` branch, so pushing to `main` publishes it.
- **Firestore rules:** `npx firebase-tools deploy --only firestore`

## Data sources

- Campus boundary and part of the tree baseline: © OpenStreetMap contributors (ODbL 1.0)
- Fruit locations: [mundraub.org](https://mundraub.org)
- Aerial imagery: DOP40 © Bayerische Vermessungsverwaltung (CC BY 4.0)
