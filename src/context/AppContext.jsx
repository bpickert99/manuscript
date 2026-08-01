import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

const AppContext = createContext(null);

const initialState = {
  user: null,
  authLoading: true,
  currentProject: null,
  currentNodeId: null,
  nodes: [],
  nodesLoading: false,
  activeTab: 'write',
  wikiOpenIds: [],
  wikiActiveId: null,
  mapArmedEntryId: null,
  mapFocusEntryId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, authLoading: false };
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    case 'SET_PROJECT':
      return {
        ...state,
        currentProject: action.payload,
        currentNodeId: null,
        nodes: [],
        wikiOpenIds: [],
        wikiActiveId: null,
      };
    case 'SET_NODE_ID':
      return { ...state, currentNodeId: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_WIKI_TABS':
      return { ...state, wikiOpenIds: action.payload.ids, wikiActiveId: action.payload.activeId };
    case 'SET_MAP_ARMED':
      return { ...state, mapArmedEntryId: action.payload };
    case 'SET_MAP_FOCUS':
      return { ...state, mapFocusEntryId: action.payload };
    case 'SET_NODES':
      return { ...state, nodes: action.payload, nodesLoading: false };
    case 'SET_NODES_LOADING':
      return { ...state, nodesLoading: action.payload };
    case 'OPTIMISTIC_UPDATE_NODE': {
      const updated = state.nodes.map((n) =>
        n.id === action.payload.id ? { ...n, ...action.payload.data } : n
      );
      return { ...state, nodes: updated };
    }
    case 'OPTIMISTIC_ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.payload] };
    case 'OPTIMISTIC_DELETE_NODE':
      return { ...state, nodes: state.nodes.filter((n) => n.id !== action.payload) };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const unsubNodesRef = useRef(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      dispatch({ type: 'SET_USER', payload: user });
    });
    return unsub;
  }, []);

  // Node listener — fires whenever currentProject or user changes
  useEffect(() => {
    if (unsubNodesRef.current) {
      unsubNodesRef.current();
      unsubNodesRef.current = null;
    }
    if (!state.user || !state.currentProject) return;

    dispatch({ type: 'SET_NODES_LOADING', payload: true });

    const q = query(
      collection(db, 'users', state.user.uid, 'nodes'),
      where('projectId', '==', state.currentProject.id)
    );

    unsubNodesRef.current = onSnapshot(q, (snap) => {
      const nodes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dispatch({ type: 'SET_NODES', payload: nodes });
    });

    return () => {
      if (unsubNodesRef.current) unsubNodesRef.current();
    };
  }, [state.user, state.currentProject]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function selectProject(project) {
    dispatch({ type: 'SET_PROJECT', payload: project });
  }

  function selectNode(nodeId) {
    dispatch({ type: 'SET_NODE_ID', payload: nodeId });
  }

  async function addNode(type, parentId) {
    if (!state.user || !state.currentProject) return;

    const siblings = state.nodes.filter((n) => n.parentId === (parentId || null));
    const order = siblings.length;

    const typeLabels = { book: 'New Book', part: 'New Part', chapter: 'New Chapter', scene: 'New Scene' };

    const newNode = {
      projectId: state.currentProject.id,
      type,
      parentId: parentId || null,
      title: typeLabels[type] || 'New Node',
      content: null,
      notes: '',
      order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'users', state.user.uid, 'nodes'), newNode);
    dispatch({ type: 'SET_NODE_ID', payload: ref.id });
    return ref.id;
  }

  async function updateNode(nodeId, data) {
    if (!state.user) return;
    dispatch({ type: 'OPTIMISTIC_UPDATE_NODE', payload: { id: nodeId, data } });
    await updateDoc(doc(db, 'users', state.user.uid, 'nodes', nodeId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteNode(nodeId) {
    if (!state.user) return;
    // Delete all descendants too
    const descendants = getAllDescendants(nodeId, state.nodes);
    const toDelete = [nodeId, ...descendants.map((n) => n.id)];
    toDelete.forEach((id) => dispatch({ type: 'OPTIMISTIC_DELETE_NODE', payload: id }));
    if (state.currentNodeId && toDelete.includes(state.currentNodeId)) {
      dispatch({ type: 'SET_NODE_ID', payload: null });
    }
    for (const id of toDelete) {
      await deleteDoc(doc(db, 'users', state.user.uid, 'nodes', id));
    }
  }

  function clearProject() {
    dispatch({ type: 'SET_PROJECT', payload: null });
  }

  function setActiveTab(tab) {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }

  // Opens a wiki entry as a tab (or focuses it if already open) and
  // switches to the Wiki view — callable from anywhere (e.g. clicking a
  // [[link]] in the notes scratchpad).
  function openWikiEntry(entryId) {
    if (!entryId) return;
    const ids = state.wikiOpenIds.includes(entryId)
      ? state.wikiOpenIds
      : [...state.wikiOpenIds, entryId];
    dispatch({ type: 'SET_WIKI_TABS', payload: { ids, activeId: entryId } });
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'wiki' });
  }

  function closeWikiEntry(entryId) {
    const ids = state.wikiOpenIds.filter((id) => id !== entryId);
    let activeId = state.wikiActiveId;
    if (activeId === entryId) {
      const closedIndex = state.wikiOpenIds.indexOf(entryId);
      activeId = ids[closedIndex] || ids[closedIndex - 1] || ids[0] || null;
    }
    dispatch({ type: 'SET_WIKI_TABS', payload: { ids, activeId } });
  }

  function setWikiActive(entryId) {
    dispatch({ type: 'SET_WIKI_TABS', payload: { ids: state.wikiOpenIds, activeId: entryId } });
  }

  // Arms "next map click places this entry" mode and switches to the Map tab.
  function armMapPlacement(entryId) {
    dispatch({ type: 'SET_MAP_ARMED', payload: entryId });
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'map' });
  }

  function disarmMapPlacement() {
    dispatch({ type: 'SET_MAP_ARMED', payload: null });
  }

  // Switches to the Map tab and asks it to fly to this entry's pin, if any.
  function focusEntryOnMap(entryId) {
    dispatch({ type: 'SET_MAP_FOCUS', payload: entryId });
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'map' });
  }

  function clearMapFocus() {
    dispatch({ type: 'SET_MAP_FOCUS', payload: null });
  }

  // Reparents/reorders a node. newParentId is null for root level.
  // newIndex is the node's target index among its new siblings.
  async function moveNode(nodeId, newParentId, newIndex) {
    if (!state.user) return;
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Refuse to drop a node into itself or one of its own descendants.
    let cursor = newParentId;
    while (cursor) {
      if (cursor === nodeId) return;
      const parentNode = state.nodes.find((n) => n.id === cursor);
      cursor = parentNode ? parentNode.parentId : null;
    }

    const siblings = state.nodes
      .filter((n) => n.id !== nodeId && (n.parentId || null) === (newParentId || null))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const clampedIndex = Math.max(0, Math.min(newIndex, siblings.length));
    siblings.splice(clampedIndex, 0, node);

    const updates = siblings.map((n, i) => ({ id: n.id, order: i, parentId: newParentId || null }));
    updates.forEach((u) =>
      dispatch({ type: 'OPTIMISTIC_UPDATE_NODE', payload: { id: u.id, data: { order: u.order, parentId: u.parentId } } })
    );
    await Promise.all(
      updates.map((u) =>
        updateDoc(doc(db, 'users', state.user.uid, 'nodes', u.id), {
          order: u.order,
          parentId: u.parentId,
          updatedAt: serverTimestamp(),
        })
      )
    );
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        selectProject,
        selectNode,
        addNode,
        updateNode,
        deleteNode,
        moveNode,
        clearProject,
        setActiveTab,
        openWikiEntry,
        closeWikiEntry,
        setWikiActive,
        armMapPlacement,
        disarmMapPlacement,
        focusEntryOnMap,
        clearMapFocus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function buildTree(nodes) {
  const map = {};
  const roots = [];
  nodes.forEach((n) => { map[n.id] = { ...n, children: [] }; });
  nodes.forEach((n) => {
    if (n.parentId && map[n.parentId]) {
      map[n.parentId].children.push(map[n.id]);
    } else {
      roots.push(map[n.id]);
    }
  });
  const sort = (arr) => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function getAllDescendants(nodeId, allNodes) {
  const children = allNodes.filter((n) => n.parentId === nodeId);
  return children.reduce((acc, child) => {
    return [...acc, child, ...getAllDescendants(child.id, allNodes)];
  }, []);
}
