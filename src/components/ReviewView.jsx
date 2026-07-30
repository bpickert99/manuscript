import React, { useEffect, useState } from 'react';
import {
  doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { docToBlocks, renderBlock } from '../lib/docRenderer';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ReviewView({ token }) {
  const [link, setLink] = useState(null);
  const [status, setStatus] = useState('loading');
  const [activeChapter, setActiveChapter] = useState(0);
  const [comments, setComments] = useState([]);
  const [activeThread, setActiveThread] = useState(null); // { nodeId, blockIndex }
  const [commenterName, setCommenterName] = useState(
    () => localStorage.getItem('manuscript-reviewer-name') || ''
  );
  const [commentDraft, setCommentDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'shareLinks', token));
        if (!snap.exists()) {
          setStatus('not-found');
          return;
        }
        setLink({ id: snap.id, ...snap.data() });
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    })();
  }, [token]);

  useEffect(() => {
    const q = query(collection(db, 'shareLinks', token, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [token]);

  async function postComment(nodeId, blockIndex, parentId, text) {
    if (!text.trim() || !commenterName.trim()) return;
    localStorage.setItem('manuscript-reviewer-name', commenterName.trim());
    await addDoc(collection(db, 'shareLinks', token, 'comments'), {
      nodeId,
      blockIndex,
      parentId: parentId || null,
      authorName: commenterName.trim(),
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
  }

  if (status === 'loading') {
    return <div className="app-loading"><div className="loading-mark">M</div></div>;
  }
  if (status === 'not-found') {
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
  if (status === 'error') {
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

  const chapter = link.chapters[activeChapter];
  const blocks = docToBlocks(chapter?.content);

  function commentsFor(nodeId, blockIndex) {
    return comments.filter((c) => c.nodeId === nodeId && c.blockIndex === blockIndex);
  }

  return (
    <div className="review-wrap">
      <div className="review-header">
        <div>
          <div className="review-header-title">{link.title}</div>
          <div className="review-header-sub">Read-only review draft — leave comments in the margin</div>
        </div>
      </div>
      <div className="review-body">
        <div className="review-sidebar">
          {link.chapters.map((c, i) => (
            <button
              key={c.nodeId}
              className={"review-chapter-item" + (i === activeChapter ? " active" : "")}
              onClick={() => { setActiveChapter(i); setActiveThread(null); }}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="review-content-wrap">
          <h2 className="review-chapter-title">{chapter?.title}</h2>
          {blocks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>This chapter is empty.</p>
          ) : (
            blocks.map((node, i) => {
              const threadComments = commentsFor(chapter.nodeId, i);
              const topLevel = threadComments.filter((c) => !c.parentId);
              const isOpen = activeThread?.nodeId === chapter.nodeId && activeThread?.blockIndex === i;
              return (
                <div className="review-block" key={i}>
                  <div className="review-block-content">{renderBlock(node, i)}</div>
                  <button
                    className={"review-comment-btn" + (topLevel.length > 0 ? " has-comments" : "")}
                    onClick={() => setActiveThread(isOpen ? null : { nodeId: chapter.nodeId, blockIndex: i })}
                    title="Comment on this paragraph"
                  >
                    <MessageSquare size={13} />
                    {topLevel.length > 0 && <span>{topLevel.length}</span>}
                  </button>
                  {isOpen && (
                    <div className="review-thread">
                      <div className="review-thread-header">
                        <span>Comments</span>
                        <button className="icon-btn" onClick={() => setActiveThread(null)}><X size={13} /></button>
                      </div>
                      {topLevel.map((c) => {
                        const replies = threadComments.filter((r) => r.parentId === c.id);
                        return (
                          <div className="review-comment" key={c.id}>
                            <div className="review-comment-author">{c.authorName}</div>
                            <div className="review-comment-text">{c.text}</div>
                            {replies.map((r) => (
                              <div className="review-comment review-comment-reply" key={r.id}>
                                <div className="review-comment-author">{r.authorName}</div>
                                <div className="review-comment-text">{r.text}</div>
                              </div>
                            ))}
                            <div className="review-reply-row">
                              <input
                                className="review-reply-input"
                                placeholder="Reply..."
                                value={replyDraft[c.id] || ''}
                                onChange={(e) => setReplyDraft({ ...replyDraft, [c.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    postComment(chapter.nodeId, i, c.id, replyDraft[c.id] || '');
                                    setReplyDraft({ ...replyDraft, [c.id]: '' });
                                  }
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="review-new-comment">
                        <input
                          className="modal-input"
                          style={{ marginBottom: '0.4rem', fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                          placeholder="Your name"
                          value={commenterName}
                          onChange={(e) => setCommenterName(e.target.value)}
                        />
                        <textarea
                          className="modal-textarea"
                          style={{ minHeight: 60, fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                          placeholder="Add a comment..."
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                        />
                        <button
                          className="btn-primary"
                          style={{ marginTop: '0.4rem' }}
                          onClick={() => { postComment(chapter.nodeId, i, null, commentDraft); setCommentDraft(''); }}
                        >
                          <Send size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
