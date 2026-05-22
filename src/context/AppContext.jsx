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
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, authLoading: false };
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    case 'SET_PROJECT':
      return { ...state, currentProject: action.payload, currentNodeId: null, nodes: [] };
    case 'SET_NODE_ID':
      return { ...state, currentNodeId: action.payload };
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

  return (
    <AppContext.Provider
      value={{
        ...state,
        selectProject,
        selectNode,
        addNode,
        updateNode,
        deleteNode,
        clearProject,
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
