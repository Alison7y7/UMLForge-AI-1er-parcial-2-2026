import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react';

interface EditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  edgeType: string;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNodeData: (id: string, data: any) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setEdgeType: (type: string) => void;
}


export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  edgeType: 'ASOCIACION',
  setEdgeType: (type: string) => set({ edgeType: type }),

  onConnect: (connection: Connection) => {
    const { edgeType } = get();
    set({
      edges: addEdge({
        ...connection,
        type: 'umlRelation',
        data: { tipo: edgeType, multiplicidadOrigen: '1', multiplicidadDestino: '1' }
      }, get().edges),
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  addNode: (node) => set({ nodes: [...get().nodes, node] }),
  
  updateNodeData: (id, data) => set({
    nodes: get().nodes.map((node) => 
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    )
  }),

  setSelectedNodeId: (id) =>
    set((state) =>
      state.selectedNodeId === id
        ? state
        : { selectedNodeId: id, selectedEdgeId: null }
    ),
  setSelectedEdgeId: (id) =>
    set((state) =>
      state.selectedEdgeId === id
        ? state
        : { selectedEdgeId: id, selectedNodeId: null }
    ),
}));
