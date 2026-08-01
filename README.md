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

> ⚠️  `firestore.rules` changed again to move shared chapters into a
> `shareLinks/{token}/chapters/{nodeId}` subcollection (so reviewers can
> save suggested edits per-chapter instead of the owner overwriting one
> big array). Re-run `firebase deploy --only firestore:rules` after
> pulling this change.

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
| Multiple projects, each with multiple books | ✅ |
| Freely nestable tree — any node type anywhere, drag-to-reorder/reparent | ✅ |
| Permanent word counts (per node + rollup) | ✅ |
| Unified manuscript view — read and edit at any level, chapter/part headings, auto scene breaks | ✅ |
| Book Layout corkboard — drag-to-reorder cards, renames/reorders everywhere | ✅ |
| Rich text editor (Bold, Italic, Blockquote, Indent) | ✅ |
| "Just Write" mode (lock everything but the word you're typing) | ✅ |
| Choice of 3 fonts (Baskerville, Lora, Inter) | ✅ |
| Three themes (Light, Dark, Parchment) | ✅ |
| Per-node notes / scratchpad (open by default) | ✅ |
| Offline sync via Firebase | ✅ |
| Plot grid (scenes × threads) + beat-sheet templates | ✅ |
| Story map (Leaflet / OpenStreetMap) | ✅ |
| Obsidian-style Wiki — [[linking]] autocomplete, backlinks, local graph | ✅ |
| Mobile responsive | ✅ |
| Shareable review links with tracked suggested edits + comments | ✅ |
| Export to PDF / Word | 🔜 Iteration 4 |
| Real-time multi-account collaboration on a project | 🔜 Iteration 4 |

## The tree and the manuscript view

Any node — Book, Part, Chapter, or Scene — can be added under any other
node (or at the project root), and nested to any depth. Drag a row onto
another to nest it inside; drag to the top or bottom edge of a row to drop
it as a sibling before/after. Every row shows its own word count plus the
total of everything nested under it.

Selecting any node — leaf or branch — opens the same **Write** view, and
every line of text in it is directly editable no matter what level you're
looking at. Select a Book and you get the whole book: each Part/Chapter
along the way renders as a heading (its own text, editable in place), each
Scene gets its own title and prose section, and two scenes that share the
same immediate parent automatically get a centered "• • •" break between
them — no divider between a chapter's last scene and the next chapter's
first, since the next heading already marks that transition. Select a
single Scene and you just get that one section. Every section auto-saves
independently, so editing "the whole book" is really editing many
documents at once through one continuous page.

## Book Layout

The **Layout** tab shows the selected node's structure as a corkboard:
each direct child with its own children becomes a labeled section, and its
children become draggable cards. Rename a card or section in place, and
write a short **description** on a card — a planning summary of that
scene, kept separate from both its prose and its private notes (the
scratchpad on the right stays its own thing). Drag cards to reorder them
or move them into a different section — drag a section header to reorder
sections. All of it goes through the same `moveNode`/`updateNode` actions
the sidebar and editor use, so the order you set here is the order
everywhere else (sidebar tree, manuscript view,
Plot Grid rows). "Open in Write →" jumps straight to editing that card.

## Just Write mode

The fast-forward icon in the editor toolbar toggles a mode that locks
everything before the word you're currently typing — Backspace/Delete stop
working on anything you've already finished, so fixing a typo mid-word is
still possible but going back to rewrite earlier text isn't. Good for
drafting without the temptation to fuss over what's already down.

## Review links & suggested edits

The **share icon** in the top nav opens the Review Links panel. Pick which
parts of the tree to include (checking a Book/Part shares everything nested
under it) and a link is generated at `#/review/<token>` — a client-side
hash route, so it works on GitHub Pages with no server config. Each shared
chapter/scene is copied into its own `shareLinks/{token}/chapters/{nodeId}`
document rather than exposing your private `/users/{uid}/nodes` data. Use
**Sync latest content** to refresh a link after you keep editing (this
overwrites any unresolved reviewer suggestions, so it warns first), and
**Revoke** to kill it and clean up its subcollections.

Reviewers don't need an account — they enter a display name once (stored in
their browser), then edit directly. Their insertions and deletions are
tracked rather than applied — shown underlined/struck-through and
color-coded per reviewer, like Google Docs' suggesting mode — instead of
silently rewriting your prose. They can also leave a general comment per
chapter.

From **Review Suggestions** on a link, you see each edit with Accept/Reject
buttons (plus "Accept all"). Once every suggestion in a chapter is
resolved, **Apply to Manuscript** writes the clean result back into your
actual node — nothing touches the live manuscript before that explicit
step, so a reviewer can never directly overwrite your working draft.

**Known limits**: this uses last-write-wins autosave (no operational
transform), so it's built for one reviewer editing a given chapter at a
time rather than simultaneous co-editing; syncing a link while suggestions
are pending will blow those suggestions away (the UI warns before doing
it); and structural edits (drag/drop text moves) aren't specially
optimized — the tracked-change diff can end up larger than the edit if you
move text around a lot instead of typing in place.

## Wiki

The Wiki works like a small Obsidian vault instead of a flat article list.
Type `[[` anywhere in an entry's text and a dropdown searches your other
entries as you type — pick one to insert an atomic, clickable link, or
pick "Create ..." to make a brand-new entry and link it in one step. Links
are stored by the target entry's id, not its title text, so renaming an
entry never breaks anything that links to it; a link whose target has
since been deleted renders with a dashed red outline instead of silently
breaking.

Below the text of each entry, a **backlinks** strip lists every other
entry that links to this one — the reverse direction Obsidian is built
around, so you can find out who references a character or place without
remembering yourself. The waypoints icon in the toolbar swaps the entry
text for a **local graph**: the current entry in the center, everything
it links to or is linked from arranged around it, click any node to jump
there. Categories are still there in the sidebar for browsing, but linking
is now how entries actually connect to each other.

## Plot Grid beat templates

**Apply Beat Template** in the Plot Grid toolbar tags your existing scenes
with an act + beat name from a popular story-structure system — Three-Act
Structure, Save the Cat! (15 beats), or the Hero's Journey (12 stages) —
spread proportionally across however many scenes you have. Re-running a
template overwrites existing tags.

## Iteration 4 plan

**Export**: PDF via browser print (CSS @media print already included), Word via the `docx` npm package.

**Collaboration**: Review links carry suggestions, not true co-writing. A second Google account editing the same project live needs a data-model change — either per-project collaborator lists checked in `firestore.rules`, or moving projects out from under `/users/{uid}` into their own top-level collection with a `members` field.
