# Manuscript

A personal writing workspace. Multi-project manuscript editor with a story map, plot grid, wiki, and per-node notes. Built on React + Vite + Firebase.

## First-Time Setup

### 1. Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. In **Authentication**, enable the **Google** sign-in provider.
3. In **Firestore Database**, create a database (production mode is fine — rules are set below).
4. In **Project Settings → Your apps**, register a Web app and copy the config object.

### 2. Fill in Firebase config

Open `src/lib/firebase.js` and replace the placeholder values with your real config.

> ⚠️  If this file ever reverts to placeholder values after a push, re-enter your config manually. Do not commit real API keys to a public repo — use environment variables for production.

### 3. Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point to your project
firebase deploy --only firestore:rules
```

### 4. Install and run

```bash
npm install
npm run dev
```

## Deployment (GitHub Pages)

```bash
npm run build
# Push the dist/ folder to your gh-pages branch
```

Or configure GitHub Actions to build and deploy automatically.

## Features

| Feature | Status |
|---|---|
| Google Sign-In | ✅ |
| Multiple projects | ✅ |
| Book / Part / Chapter / Scene tree | ✅ |
| Rich text editor (Bold, Italic, Blockquote) | ✅ |
| Baskerville font throughout | ✅ |
| Three themes (Light, Dark, Parchment) | ✅ |
| Per-node notes / scratchpad | ✅ |
| Offline sync via Firebase | ✅ |
| Plot grid (scenes × threads) | ✅ |
| Story map (Leaflet / OpenStreetMap) | ✅ |
| Wiki with categories | ✅ |
| Mobile responsive | ✅ |
| Shareable review links + comments | 🔜 Iteration 2 |
| Export to PDF / Word | 🔜 Iteration 2 |
| Wiki [[linking]] auto-suggestions | 🔜 Iteration 2 |
| Drag-to-reorder tree nodes | 🔜 Iteration 2 |

## Iteration 2 plan

**Export**: PDF via browser print (CSS @media print already included), Word via the `docx` npm package.

**Sharing**: Generate a unique share token stored in Firestore. A `/review/:token` route renders a read-only view of selected chapters with a Google Docs-style comment/suggestion sidebar. Commenters enter their name, can reply to others, and only the author can delete.

**Wiki linking**: A custom Tiptap `WikiLink` mark extension that detects `[[` input and opens a dropdown of existing entries. The toggle button in the wiki toolbar already wires up the CSS to show/hide these marks.
