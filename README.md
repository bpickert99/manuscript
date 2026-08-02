# Manuscript

A personal writing workspace. Multi-project manuscript editor with a story map, a linked wiki, and per-node notes. Built on React + Vite + Firebase.

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

> ⚠️  Wiki entries gained a `folderId` field (replacing the old fixed
> `category`) and `mapPins` gained an optional `wikiEntryId` field. Both
> are additive — no rules changes needed, but very old wiki entries with
> only a `category` field will just show up as "Unfiled" until refiled
> into a folder.

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
| Sidebar indentation by type (Book/Part/Chapter/Scene), not nesting depth | ✅ |
| Permanent word counts (per node + rollup) | ✅ |
| Unified manuscript view — read and edit at any level, type-styled headings, auto scene breaks | ✅ |
| Pageless or paged view (US Letter, numbered pages) | ✅ |
| Book Layout — always shows the whole book; only Scenes are cards, everything else is a divider | ✅ |
| Rich text editor (Bold, Italic, Blockquote, Indent, text alignment) | ✅ |
| "Just Write" mode (lock everything but the word you're typing) | ✅ |
| Choice of 3 fonts (Baskerville, Lora, Inter) | ✅ |
| Three themes (Light, Dark, Parchment) | ✅ |
| Per-node notes / scratchpad — Write tab only, links to wiki entries | ✅ |
| Offline sync via Firebase | ✅ |
| Story map (Leaflet / OpenStreetMap), wiki entries pinnable to it | ✅ |
| Obsidian-style Wiki — folders, [[linking]] autocomplete, backlinks, hover previews, local graph, tabs | ✅ |
| Mobile responsive | ✅ |
| Shareable review links with tracked suggested edits + comments | ✅ |
| Export to PDF / Word | 🔜 Iteration 5 |
| Real-time multi-account collaboration on a project | 🔜 Iteration 5 |

## The tree and the manuscript view

Any node — Book, Part, Chapter, or Scene — can be added under any other
node (or at the project root), and nested to any depth, but the sidebar
always **indents by type**, not by actual nesting depth: every Book sits
flush left, every Part one step in, every Chapter two steps in, every
Scene three steps in — regardless of how deep it really sits in the tree.
Type tells you what something is at a glance instead of having to read
the indentation as structure. Drag a row onto another to nest it inside;
drag to the top or bottom edge of a row to drop it as a sibling
before/after. Every row shows its own word count plus the total of
everything nested under it.

Selecting any node — leaf or branch — opens the same **Write** view, and
every line of text in it is directly editable no matter what level you're
looking at. Select a Book and you get the whole book: each Part and
Chapter along the way renders as a heading, styled by **type** rather
than nesting depth — a Book title is a large centered banner with a
double rule, a Part is a narrow uppercase divider framed by rules above
and below (a real break, not just a centered line), a Chapter is a
plain left-aligned heading — so the hierarchy reads at a glance instead
of blurring together. Each Scene gets its own title and prose section,
and two scenes that share the same immediate parent automatically get a
centered "• • •" break between them. Select a single Scene and you just
get that one section. Every section auto-saves independently, so editing
"the whole book" is really editing many documents at once through one
continuous page.

**Pageless or paged.** The stacked-pages icon in the toolbar switches
between the continuous view above and a paged one: each Scene renders on
its own numbered US Letter sheet (8.5×11in, 1in margins), stacked on a
gray canvas like a print layout, with a running page number at the
bottom of each sheet. Since a live editor can't be split mid-flow, page
breaks land at scene boundaries rather than exact print-accurate
pagination — a disclosed approximation, not true WYSIWYG pagination.

## Book Layout

The **Layout** tab always shows a whole book's structure — it has its own
book picker (tabs, if your project has more than one) and is never scoped
down by whatever's selected for writing. Only **Scenes are cards**;
everything else (Book, Part, Chapter) is always a dividing line, weighted
by type — a Book gets a bold underlined banner, a Part an uppercase rule,
a Chapter a plain muted label — never a boxed section, however deep it
sits. A Chapter's scenes flow in a row beneath its divider; a Part's
Chapters stack beneath its own divider, indented one step in — sections
inside sections, all the way down.

Rename a card or divider in place, and write a short **description** on a
card — a planning summary of that scene, kept separate from both its
prose and its private notes (the scratchpad on the right stays its own
thing). Drag a card to reorder it or move it into a different chapter;
drag a divider to reorder it against its siblings. All of it goes through
the same `moveNode`/`updateNode` actions the sidebar and editor use, so
the order you set here is the order everywhere else.

## Just Write mode

The fast-forward icon in the editor toolbar toggles a mode that locks
everything before the word you're currently typing — Backspace/Delete stop
working on anything you've already finished, so fixing a typo mid-word is
still possible but going back to rewrite earlier text isn't. Good for
drafting without the temptation to fuss over what's already down.

## Notes scratchpad

The right-hand notes panel is per-node, opens by default, and only shows
up on the Write tab — switching to Layout/Map/Wiki closes it (your
open/closed preference is remembered for next time you're back on
Write). It's a full Tiptap editor now, not a plain textarea: bold,
italic, left/center/right alignment, and `[[` wiki-linking all work the
same as in the Wiki itself, so a note can reference a character or
location entry directly.

## Text alignment

Left/center/right alignment buttons are in the toolbar of every editor —
the manuscript view, Wiki entries, and the notes scratchpad — backed by
`@tiptap/extension-text-align` registered consistently everywhere content
might round-trip (including the review and suggestion-review editors), so
alignment set anywhere survives edits, syncs, and accepted suggestions
instead of silently getting stripped by an editor that doesn't know about
it.

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

**Folders you make yourself.** The old fixed Character/Location/Item/...
dropdown is gone. Make your own folders (folder-plus icon), drag any entry
onto a folder in the sidebar to file it, drag it to "Unfiled" to pull it
back out. Deleting a folder unfiles its entries rather than deleting them.

**`[[` linking.** Type `[[` anywhere in an entry's text and a dropdown
searches your other entries as you type — pick one to insert an atomic,
clickable link, or pick "Create ..." to make a brand-new entry and link it
in one step. Links are stored by the target entry's id, not its title
text, so renaming an entry never breaks anything that links to it; a link
whose target has since been deleted renders with a dashed red outline
instead of silently breaking.

**Hover to preview, click to open a tab.** Hover any `[[link]]` and a
read-only preview of that entry pops up next to it; if the preview itself
contains a link, hover that for a further preview cascading off the
first, as many layers deep as you want to go. Click a link (or "Open in
new tab" in a preview) and it opens as its own tab in the Wiki's tab bar —
several entries can be open side by side, and switching to another top
tab (Write, Layout, ...) and back leaves them all open.

**Backlinks and graph.** Below the text of each entry, a backlinks strip
lists every other entry that links to this one — the reverse direction
Obsidian is built around. The waypoints icon in the toolbar swaps the
entry text for a local graph: the current entry in the center, everything
it links to or is linked from arranged around it, click any node to jump
there.

**On the map.** The pin icon in an entry's toolbar arms "click the map to
place this entry" and switches to the Map tab; click anywhere to drop (or
move) that entry's pin. Wiki-linked pins render in a distinct color and
their popup opens the entry directly instead of the plain-pin edit form.

## Iteration 5 plan

**Export**: PDF via browser print (CSS @media print already included), Word via the `docx` npm package.

**Collaboration**: Review links carry suggestions, not true co-writing. A second Google account editing the same project live needs a data-model change — either per-project collaborator lists checked in `firestore.rules`, or moving projects out from under `/users/{uid}` into their own top-level collection with a `members` field.

**Note**: the Plot Grid (scenes × threads spreadsheet, with beat-sheet templates) was removed by request in favor of the Layout tab. If it's ever wanted back, it's in git history (`src/components/PlotGrid.jsx`, `src/lib/beatTemplates.js`) rather than gone for good.
