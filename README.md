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

> ⚠️  `firestore.rules` was updated to add the `shareLinks` collection used by
> review links (see below). Re-run `firebase deploy --only firestore:rules`
> after pulling this change, or review links will fail with a permissions
> error even though the app code works.

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
| Rich text editor (Bold, Italic, Blockquote, Indent) | ✅ |
| Choice of 3 fonts (Baskerville, Lora, Inter) | ✅ |
| Three themes (Light, Dark, Parchment) | ✅ |
| Per-node notes / scratchpad | ✅ |
| Offline sync via Firebase | ✅ |
| Plot grid (scenes × threads) + beat-sheet templates | ✅ |
| Story map (Leaflet / OpenStreetMap) | ✅ |
| Wiki with categories | ✅ |
| Mobile responsive | ✅ |
| Shareable review links + margin comments | ✅ |
| Export to PDF / Word | 🔜 Iteration 3 |
| Wiki [[linking]] auto-suggestions | 🔜 Iteration 3 |
| Drag-to-reorder tree nodes | 🔜 Iteration 3 |
| Real-time multi-account collaboration on a project | 🔜 Iteration 3 |

## Review links

The **share icon** in the top nav opens the Review Links panel. Pick which
chapters/scenes to include and a link is generated at
`#/review/<token>` — this is a client-side hash route, so it works on
GitHub Pages with no server config. The link snapshots the selected
chapters' content into a `shareLinks/{token}` Firestore document (public
`get`, not publicly listable) rather than exposing your private
`/users/{uid}/nodes` data. Use **Sync latest content** to refresh a link
after you keep editing, and **Revoke** to kill it.

Reviewers don't need an account — they enter a display name once (stored
in their browser) and can comment on any paragraph via the margin bubble
next to it, and reply to existing comments. Only the manuscript owner can
delete a comment (moderation), enforced in `firestore.rules`.

## Plot Grid beat templates

**Apply Beat Template** in the Plot Grid toolbar tags your existing scenes
with an act + beat name from a popular story-structure system — Three-Act
Structure, Save the Cat! (15 beats), or the Hero's Journey (12 stages) —
spread proportionally across however many scenes you have. Re-running a
template overwrites existing tags.

## Iteration 3 plan

**Export**: PDF via browser print (CSS @media print already included), Word via the `docx` npm package.

**Wiki linking**: A custom Tiptap `WikiLink` mark extension that detects `[[` input and opens a dropdown of existing entries. The toggle button in the wiki toolbar already wires up the CSS to show/hide these marks.

**Collaboration**: Review links are read + comment only. True co-writing (a second Google account editing the same project) needs a data-model change — either per-project collaborator lists checked in `firestore.rules`, or moving projects out from under `/users/{uid}` into their own top-level collection with a `members` field.
