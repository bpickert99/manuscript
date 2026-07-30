import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  doc, getDoc, setDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SuggestionMode } from '../lib/suggestionExtension';
import { Send } from 'lucide-react';

const SAVE_DELAY = 1200;

export default function ReviewView({ token }) {
  const [linkStatus, setLinkStatus] = useState('loading');
  const [linkTitle, setLinkTitle] = useState('');
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [reviewerName, setReviewerName] = useState(
    () => localStorage.getItem('manuscript-reviewer-name') || ''
  );
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'shareLinks', token));
        if (!snap.exists()) { setLinkStatus('not-found'); return; }
        setLinkTitle(snap.data().title || 'Manuscript');
        setLinkStatus('ready');
      } catch (err) {
        console.error(err);
        setLinkStatus('error');
      }
    })();
  }, [token]);

  useEffect(() => {
    if (linkStatus !== 'ready') return;
    const unsub = onSnapshot(collection(db, 'shareLinks', token, 'chapters'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.title.localeCompare(b.title));
      setChapters(data);
      setActiveChapterId((prev) => prev || (data[0] && data[0].id));
    });
    return unsub;
  }, [token, linkStatus]);

  if (linkStatus === 'loading') {
    return <div className="app-loading"><div className="loading-mark">M</div></div>;
  }
  if (linkStatus === 'not-found') {
    return (
      <div className="login-screen">
        <div className="login-card">
          <span className="login-ornament">❧</span>
          <h1 className="login-title">Link not found</h1>
          <p className="login-tagline">This review link has been revoked or never existed.</p>
        </div>
      </div>
    );
  }
  if (linkStatus === 'error') {
    return (
      <div className="login-screen">
        <div className="login-card">
          <span className="login-ornament">❧</span>
          <h1 className="login-title">Something went wrong</h1>
          <p className="login-tagline">Could not load this review link. Try refreshing.</p>
        </div>
      </div>
    );
  }

  if (!reviewerName) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <span className="login-ornament">❧</span>
          <h1 className="login-title">{linkTitle}</h1>
          <p className="login-tagline">Enter your name so your suggestions and comments can be attributed to you.</p>
          <input
            className="modal-input"
            autoFocus
            placeholder="Your name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nameDraft.trim()) {
                localStorage.setItem('manuscript-reviewer-name', nameDraft.trim());
                setReviewerName(nameDraft.trim());
              }
            }}
          />
          <button
            className="btn-primary"
            style={{ marginTop: '1rem', width: '100%' }}
            disabled={!nameDraft.trim()}
            onClick={() => {
              localStorage.setItem('manuscript-reviewer-name', nameDraft.trim());
              setReviewerName(nameDraft.trim());
            }}
          >
            Start Reviewing
          </button>
        </div>
      </div>
    );
  }

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="review-wrap">
      <div className="review-header">
        <div>
          <div className="review-header-title">{linkTitle}</div>
          <div className="review-header-sub">
            Reviewing as <strong>{reviewerName}</strong> — suggested edits are tracked, not applied directly
          </div>
        </div>
        <div className="review-legend">
          <span><span className="review-legend-swatch insert" /> suggested addition</span>
          <span><span className="review-legend-swatch delete" /> suggested deletion</span>
        </div>
      </div>
      <div className="review-body">
        <div className="review-sidebar">
          {chapters.map((c) => (
            <button
              key={c.id}
              className={"review-chapter-item" + (c.id === activeChapterId ? " active" : "")}
              onClick={() => setActiveChapterId(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="review-content-wrap">
          {activeChapter && (
            <ChapterReview
              key={activeChapter.id}
              token={token}
              chapter={activeChapter}
              reviewerName={reviewerName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChapterReview({ token, chapter, reviewerName }) {
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimer = useRef(null);
  const lastSavedRef = useRef(JSON.stringify(chapter.content || ''));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false,
        codeBlock: false, code: false, blockquote: true, horizontalRule: false, strike: false,
      }),
      SuggestionMode.configure({ enabled: true, author: reviewerName }),
    ],
    content: chapter.content || '',
    onUpdate({ editor: ed }) {
      const json = ed.getJSON();
      const jsonStr = JSON.stringify(json);
      if (jsonStr === lastSavedRef.current) return;
      setSaveStatus('unsaved');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await setDoc(doc(db, 'shareLinks', token, 'chapters', chapter.id), {
            content: json,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          lastSavedRef.current = jsonStr;
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      }, SAVE_DELAY);
    },
  });

  useEffect(() => {
    const q = query(collection(db, 'shareLinks', token, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => c.nodeId === chapter.id)
      );
    });
    return unsub;
  }, [token, chapter.id]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  async function postComment() {
    if (!commentDraft.trim()) return;
    await addDoc(collection(db, 'shareLinks', token, 'comments'), {
      nodeId: chapter.id,
      authorName: reviewerName,
      text: commentDraft.trim(),
      createdAt: serverTimestamp(),
    });
    setCommentDraft('');
  }

  return (
    <>
      <h2 className="review-chapter-title">{chapter.title}</h2>
      <div className="review-save-status">{saveStatus === 'unsaved' ? 'Unsaved…' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}</div>
      <div className="editor-scroll review-editor-scroll">
        <EditorContent editor={editor} />
      </div>

      <div className="review-comments">
        <div className="review-comments-title">Comments on this chapter</div>
        {comments.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet.</p>
        )}
        {comments.map((c) => (
          <div className="review-comment" key={c.id}>
            <div className="review-comment-author">{c.authorName}</div>
            <div className="review-comment-text">{c.text}</div>
          </div>
        ))}
        <div className="review-new-comment">
          <textarea
            className="modal-textarea"
            style={{ minHeight: 60, fontSize: '0.85rem' }}
            placeholder="Add a comment..."
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
          />
          <button className="btn-primary" style={{ marginTop: '0.4rem' }} onClick={postComment}>
            <Send size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Post
          </button>
        </div>
      </div>
    </>
  );
}
