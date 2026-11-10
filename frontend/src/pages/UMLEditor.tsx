// @ts-nocheck
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useEditorStore } from '../store/editorStore';
import { useAuthStore } from '../store/authStore';
import { formatRole, isRoleAdmin, isRoleAnfitrion, isRoleColaborador } from '../utils/roleUtils';
import {
  ArrowLeft,
  Save,
  PlusSquare,
  Trash2,
  Settings2,
  MousePointer2,
  Square,
  ArrowRight,
  Diamond,
  Layers,
  Triangle,
  MoveRight,
  Menu,
  X,
  MoreVertical,
  Wrench,
  PanelRightOpen,
  PanelLeftOpen,
  Maximize2,
  Map,
  Users,
  Eye,
  Sparkles,
  Image as ImageIcon,
  FileText,
  FileCode,
  Smartphone,
  Mic,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Lock,
  Edit2,
  Bell,
  CircleHelp
} from 'lucide-react';

import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { interpretVoiceCommand, type VoiceCommand } from '../services/voiceCommandInterpreter';
import VoiceCommandModal from '../components/voice/VoiceCommandModal';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  MarkerType
} from '@xyflow/react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import UmlClassNode from '../components/editor/UmlClassNode';
import UmlRelationEdge from '../components/editor/UmlRelationEdge';
import XmiImportModal from '../components/xmi/XmiImportModal';
import XmiExportModal from '../components/xmi/XmiExportModal';
import IAModelModal from '../components/ia/IAModelModal';
import ImageUmlImportModal from '../components/ia/ImageUmlImportModal';
import type { UmlModelJson } from '../types/uml';
import {
  diagramSnapshot,
  modelFromEditorElements,
  modelToEditorElements,
  parsePersistedModel,
  resolveRemoteModelUpdate,
  saveDiagramModel
} from '../utils/editorPersistence';
import { useCollaboration } from '../hooks/useCollaboration';
import { useProjectRecentActivity } from '../hooks/useProjectRecentActivity';
import { formatActivityDate } from '../utils/projectActivity';
import ProjectChat from '../components/chat/ProjectChat';

const nodeTypes = { umlClass: UmlClassNode };
const edgeTypes = { umlRelation: UmlRelationEdge };

type SaveStatus = 'dirty' | 'saving' | 'saved' | 'error';

const saveStatusLabels: Record<SaveStatus, string> = {
  dirty: 'Cambios sin guardar',
  saving: 'Guardando...',
  saved: 'Guardado',
  error: 'Error al guardar'
};

const relationToolLabels: Record<string, string> = {
  ASOCIACION: 'Asociación',
  AGREGACION: 'Agregación',
  COMPOSICION: 'Composición',
  HERENCIA: 'Generalización',
  DEPENDENCIA: 'Dependencia'
};

const isRelationTool = (tool: string) => Boolean(relationToolLabels[tool]);

const activityDescriptions: Record<string, string> = {
  NODE_CREATED: 'creó una clase',
  NODE_MOVED: 'movió una clase',
  NODE_UPDATED: 'actualizó una clase',
  NODE_DELETED: 'eliminó una clase',
  EDGE_CREATED: 'creó una relación',
  EDGE_UPDATED: 'actualizó una relación',
  EDGE_DELETED: 'eliminó una relación',
  EDGE_INVERTED: 'invirtió una relación',
  USER_JOINED: 'se conectó',
  USER_LEFT: 'se desconectó',
  LOCK_ELEMENT: 'comenzó a editar un elemento',
  UNLOCK_ELEMENT: 'terminó de editar un elemento',
  PRESENCE_UPDATE: 'actualizó la presencia',
  HISTORY_UPDATE: 'actualizó el historial'
};

const getActivityDescription = (eventType: string) =>
  activityDescriptions[eventType] || 'realizó una acción';

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] || '').slice(0, 2).toUpperCase();
};

export default function UMLEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const userRole = user?.rol || '';
  const userPermissions = user?.permisos || [];
  // Permisos: Admin, Anfitrión y Colaborador tienen derechos de edición
  const canEdit = !user || userPermissions.includes('EDITAR_DIAGRAMAS') || isRoleAdmin(userRole) || isRoleAnfitrion(userRole) || isRoleColaborador(userRole);

  // CU22: Modo de Visualización Móvil (protección contra toques accidentales en celulares)
  const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  const [isReadOnlyView, setIsReadOnlyView] = useState<boolean>(isMobileScreen);
  const isEffectivelyEditing = canEdit && !isReadOnlyView;
  
  const {
    historyEvents, diagramModelUpdate, connectedUsers, presenceReceived, connectionStatus,
    broadcastEvent
  } = useCollaboration(id);

  const [rightTab, setRightTab] = useState<'inspector' | 'colaboracion' | 'chat'>('inspector');
  const [showHistory, setShowHistory] = useState(false);
  const [showXmiImport, setShowXmiImport] = useState(false);
  const [showXmiExport, setShowXmiExport] = useState(false);
  const [showIaModal, setShowIaModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState('select');
  const [pendingRelationSourceId, setPendingRelationSourceId] = useState<string | null>(null);
  const [relationError, setRelationError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRelationMenuOpen, setIsMobileRelationMenuOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [menuMode, setMenuMode] = useState<'full' | 'compact'>('full');

  const headerRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!headerRef.current || !leftRef.current || !rightRef.current) return;
      const available = headerRef.current.offsetWidth;
      const leftWidth = leftRef.current.offsetWidth;
      
      if (menuMode === 'full') {
        const rightWidth = rightRef.current.scrollWidth;
        if (leftWidth + rightWidth + 24 > available) {
          setMenuMode('compact');
        }
      } else {
        if (leftWidth + 900 + 24 <= available) {
          setMenuMode('full');
        }
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [menuMode]);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  
  const {
    nodes, edges, selectedNodeId, selectedEdgeId,
    onNodesChange, onEdgesChange, onConnect,
    setNodes, setEdges, addNode, updateNodeData,
    setSelectedNodeId, setSelectedEdgeId
  } = useEditorStore();

  const diagramClasses = useMemo(() => {
    return (nodes || []).map(n => ({ id: n.id, nombre: (n.data?.nombre as string) || '' }));
  }, [nodes]);

  const [nombreDiagrama, setNombreDiagrama] = useState('Cargando...');
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<number | null>(null);
  const recentActivity = useProjectRecentActivity(proyectoId, diagramModelUpdate);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [diagramVersion, setDiagramVersion] = useState<number | undefined>(undefined);
  const [remoteConflict, setRemoteConflict] = useState('');
  const [pendingRemoteUpdate, setPendingRemoteUpdate] = useState<any | null>(null);
  const [loadError, setLoadError] = useState('');
  const [modelWarnings, setModelWarnings] = useState<string[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const pendingChangeIdRef = useRef<string | null>(null);
  const nombreDiagramaRef = useRef(nombreDiagrama);
  const diagramVersionRef = useRef(diagramVersion);
  const modelWarningsRef = useRef(modelWarnings);

  const openProjectHistory = () => {
    if (proyectoId) navigate(`/proyectos/${proyectoId}?tab=historial`);
    else setShowHistory(true);
  };

  useEffect(() => {
    nombreDiagramaRef.current = nombreDiagrama;
    diagramVersionRef.current = diagramVersion;
    modelWarningsRef.current = modelWarnings;
  }, [nombreDiagrama, diagramVersion, modelWarnings]);

  const handleUpdateNodeData = (nid: string, data: any) => {
    if (!canEdit) return;
    updateNodeData(nid, data);
    const n = nodes.find(x => x.id === nid);
    if (n) broadcastEvent('NODE_UPDATED', nid, { ...n.data, ...data });
  };

  const handleUpdateEdgeData = (eid: string, data: any) => {
    if (!canEdit) return;
    const edge = edges.find(e => e.id === eid);
    if (!edge) return;

    const mergedData = { ...edge.data, ...data };
    
    // Una asociación N:M es UML válido. Crear una clase intermedia requiere
    // una decisión explícita del usuario o una recomendación confirmada.
    const newEdge = { ...edge, data: mergedData };
    setEdges(edges.map(e => e.id === eid ? newEdge : e));
    broadcastEvent('EDGE_UPDATED', eid, newEdge);
  };

  useEffect(() => {
    const fetchDiagrama = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { data } = await api.get(`/diagramas/${id}`);
        setNombreDiagrama(data.nombre);
        setProyectoId(data.proyectoId);
        setDiagramVersion(data.version);
        const parsed: UmlModelJson = data.modeloJson
          ? parsePersistedModel(data.modeloJson)
          : { clases: [], relaciones: [], advertencias: [] };
        const loaded = modelToEditorElements(parsed);
        const loadedEdges = loaded.edges.map(edge => ({
          ...edge,
          markerEnd: getMarkerEnd(edge.data?.tipo as string)
        }));

        const warnings = parsed.advertencias || [];
        const normalizedLoadedModel = modelFromEditorElements(loaded.nodes, loadedEdges, warnings);
        lastSavedSnapshotRef.current = diagramSnapshot(data.nombre, normalizedLoadedModel);
        setModelWarnings(warnings);
        setNodes(loaded.nodes);
        setEdges(loadedEdges);
        setSaveError('');
        setRemoteConflict('');
        setPendingRemoteUpdate(null);
        setSaveStatus('saved');
        if (loaded.nodes.length > 0) setFitViewRequest(value => value + 1);
      } catch (error) {
        console.error('Error cargando diagrama:', error);
        setNodes([]);
        setEdges([]);
        setModelWarnings([]);
        lastSavedSnapshotRef.current = null;
        setLoadError(
          error instanceof Error
            ? `No se pudo restaurar el diagrama: ${error.message}`
            : 'No se pudo restaurar el diagrama guardado.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiagrama();
  }, [id, loadAttempt, setNodes, setEdges]);

  useEffect(() => {
    if (!diagramModelUpdate?.payload?.modeloJson) return;
    try {
      const parsed = parsePersistedModel(diagramModelUpdate.payload.modeloJson);
      const loaded = modelToEditorElements(parsed);
      const loadedEdges = loaded.edges.map(edge => ({
        ...edge,
        markerEnd: getMarkerEnd(edge.data?.tipo as string)
      }));
      const normalized = modelFromEditorElements(loaded.nodes, loadedEdges, parsed.advertencias || []);
      const remoteName = diagramModelUpdate.payload.nombre || nombreDiagramaRef.current;
      const remoteSnapshot = diagramSnapshot(remoteName, normalized);
      const currentState = useEditorStore.getState();
      const currentModel = modelFromEditorElements(
        currentState.nodes,
        currentState.edges,
        modelWarningsRef.current
      );
      const currentSnapshot = diagramSnapshot(nombreDiagramaRef.current, currentModel);
      const action = resolveRemoteModelUpdate({
        currentSnapshot,
        lastSavedSnapshot: lastSavedSnapshotRef.current,
        remoteSnapshot,
        currentVersion: diagramVersionRef.current,
        remoteVersion: diagramModelUpdate.payload.version,
        pendingChangeId: pendingChangeIdRef.current,
        remoteChangeId: diagramModelUpdate.payload.changeId
      });

      if (action === 'ignore') return;
      if (action === 'conflict') {
        setPendingRemoteUpdate(diagramModelUpdate);
        setRemoteConflict('Hay una versión remota nueva y también tienes cambios locales. Tu canvas no fue sobrescrito.');
        return;
      }

      lastSavedSnapshotRef.current = remoteSnapshot;
      setDiagramVersion(diagramModelUpdate.payload.version);
      setRemoteConflict('');
      setPendingRemoteUpdate(null);

      if (action === 'apply' || currentSnapshot === remoteSnapshot) {
        setNombreDiagrama(remoteName);
        setModelWarnings(parsed.advertencias || []);
        setNodes(loaded.nodes);
        setEdges(loadedEdges);
        setSaveStatus('saved');
      } else {
        // The own commit was confirmed while newer local edits were already in progress.
        setSaveStatus('dirty');
      }
    } catch (err) {
      console.warn('Error procesando actualización remota:', err);
      setRemoteConflict('Se recibió una actualización remota inválida; el canvas local no fue modificado.');
    }
  }, [diagramModelUpdate, setNodes, setEdges]);

  useEffect(() => {
    if (!reactFlowInstance || fitViewRequest === 0) return;
    const frame = requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    });
    return () => cancelAnimationFrame(frame);
  }, [reactFlowInstance, fitViewRequest]);

  const buildCurrentModel = (): UmlModelJson =>
    modelFromEditorElements(nodes, edges, modelWarnings);

  const applyPendingRemoteUpdate = () => {
    if (!pendingRemoteUpdate?.payload?.modeloJson) return;
    try {
      const parsed = parsePersistedModel(pendingRemoteUpdate.payload.modeloJson);
      const loaded = modelToEditorElements(parsed);
      const loadedEdges = loaded.edges.map(edge => ({
        ...edge,
        markerEnd: getMarkerEnd(edge.data?.tipo as string)
      }));
      const remoteName = pendingRemoteUpdate.payload.nombre || nombreDiagramaRef.current;
      const normalized = modelFromEditorElements(loaded.nodes, loadedEdges, parsed.advertencias || []);
      lastSavedSnapshotRef.current = diagramSnapshot(remoteName, normalized);
      setNombreDiagrama(remoteName);
      setModelWarnings(parsed.advertencias || []);
      setNodes(loaded.nodes);
      setEdges(loadedEdges);
      setDiagramVersion(pendingRemoteUpdate.payload.version);
      setPendingRemoteUpdate(null);
      setRemoteConflict('');
      setSaveError('');
      setSaveStatus('saved');
    } catch {
      setRemoteConflict('La versión remota no es válida y no se aplicó.');
    }
  };

  const downloadLocalConflictCopy = () => {
    const localCopy = JSON.stringify({
      nombre: nombreDiagrama,
      versionBase: diagramVersion,
      modelo: buildCurrentModel()
    }, null, 2);
    const url = URL.createObjectURL(new Blob([localCopy], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `umlforge-${nombreDiagrama || 'diagrama'}-copia-local.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (loading || !lastSavedSnapshotRef.current || saveStatus === 'saving' || saveStatus === 'error') {
      return;
    }
    const currentSnapshot = diagramSnapshot(nombreDiagrama, buildCurrentModel());
    const nextStatus = currentSnapshot === lastSavedSnapshotRef.current ? 'saved' : 'dirty';
    if (saveStatus !== nextStatus) setSaveStatus(nextStatus);
  }, [nodes, edges, modelWarnings, nombreDiagrama, loading, saveStatus]);

  const persistModel = async (modelo: UmlModelJson): Promise<boolean> => {
    if (!id) {
      setSaveStatus('error');
      setSaveError('No se puede guardar porque falta el identificador del diagrama.');
      return false;
    }

    const nombreGuardado = nombreDiagrama;
    const submittedSnapshot = diagramSnapshot(nombreGuardado, modelo);
    const changeId = globalThis.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random()}`;
    pendingChangeIdRef.current = changeId;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const newVersion = await saveDiagramModel(api, id, nombreGuardado, modelo, diagramVersion, changeId);
      if (newVersion !== undefined) setDiagramVersion(newVersion);
      lastSavedSnapshotRef.current = submittedSnapshot;

      const currentState = useEditorStore.getState();
      const currentModel = modelFromEditorElements(currentState.nodes, currentState.edges, modelWarningsRef.current);
      const currentSnapshot = diagramSnapshot(nombreDiagramaRef.current, currentModel);
      setSaveStatus(currentSnapshot === submittedSnapshot ? 'saved' : 'dirty');
      return true;
    } catch (error) {
      console.error('Error guardando:', error);
      setSaveStatus('error');
      const conflict = error?.response?.status === 409;
      if (conflict) {
        try {
          const { data: latest } = await api.get(`/diagramas/${id}`);
          setPendingRemoteUpdate({
            payload: {
              modeloJson: latest.modeloJson,
              nombre: latest.nombre,
              version: latest.version,
              updateType: 'CONFLICT_REFRESH'
            }
          });
          setRemoteConflict('Hay una versión remota nueva y también tienes cambios locales. Tu canvas no fue sobrescrito.');
        } catch {
          // The local model remains intact even if the conflict refresh fails.
        }
      }
      setSaveError(conflict
        ? 'El diagrama cambió en otra sesión. Tus cambios siguen visibles; guarda una copia local y elige qué versión conservar.'
        : 'No se pudo guardar el diagrama. Los cambios siguen visibles y puedes reintentar.');
      return false;
    } finally {
      if (pendingChangeIdRef.current === changeId) pendingChangeIdRef.current = null;
    }
  };

  const handleSave = async () => {
    if (saveStatus === 'saving' || !canEdit) return;
    await persistModel(buildCurrentModel());
  };

  const [showGenerateBackendModal, setShowGenerateBackendModal] = useState(false);
  const [showGenerateMobileModal, setShowGenerateMobileModal] = useState(false);
  const [isGeneratingBackend, setIsGeneratingBackend] = useState(false);
  const [isGeneratingMobile, setIsGeneratingMobile] = useState(false);

  const handleGenerateBackend = async (dbConfig: any) => {
    try {
      setIsGeneratingBackend(true);
      const modelo = buildCurrentModel();

      const requestPayload = {
        umlModel: modelo,
        databaseConfig: dbConfig
      };

      const response = await api.post('/generate/backend', requestPayload, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'umlforge-generated-backend.zip');
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      alert('Backend generado correctamente.');
    } catch (error) {
      console.error('Error generando backend:', error);
      alert('Error al generar el backend.');
    } finally {
      setIsGeneratingBackend(false);
    }
  };

  const handleGenerateMobile = async () => {
    try {
      setIsGeneratingMobile(true);
      const modelo = buildCurrentModel();

      const response = await api.post('/generate/mobile', modelo, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'umlforge-generated-mobile.zip');
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      alert('App Flutter generada correctamente.');
    } catch (error) {
      console.error('Error generando app móvil:', error);
      alert('Error al generar la aplicación móvil.');
    } finally {
      setIsGeneratingMobile(false);
    }
  };

  const handleDeleteSelected = () => {
    if (!canEdit) return;
    if (selectedNodeId) {
      const n = nodes.find(node => node.id === selectedNodeId);
      if (n) handleDeleteClass(n);
    } else if (selectedEdgeId) {
      setEdges(edges.filter(e => e.id !== selectedEdgeId));
      broadcastEvent('EDGE_DELETED', selectedEdgeId);
      setSelectedEdgeId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      if (e.key === 'Delete') {
        handleDeleteSelected();
      }
      
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setPendingRelationSourceId(null);
        setRelationError('');
        setIsMobileRelationMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, nodes, edges, handleSave, setSelectedNodeId, setSelectedEdgeId, setEdges, canEdit]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const getMarkerEnd = (tipo: string) => {
    switch(tipo) {
      case 'HERENCIA': return { type: MarkerType.ArrowClosed, color: '#8B5CF6' };
      case 'AGREGACION': return { type: MarkerType.ArrowClosed, color: '#8B5CF6' };
      case 'COMPOSICION': return { type: MarkerType.ArrowClosed, color: '#8B5CF6' };
      case 'DEPENDENCIA': return { type: MarkerType.ArrowClosed, color: '#8B5CF6' };
      default: return '';
    }
  };

  const handleToolChange = (tool: string) => {
    setSelectedTool(tool);
    setPendingRelationSourceId(null);
    setRelationError('');
    setIsMobileRelationMenuOpen(false);
  };

  const handleNodeClick = (node: Node) => {
    if (!canEdit) return;

    if (!isRelationTool(selectedTool)) {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      setRightTab('inspector');
      setIsRightPanelOpen(true);
      return;
    }

    if (!pendingRelationSourceId) {
      setPendingRelationSourceId(node.id);
      setRelationError('');
      setSelectedNodeId(node.id);
      return;
    }

    // Autorrelaciones permitidas
    const newEdge: Edge = {
      id: generateId(),
      source: pendingRelationSourceId,
      target: node.id,
      type: 'umlRelation',
      data: {
        tipo: selectedTool,
        nombre: '',
        multiplicidadOrigen: '',
        multiplicidadDestino: '',
        rolOrigen: '',
        rolDestino: ''
      },
      markerEnd: getMarkerEnd(selectedTool)
    };

    setEdges([...edges, newEdge]);
    broadcastEvent('EDGE_CREATED', newEdge.id, newEdge);
    setPendingRelationSourceId(null);
    setRelationError('');
    setSelectedEdgeId(newEdge.id);
    setSelectedNodeId(null);
    setRightTab('inspector');
    setIsRightPanelOpen(true);
    setSelectedTool('select');
  };

  const applyUmlModel = (model: UmlModelJson, persistAfterApply = false) => {
    const elements = modelToEditorElements(model);
    const modelNodes = elements.nodes;
    const modelEdges = elements.edges.map(edge => ({
      ...edge,
      markerEnd: getMarkerEnd(edge.data?.tipo as string)
    }));

    edges.forEach(edge => broadcastEvent('EDGE_DELETED', edge.id));
    nodes.forEach(node => broadcastEvent('NODE_DELETED', node.id));
    modelNodes.forEach(node => broadcastEvent('NODE_CREATED', node.id, node));
    modelEdges.forEach(edge => broadcastEvent('EDGE_CREATED', edge.id, edge));

    setNodes(modelNodes);
    setEdges(modelEdges);
    const warnings = model.advertencias || [];
    setModelWarnings(warnings);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    if (modelNodes.length > 0) setFitViewRequest(value => value + 1);

    const exactAppliedModel = modelFromEditorElements(modelNodes, modelEdges, warnings);
    if (persistAfterApply) {
      void persistModel(exactAppliedModel);
    } else {
      setSaveError('');
      setSaveStatus('dirty');
    }
  };

  const handleImportXmi = (model: UmlModelJson) => {
    applyUmlModel(model);
    setShowXmiImport(false);
    alert('Modelo XMI importado. Recuerda guardar los cambios.');
  };

  const handleAddClass = () => {
    if (!canEdit) return;
    
    // Posicionar cerca del centro de la vista actual
    let posX = Math.random() * 150 + 60;
    let posY = Math.random() * 150 + 60;
    if (reactFlowInstance) {
      const zoom = reactFlowInstance.getZoom() || 1;
      const viewport = reactFlowInstance.getViewport();
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 800;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 600;
      posX = (-viewport.x + (screenW < 768 ? screenW / 2 - 120 : screenW / 3)) / zoom;
      posY = (-viewport.y + (screenH < 768 ? screenH / 3 : screenH / 4)) / zoom;
    }

    const newNode: Node = {
      id: generateId(),
      type: 'umlClass',
      position: { x: posX, y: posY },
      data: {
        nombre: 'NuevaClase',
        estereotipo: '',
        atributos: [],
        metodos: []
      }
    };
    addNode(newNode);
    broadcastEvent('NODE_CREATED', newNode.id, newNode);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
    setRightTab('inspector');
    setIsRightPanelOpen(true);
  };

  const handleDeleteClass = (n: Node) => {
    if (!canEdit) return;
    const nodeRelations = edges.filter(e => e.source === n.id || e.target === n.id);
    if (nodeRelations.length > 0) {
      if (!window.confirm(`Esta clase tiene ${nodeRelations.length} relaciones asociadas.\n¿Deseas eliminarla?`)) {
        return;
      }
    }
    
    setEdges(edges.filter(e => e.source !== n.id && e.target !== n.id));
    nodeRelations.forEach(e => broadcastEvent('EDGE_DELETED', e.id));
    setNodes(nodes.filter(node => node.id !== n.id));
    broadcastEvent('NODE_DELETED', n.id);
    setSelectedNodeId(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);
  const pendingRelationSource = nodes.find(n => n.id === pendingRelationSourceId);

  // --- INTEGRACIÓN DE CONTROL POR VOZ (CU14) ---
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState<VoiceCommand | null>(null);
  const isExecutingVoiceCommandRef = useRef(false);
  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleVoiceTranscriptFinal = (finalText: string) => {
    const currentNodes = nodesRef.current;
    const nodeRefs = currentNodes.map(n => ({ id: n.id, nombre: n.data.nombre as string }));
    const parsedCmd = interpretVoiceCommand(finalText, nodeRefs);
    setVoiceCommand(parsedCmd);
    voiceRecognition.setState('comando_reconocido');
  };

  const voiceRecognition = useVoiceRecognition(handleVoiceTranscriptFinal);

  const handleOpenVoice = () => {
    setIsVoiceModalOpen(true);
    setVoiceCommand(null);
    voiceRecognition.startListening();
  };

  const handleCloseVoice = () => {
    setIsVoiceModalOpen(false);
    voiceRecognition.cancelVoice();
    setVoiceCommand(null);
  };

  const handleExecuteVoiceCommand = (cmd: VoiceCommand) => {
    if (isExecutingVoiceCommandRef.current) return;
    isExecutingVoiceCommandRef.current = true;

    try {
      if (cmd.requierePermisoEdicion && !canEdit) {
        alert('No tienes permisos de edición para ejecutar este comando de voz.');
        return;
      }

      switch (cmd.tipo) {
        case 'CREAR_CLASE': {
          if (!cmd.payload?.nombreClase) return;
          const className = cmd.payload.nombreClase;

          let posX = Math.random() * 150 + 60;
          let posY = Math.random() * 150 + 60;
          if (reactFlowInstance) {
            const zoom = reactFlowInstance.getZoom() || 1;
            const viewport = reactFlowInstance.getViewport();
            const screenW = typeof window !== 'undefined' ? window.innerWidth : 800;
            const screenH = typeof window !== 'undefined' ? window.innerHeight : 600;
            posX = (-viewport.x + (screenW < 768 ? screenW / 2 - 120 : screenW / 3)) / zoom;
            posY = (-viewport.y + (screenH < 768 ? screenH / 3 : screenH / 4)) / zoom;
          }

          const newNode: Node = {
            id: generateId(),
            type: 'umlClass',
            position: { x: posX, y: posY },
            data: {
              nombre: className,
              estereotipo: '',
              atributos: [],
              metodos: []
            }
          };
          addNode(newNode);
          broadcastEvent('NODE_CREATED', newNode.id, newNode);
          setSelectedNodeId(newNode.id);
          setSelectedEdgeId(null);
          setRightTab('inspector');
          setIsRightPanelOpen(true);
          break;
        }

        case 'AGREGAR_ATRIBUTO': {
          if (!cmd.payload?.nombreClase || !cmd.payload?.atributo) return;
          const targetName = cmd.payload.nombreClase.toLowerCase();
          const targetNode = nodes.find(n => (n.data.nombre as string || '').toLowerCase() === targetName);
          if (!targetNode) return;

          const currentAttrs = (targetNode.data.atributos as any[]) || [];
          const newAttr = {
            id: generateId(),
            nombre: cmd.payload.atributo.nombre,
            tipo: cmd.payload.atributo.tipo,
            visibilidad: cmd.payload.atributo.visibilidad || 'private',
            origenTipo: 'USUARIO'
          };
          handleUpdateNodeData(targetNode.id, { atributos: [...currentAttrs, newAttr] });
          setSelectedNodeId(targetNode.id);
          setSelectedEdgeId(null);
          setRightTab('inspector');
          setIsRightPanelOpen(true);
          break;
        }

        case 'RELACIONAR_CLASES': {
          if (!cmd.payload?.origenClase || !cmd.payload?.destinoClase) return;
          const srcName = cmd.payload.origenClase.toLowerCase();
          const dstName = cmd.payload.destinoClase.toLowerCase();
          const sourceNode = nodes.find(n => (n.data.nombre as string || '').toLowerCase() === srcName);
          const targetNode = nodes.find(n => (n.data.nombre as string || '').toLowerCase() === dstName);
          if (!sourceNode || !targetNode) return;

          const relType = cmd.payload.tipoRelacion || 'ASOCIACION';
          const newEdge: Edge = {
            id: generateId(),
            source: sourceNode.id,
            target: targetNode.id,
            type: 'umlRelation',
            data: {
              tipo: relType,
              nombre: '',
              multiplicidadOrigen: '',
              multiplicidadDestino: '',
              rolOrigen: '',
              rolDestino: ''
            },
            markerEnd: getMarkerEnd(relType)
          };

          setEdges([...edges, newEdge]);
          broadcastEvent('EDGE_CREATED', newEdge.id, newEdge);
          setSelectedEdgeId(newEdge.id);
          setSelectedNodeId(null);
          setRightTab('inspector');
          setIsRightPanelOpen(true);
          break;
        }

        case 'GUARDAR_DIAGRAMA': {
          void handleSave();
          break;
        }

        case 'CENTRAR_DIAGRAMA': {
          reactFlowInstance?.fitView({ padding: 0.2, duration: 300 });
          break;
        }

        default:
          break;
      }

      setIsVoiceModalOpen(false);
      voiceRecognition.cancelVoice();
      setVoiceCommand(null);
    } finally {
      setTimeout(() => {
        isExecutingVoiceCommandRef.current = false;
      }, 400);
    }
  };

  // CU22: Ficha de inspección y consulta de solo lectura para móvil
  const renderReadOnlyInspectorContent = () => {
    if (!selectedNode && !selectedEdge) {
      return (
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 rounded-2xl bg-lila-light/30 text-lila-main flex items-center justify-center mx-auto mb-3">
            <Eye className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">Modo Visualización</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Toca cualquier clase o relación en el diagrama para inspeccionar sus atributos, métodos o multiplicidades sin riesgo de modificarla accidentalmente.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsReadOnlyView(false)}
              className="mt-4 px-4 py-2.5 min-h-[44px] bg-lila-main text-white text-xs font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2 shadow-xs"
            >
              <Edit2 className="w-4 h-4" /> Cambiar a Modo Edición
            </button>
          )}
        </div>
      );
    }

    if (selectedNode) {
      const attrs = (selectedNode.data.atributos as any[]) || [];
      const methods = (selectedNode.data.metodos as any[]) || [];
      const connected = edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);

      return (
        <div className="space-y-4">
          {/* Header de la Clase */}
          <div className="p-3.5 bg-lila-light/25 border border-lila-light/50 rounded-2xl">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-lila-main uppercase tracking-wider">Clase UML</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-100">
                Solo Lectura
              </span>
            </div>
            {selectedNode.data.estereotipo && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">&lt;&lt;{selectedNode.data.estereotipo}&gt;&gt;</p>
            )}
            <h3 className="text-lg font-bold text-text-dark break-words mt-0.5">
              {selectedNode.data.nombre}
            </h3>
          </div>

          {/* Atributos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Atributos ({attrs.length})
              </span>
            </div>
            {attrs.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-2 px-3 bg-gray-50 rounded-xl">
                Sin atributos definidos.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200/70 bg-white overflow-hidden">
                {attrs.map((attr, idx) => (
                  <div key={attr.id || idx} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-600 font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                        {attr.visibilidad === 'public' ? '+' : attr.visibilidad === 'private' ? '-' : attr.visibilidad === 'protected' ? '#' : '~'}
                      </span>
                      <span className="font-semibold text-gray-800 truncate">{attr.nombre}</span>
                    </div>
                    <span className="font-mono text-lila-main font-semibold bg-lila-light/20 px-2 py-0.5 rounded text-[11px] shrink-0">
                      {attr.tipo || 'Object'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Métodos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Métodos ({methods.length})
              </span>
            </div>
            {methods.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-2 px-3 bg-gray-50 rounded-xl">
                Sin métodos definidos.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200/70 bg-white overflow-hidden">
                {methods.map((method, idx) => {
                  const params = Array.isArray(method.parametros) ? method.parametros : [];
                  return (
                    <div key={method.id || idx} className="p-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-pink-50 text-pink-600 font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                            {method.visibilidad === 'public' ? '+' : method.visibilidad === 'private' ? '-' : method.visibilidad === 'protected' ? '#' : '~'}
                          </span>
                          <span className="font-semibold text-gray-800 truncate">{method.nombre}()</span>
                        </div>
                        <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-[11px] shrink-0">
                          {method.tipoRetorno || 'void'}
                        </span>
                      </div>
                      {params.length > 0 && (
                        <div className="pl-7 text-[11px] text-gray-500 font-mono">
                          Parámetros: {params.map((p: any) => `${p.nombre}: ${p.tipo}`).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Relaciones Conectadas */}
          {connected.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Relaciones ({connected.length})
              </span>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200/70 bg-white overflow-hidden text-xs">
                {connected.map(edge => {
                  const isSource = edge.source === selectedNode.id;
                  const otherNodeId = isSource ? edge.target : edge.source;
                  const otherNode = nodes.find(n => n.id === otherNodeId);
                  const relType = relationToolLabels[edge.data?.tipo as string] || edge.data?.tipo || 'Relación';
                  return (
                    <div key={edge.id} className="p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {isSource ? 'Hacia ' : 'Desde '} {otherNode?.data.nombre || 'Clase'}
                        </p>
                        <p className="text-[11px] text-gray-500">{relType}</p>
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700 shrink-0">
                        {isSource ? (edge.data?.multiplicidadDestino || '1') : (edge.data?.multiplicidadOrigen || '1')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedNodeId(null);
                setIsRightPanelOpen(false);
              }}
              className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Cerrar ficha
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsReadOnlyView(false)}
                className="py-2.5 px-3 bg-lila-light/40 text-lila-main hover:bg-lila-light/70 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
              >
                Editar clase
              </button>
            )}
          </div>
        </div>
      );
    }

    if (selectedEdge) {
      const sourceNode = nodes.find(n => n.id === selectedEdge.source);
      const targetNode = nodes.find(n => n.id === selectedEdge.target);
      const relType = relationToolLabels[selectedEdge.data?.tipo as string] || selectedEdge.data?.tipo || 'Asociación';

      return (
        <div className="space-y-4">
          <div className="p-3.5 bg-pink-light/25 border border-pink-light/50 rounded-2xl">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-pink-main uppercase tracking-wider">Relación UML</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-100">
                Solo Lectura
              </span>
            </div>
            <h3 className="text-base font-bold text-text-dark mt-0.5">{relType}</h3>
            {selectedEdge.data?.nombre && (
              <p className="text-xs text-gray-600 font-medium mt-0.5">Nombre: {selectedEdge.data.nombre}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200/70 bg-white divide-y divide-gray-100 text-xs overflow-hidden">
            <div className="p-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Clase Origen</span>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{sourceNode?.data.nombre || 'Clase Origen'}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                <span>Multiplicidad: <strong>{selectedEdge.data?.multiplicidadOrigen || '1'}</strong></span>
                {selectedEdge.data?.rolOrigen && <span>Rol: <em>{selectedEdge.data.rolOrigen}</em></span>}
              </div>
            </div>

            <div className="p-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Clase Destino</span>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{targetNode?.data.nombre || 'Clase Destino'}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                <span>Multiplicidad: <strong>{selectedEdge.data?.multiplicidadDestino || '1'}</strong></span>
                {selectedEdge.data?.rolDestino && <span>Rol: <em>{selectedEdge.data.rolDestino}</em></span>}
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedEdgeId(null);
                setIsRightPanelOpen(false);
              }}
              className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Cerrar ficha
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsReadOnlyView(false)}
                className="py-2.5 px-3 bg-pink-light/40 text-pink-700 hover:bg-pink-light/70 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
              >
                Editar relación
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Renderizador unificado para el contenido del Inspector (compartido entre escritorio y celular)
  const renderEditInspectorContent = () => (
    <>
      {!selectedNode && !selectedEdge && (
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 rounded-2xl bg-lila-light/30 text-lila-main flex items-center justify-center mx-auto mb-3">
            <Settings2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">Sin elemento seleccionado</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Toca una clase o relación en el lienzo para ver y editar sus atributos, métodos o multiplicidades.
          </p>
          {canEdit && (
            <button
              onClick={handleAddClass}
              className="mt-4 px-4 py-2.5 min-h-[44px] bg-lila-main text-white text-xs font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <PlusSquare className="w-4 h-4" /> Crear una clase
            </button>
          )}
        </div>
      )}

      {/* Si es CLASE */}
      {selectedNode && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estereotipo</label>
            <input 
              className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lila-main"
              placeholder="ej: entity, interface, abstract"
              disabled={!canEdit}
              value={selectedNode.data.estereotipo as string || ''}
              onChange={(e) => handleUpdateNodeData(selectedNode.id, { estereotipo: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de Clase</label>
            <input 
              className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-lila-main"
              disabled={!canEdit}
              value={selectedNode.data.nombre as string}
              onChange={(e) => handleUpdateNodeData(selectedNode.id, { nombre: e.target.value })}
            />
          </div>

          {/* Atributos */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atributos</label>
              {canEdit && (
                <button 
                  onClick={() => {
                    const arr = selectedNode.data.atributos as any[] || [];
                    handleUpdateNodeData(selectedNode.id, { atributos: [...arr, { id: generateId(), nombre: 'nuevo', tipo: 'String', visibilidad: 'private', origenTipo: 'USUARIO' }]});
                  }}
                  className="text-lila-main hover:text-pink-main text-xs font-bold flex items-center gap-1 min-h-[32px] px-2 py-1 rounded hover:bg-lila-light/20 transition-colors"
                >
                  <PlusSquare className="w-3.5 h-3.5" /> Agregar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {((selectedNode.data.atributos as any[]) || []).map((attr, idx) => (
                <div key={attr.id} className="flex flex-col gap-1.5 p-2 bg-gray-50 border border-gray-200/80 rounded-xl min-w-0 w-full box-border">
                  <div className="flex gap-1.5 items-center min-w-0 w-full">
                    <select 
                      className="bg-white border border-gray-200 rounded-lg text-xs px-2 py-1.5 min-h-[38px] font-bold text-gray-700 shrink-0"
                      disabled={!canEdit}
                      value={attr.visibilidad}
                      title="Visibilidad del atributo"
                      onChange={(e) => {
                        const arr = [...(selectedNode.data.atributos as any[])];
                        arr[idx].visibilidad = e.target.value;
                        handleUpdateNodeData(selectedNode.id, { atributos: arr });
                      }}
                    >
                      <option value="unspecified">?</option>
                      <option value="public">+</option>
                      <option value="private">-</option>
                      <option value="protected">#</option>
                    </select>
                    <input 
                      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 min-h-[38px] focus:outline-none focus:ring-1 focus:ring-lila-main"
                      disabled={!canEdit}
                      placeholder="nombreAtributo"
                      value={attr.nombre}
                      onChange={(e) => {
                        const arr = [...(selectedNode.data.atributos as any[])];
                        arr[idx].nombre = e.target.value;
                        handleUpdateNodeData(selectedNode.id, { atributos: arr });
                      }}
                    />
                    {canEdit && (
                      <button 
                        onClick={() => {
                          const arr = [...(selectedNode.data.atributos as any[])];
                          arr.splice(idx, 1);
                          handleUpdateNodeData(selectedNode.id, { atributos: arr });
                        }} 
                        className="p-1.5 min-w-[38px] min-h-[38px] shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg transition-colors hover:bg-red-50"
                        title="Eliminar atributo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 w-full">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide shrink-0 pl-1">Tipo:</span>
                    <input 
                      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg text-xs px-2.5 py-1 min-h-[34px] focus:outline-none focus:ring-1 focus:ring-lila-main font-mono"
                      disabled={!canEdit}
                      placeholder="String, int, float..."
                      value={attr.tipo}
                      onChange={(e) => {
                        const arr = [...(selectedNode.data.atributos as any[])];
                        arr[idx].tipo = e.target.value;
                        arr[idx].origenTipo = 'USUARIO';
                        handleUpdateNodeData(selectedNode.id, { atributos: arr });
                      }}
                    />
                    {attr.origenTipo && attr.origenTipo !== 'USUARIO' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium shrink-0">
                        {attr.origenTipo}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!selectedNode.data.atributos || selectedNode.data.atributos.length === 0) && (
                <div className="text-xs text-gray-400 italic py-1">Sin atributos definidos.</div>
              )}
            </div>
          </div>

          {/* Métodos */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Métodos</label>
              {canEdit && (
                <button 
                  onClick={() => {
                    const arr = selectedNode.data.metodos as any[] || [];
                    handleUpdateNodeData(selectedNode.id, { metodos: [...arr, { id: generateId(), nombre: 'nuevoMetodo', tipoRetorno: 'void', visibilidad: 'public', parametros: [] }]});
                  }}
                  className="text-lila-main hover:text-pink-main text-xs font-bold flex items-center gap-1 min-h-[32px] px-2 py-1 rounded hover:bg-lila-light/20 transition-colors"
                >
                  <PlusSquare className="w-3.5 h-3.5" /> Agregar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {((selectedNode.data.metodos as any[]) || []).map((method, idx) => (
                <div key={method.id} className="flex flex-col gap-2 p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl min-w-0 w-full box-border">
                  <div className="flex gap-1.5 items-center min-w-0 w-full">
                    <select 
                      className="bg-white border border-gray-200 rounded-lg text-xs px-2 py-1.5 min-h-[38px] font-bold text-gray-700 shrink-0"
                      disabled={!canEdit}
                      value={method.visibilidad}
                      title="Visibilidad del método"
                      onChange={(e) => {
                        const arr = [...(selectedNode.data.metodos as any[])];
                        arr[idx].visibilidad = e.target.value;
                        handleUpdateNodeData(selectedNode.id, { metodos: arr });
                      }}
                    >
                      <option value="unspecified">?</option>
                      <option value="public">+</option>
                      <option value="private">-</option>
                      <option value="protected">#</option>
                    </select>
                    <input 
                      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 min-h-[38px] focus:outline-none focus:ring-1 focus:ring-lila-main"
                      disabled={!canEdit}
                      value={method.nombre}
                      placeholder="nombreMetodo"
                      onChange={(e) => {
                        const arr = [...(selectedNode.data.metodos as any[])];
                        arr[idx].nombre = e.target.value;
                        handleUpdateNodeData(selectedNode.id, { metodos: arr });
                      }}
                    />
                    {canEdit && (
                      <button 
                        onClick={() => {
                          const arr = [...(selectedNode.data.metodos as any[])];
                          arr.splice(idx, 1);
                          handleUpdateNodeData(selectedNode.id, { metodos: arr });
                        }} 
                        className="p-1.5 min-w-[38px] min-h-[38px] shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg transition-colors hover:bg-red-50"
                        title="Eliminar método"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Parámetros del método */}
                  <div className="bg-white/90 p-2 rounded-lg border border-gray-100 space-y-1.5 min-w-0 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Parámetros</span>
                      {canEdit && (
                        <button 
                          onClick={() => {
                            const arr = [...(selectedNode.data.metodos as any[])];
                            arr[idx].parametros = [...(arr[idx].parametros || []), { nombre: 'p', tipo: 'String' }];
                            handleUpdateNodeData(selectedNode.id, { metodos: arr });
                          }} 
                          className="text-[10px] font-bold text-lila-main hover:underline py-0.5"
                        >
                          + Parámetro
                        </button>
                      )}
                    </div>
                    {(Array.isArray(method.parametros) ? method.parametros : []).map((p: any, pIdx: number) => (
                      <div key={pIdx} className="flex gap-1.5 items-center min-w-0 w-full">
                        <input 
                          className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg text-xs px-2 py-1 min-h-[32px]"
                          disabled={!canEdit}
                          value={p.nombre}
                          placeholder="nombre"
                          onChange={(e) => {
                            const arr = [...(selectedNode.data.metodos as any[])];
                            arr[idx].parametros[pIdx].nombre = e.target.value;
                            handleUpdateNodeData(selectedNode.id, { metodos: arr });
                          }}
                        />
                        <span className="text-xs text-gray-400 shrink-0">:</span>
                        <input 
                          className="w-24 min-w-0 bg-white border border-gray-200 rounded-lg text-xs px-2 py-1 min-h-[32px] font-mono"
                          disabled={!canEdit}
                          value={p.tipo}
                          placeholder="tipo"
                          onChange={(e) => {
                            const arr = [...(selectedNode.data.metodos as any[])];
                            arr[idx].parametros[pIdx].tipo = e.target.value;
                            handleUpdateNodeData(selectedNode.id, { metodos: arr });
                          }}
                        />
                        {canEdit && (
                          <button 
                            onClick={() => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].parametros.splice(pIdx, 1);
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }} 
                            className="p-1 min-w-[32px] min-h-[32px] shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Retorno */}
                  <div className="flex gap-2 items-center justify-between pt-1 border-t border-gray-100 min-w-0 w-full">
                    <span className="text-[11px] font-bold text-gray-500 shrink-0">Retorno:</span>
                    <input 
                      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 min-h-[34px] font-mono"
                      disabled={!canEdit}
                      value={method.tipoRetorno}
                      placeholder="void"
                      onChange={(e) => {
                        const arr = [...(selectedNode.data.metodos as any[])];
                        arr[idx].tipoRetorno = e.target.value;
                        handleUpdateNodeData(selectedNode.id, { metodos: arr });
                      }}
                    />
                  </div>
                </div>
              ))}
              {(!selectedNode.data.metodos || selectedNode.data.metodos.length === 0) && (
                <div className="text-xs text-gray-400 italic py-1">Sin métodos definidos.</div>
              )}
            </div>
          </div>

          {canEdit && (
            <button
              onClick={() => handleDeleteClass(selectedNode)}
              className="w-full mt-4 py-2.5 min-h-[44px] bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-98 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar clase
            </button>
          )}
        </div>
      )}

      {/* Si es RELATION EDGE */}
      {selectedEdge && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Relación</label>
            <select 
              className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-lila-main"
              disabled={!canEdit}
              value={selectedEdge.data?.tipo as string || 'ASOCIACION'}
              onChange={(e) => {
                handleUpdateEdgeData(selectedEdge.id, { tipo: e.target.value });
                setEdges(edges.map(edge => edge.id === selectedEdge.id ? { ...edge, markerEnd: getMarkerEnd(e.target.value) } : edge));
              }}
            >
              <option value="ASOCIACION">Asociación</option>
              <option value="HERENCIA">Generalización (Herencia)</option>
              <option value="AGREGACION">Agregación</option>
              <option value="COMPOSICION">Composición</option>
              <option value="DEPENDENCIA">Dependencia</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mult. Origen</label>
              <input 
                className="w-full px-2.5 py-2 bg-bg-main border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-lila-main"
                disabled={!canEdit}
                list="multiplicities" 
                placeholder="ej: 1, 0..*"
                value={selectedEdge.data?.multiplicidadOrigen as string || ''}
                onChange={(e) => {
                  handleUpdateEdgeData(selectedEdge.id, { multiplicidadOrigen: e.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mult. Destino</label>
              <input 
                className="w-full px-2.5 py-2 bg-bg-main border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-lila-main"
                disabled={!canEdit}
                list="multiplicities" 
                placeholder="ej: 1, 0..*"
                value={selectedEdge.data?.multiplicidadDestino as string || ''}
                onChange={(e) => {
                  handleUpdateEdgeData(selectedEdge.id, { multiplicidadDestino: e.target.value });
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rol Origen</label>
              <input 
                className="w-full px-2.5 py-2 bg-bg-main border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                disabled={!canEdit}
                placeholder="ej: cliente"
                value={selectedEdge.data?.rolOrigen as string || ''}
                onChange={(e) => {
                  handleUpdateEdgeData(selectedEdge.id, { rolOrigen: e.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rol Destino</label>
              <input 
                className="w-full px-2.5 py-2 bg-bg-main border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                disabled={!canEdit}
                placeholder="ej: pedidos"
                value={selectedEdge.data?.rolDestino as string || ''}
                onChange={(e) => {
                  handleUpdateEdgeData(selectedEdge.id, { rolDestino: e.target.value });
                }}
              />
            </div>
          </div>
          
          {canEdit && (
            <button 
              onClick={() => {
                setEdges(edges.filter(e => e.id !== selectedEdge.id));
                broadcastEvent('EDGE_DELETED', selectedEdge.id);
                setSelectedEdgeId(null);
              }}
              className="w-full mt-4 py-2.5 min-h-[44px] bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-98 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar relación
            </button>
          )}
        </div>
      )}
    </>
  );

  // Renderizador principal del Inspector que conmuta según el modo
  const renderInspectorContent = () => (
    isReadOnlyView ? renderReadOnlyInspectorContent() : renderEditInspectorContent()
  );

  // Renderizador unificado para Colaboración y Presencia
  const renderCollaborationContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conectados ahora</h3>
        <div className="space-y-2">
          {!presenceReceived ? (
            <div className="text-sm text-gray-400">Actualizando presencia...</div>
          ) : connectedUsers.length === 0 ? (
            <div className="text-sm text-gray-400">Nadie más está conectado.</div>
          ) : (
            connectedUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-xl text-sm text-gray-700">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-800 truncate">{u.nombre}</div>
                  <div className="text-[10px] font-bold text-lila-main uppercase tracking-wider">
                    {formatRole(u.rol) || u.rol}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actividad reciente</h3>
          <button 
            onClick={openProjectHistory}
            className="text-[11px] font-bold bg-lila-light/20 text-lila-main px-2.5 py-1 rounded-lg hover:bg-lila-light/40 transition-colors"
          >
            Ver historial
          </button>
        </div>
        <div className="space-y-2.5">
          {recentActivity.loading && <div className="text-xs text-gray-400">Cargando actividad…</div>}
          {!recentActivity.loading && recentActivity.error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
              <p>{recentActivity.error}</p>
              <button type="button" onClick={() => void recentActivity.retry()} className="mt-2 font-bold underline">Reintentar</button>
            </div>
          )}
          {!recentActivity.loading && !recentActivity.error && recentActivity.events.map(event => (
            <div key={event.id} className="text-xs text-gray-600 border-l-2 border-lila-light pl-2.5 py-1.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-gray-800 break-words">{event.participanteNombre || 'Sistema'}</span>
                <time dateTime={event.fechaHora} className="text-[10px] text-gray-400 whitespace-nowrap">{formatActivityDate(event.fechaHora)}</time>
              </div>
              <p className="mt-0.5 text-gray-700 break-words">{event.titulo}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 break-words">{event.detalle}</p>
              {event.diagramaNombre && <span className="inline-block mt-1 text-[10px] font-semibold text-lila-main">{event.diagramaNombre}</span>}
            </div>
          ))}
          {!recentActivity.loading && !recentActivity.error && recentActivity.events.length === 0 && (
            <div className="text-xs text-gray-400">Todavía no hay actividad registrada.</div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-lila-main border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-text-light font-medium text-sm">Cargando diagrama...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-main font-sans">
      
      {/* TOP BAR RESPONSIVA */}
      <header ref={headerRef} className="h-14 bg-white/95 backdrop-blur-md border-b border-lila-light/50 flex items-center justify-between gap-2 px-3 lg:px-6 z-40 shadow-sm shrink-0 w-full relative">
        <div ref={leftRef} className="flex items-center gap-1.5 md:gap-3 shrink-0 min-w-0">
          <button 
            onClick={() => navigate(proyectoId ? `/proyectos/${proyectoId}` : '/proyectos')}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-lila-light/30 rounded-xl text-text-light hover:text-lila-main transition-colors shrink-0"
            title="Volver al proyecto"
            aria-label="Volver al proyecto"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <input 
            value={nombreDiagrama}
            onChange={(e) => setNombreDiagrama(e.target.value)}
            disabled={!canEdit || isReadOnlyView}
            className="font-bold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-lila-light rounded px-1.5 py-1 text-sm md:text-base max-w-[110px] xs:max-w-[150px] sm:max-w-[200px] truncate"
            placeholder="Diagrama"
          />

          {/* CU22: Conmutador de Modo Visualización Móvil */}
          <button
            type="button"
            onClick={() => setIsReadOnlyView(!isReadOnlyView)}
            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all min-h-[36px] ${
              isReadOnlyView
                ? 'bg-lila-light/60 text-lila-main border border-lila-light hover:bg-lila-light'
                : 'bg-pink-light/50 text-pink-700 border border-pink-200 hover:bg-pink-light'
            }`}
            title={isReadOnlyView ? "Modo visualización (solo lectura segura). Toca para editar." : "Modo edición activo. Toca para pasar a visualización."}
          >
            {isReadOnlyView ? <Eye className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{isReadOnlyView ? 'Visualización' : 'Edición'}</span>
          </button>

          <span
            className={`inline-flex items-center text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              saveStatus === 'saved' ? 'bg-green-50 text-green-700' :
              saveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
              saveStatus === 'error' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
              saveStatus === 'saved' ? 'bg-green-500' :
              saveStatus === 'saving' ? 'bg-blue-500 animate-pulse' :
              saveStatus === 'error' ? 'bg-red-500' :
              'bg-amber-500'
            }`}></span>
            <span className="hidden sm:inline">{saveStatusLabels[saveStatus]}</span>
            <span className="sm:hidden">{saveStatus === 'saved' ? 'OK' : saveStatus === 'saving' ? '...' : '!'}</span>
          </span>
        </div>

        <div ref={rightRef} className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
          {/* Indicador de conexión en escritorio */}
          <div className="hidden md:flex items-center gap-2 border-r border-gray-200 pr-2.5">
            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${connectionStatus === 'Sin conexión' ? 'text-red-500' : connectionStatus === 'Sincronizado' ? 'text-green-500' : 'text-yellow-500'}`}>
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Sin conexión' ? 'bg-red-500' : connectionStatus === 'Sincronizado' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              {connectionStatus === 'Sincronizado'
                ? (presenceReceived ? `En línea · ${connectedUsers.length}` : 'Actualizando presencia…')
                : connectionStatus}
            </span>
            {connectionStatus === "Sincronizado" && connectedUsers.length > 0 && (
              <div className="flex items-center gap-1 ml-1.5">
                <div className="flex -space-x-1.5">
                  {connectedUsers.slice(0, 3).map(u => (
                    <div key={u.id} title={`${u.nombre} — ${formatRole(u.rol)}`} className="w-6 h-6 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-[9px] font-bold text-lila-main">
                      {getInitials(u.nombre)}
                    </div>
                  ))}
                  {connectedUsers.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-500">
                      +{connectedUsers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Acciones colaborativas visibles en barra superior */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* 1. Botón de Chat destacado */}
            <button 
              type="button"
              onClick={() => {
                setRightTab('chat');
                setIsRightPanelOpen(true);
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                rightTab === 'chat'
                  ? 'bg-gradient-to-r from-lila-main to-pink-main text-white shadow-xs'
                  : 'text-lila-main bg-lila-light/25 hover:bg-lila-light/45 border border-lila-light/40'
              }`}
              title="Abrir chat colaborativo del proyecto"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden xs:inline">Chat</span>
            </button>

            {/* 2. Botón de Control por Voz */}
            <button
              type="button"
              onClick={handleOpenVoice}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${
                voiceRecognition.state === 'escuchando'
                  ? 'bg-red-100 text-red-600 animate-pulse font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Comandos por voz"
            >
              <Mic className={`w-4 h-4 ${voiceRecognition.state === 'escuchando' ? 'text-red-500' : 'text-lila-main'}`} />
              <span className="hidden sm:inline">Voz</span>
            </button>

            {/* 3. Botón de Historial de Actividad (visible en pantallas grandes) */}
            <button
              type="button"
              onClick={openProjectHistory}
              className="hidden lg:flex px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors items-center gap-1.5"
              title="Historial de actividad"
            >
              <Users className="w-3.5 h-3.5 text-lila-main" />
              <span>Actividad</span>
            </button>
          </div>

          {/* Menú de Más Herramientas y Opciones */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition-colors ${
                isMobileMenuOpen ? 'bg-lila-light/40 text-lila-main' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Herramientas y opciones avanzadas"
              aria-label="Herramientas y opciones"
            >
               <MoreVertical className="w-5 h-5" />
            </button>

            {/* DROPDOWN DESPLEGABLE DE HERRAMIENTAS */}
            {isMobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="absolute top-12 right-0 w-72 bg-white/98 backdrop-blur-md shadow-2xl border border-lila-light/60 rounded-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-600 mb-1 flex items-center justify-between">
                     <span className="flex items-center gap-1.5">
                       <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Sin conexión' ? 'bg-red-500' : connectionStatus === 'Sincronizado' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                       {connectionStatus === 'Sincronizado'
                         ? (presenceReceived ? `En línea · ${connectedUsers.length}` : 'Actualizando presencia…')
                         : connectionStatus}
                     </span>
                     <span className="text-[10px] text-lila-main font-semibold bg-lila-light/30 px-2 py-0.5 rounded-full">{formatRole(userRole)}</span>
                  </div>

                  {/* Grupo Colaboración e IA */}
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-1">Colaboración e IA</div>
                  <button onClick={() => { setIsMobileMenuOpen(false); setRightTab('chat'); setIsRightPanelOpen(true); }} className="px-3 py-2 text-left text-xs font-semibold text-lila-main hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-lila-main" /> Chat del Proyecto
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); handleOpenVoice(); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <Mic className="w-4 h-4 text-lila-main" /> Control por Voz
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); openProjectHistory(); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <Users className="w-4 h-4 text-lila-main" /> Actividad y Presencia
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowIaModal(true); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-lila-main" /> Asistente IA
                  </button>

                  <div className="h-px bg-gray-100 my-1"></div>

                  {/* Grupo Importar y Exportar */}
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-1">Importar y Exportar</div>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowImageModal(true); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-lila-main" /> Importar de Imagen
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowXmiImport(true); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4 text-lila-main" /> Importar XMI
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowXmiExport(true); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-lila-main" /> Exportar XMI
                  </button>

                  <div className="h-px bg-gray-100 my-1"></div>

                  {/* Grupo Generación de Código */}
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-1">Generación de Código</div>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowGenerateBackendModal(true); }} disabled={isGeneratingBackend} className="px-3 py-2 text-left text-xs font-semibold text-lila-main hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                    <FileCode className="w-4 h-4" /> {isGeneratingBackend ? 'Generando backend...' : 'Generar Backend Spring'}
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setShowGenerateMobileModal(true); }} disabled={isGeneratingMobile} className="px-3 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                    <Smartphone className="w-4 h-4" /> {isGeneratingMobile ? 'Generando app...' : 'Generar App Flutter'}
                  </button>

                  <div className="h-px bg-gray-100 my-1"></div>

                  {/* Grupo Sistema y Ayuda */}
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-1">Sistema y Ayuda</div>
                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/configuracion/notificaciones'); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <Bell className="w-4 h-4 text-lila-main" /> Notificaciones Push
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('umlforge:open-help')); }} className="px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-lila-light/20 rounded-xl transition-colors flex items-center gap-2">
                    <CircleHelp className="w-4 h-4 text-lila-main" /> Ayuda y Manual
                  </button>

                  <div className="h-px bg-gray-100 my-1"></div>

                  <button onClick={() => { setIsMobileMenuOpen(false); navigate(proyectoId ? `/proyectos/${proyectoId}` : '/dashboard'); }} className="px-3 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver al Proyecto
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Botón Guardar siempre accesible y protegido */}
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              title={saveStatusLabels[saveStatus]}
              className="px-3 sm:px-4 py-2 min-h-[40px] bg-gradient-to-r from-lila-main to-pink-main text-white text-xs md:text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:cursor-wait disabled:opacity-60 shrink-0"
            >
              <Save className="w-4 h-4" />
              <span className="hidden xs:inline">{saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ÁREA DE TRABAJO PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden relative min-w-0 min-h-0">
        
        {/* SIDEBAR HERRAMIENTAS ESCRITORIO (Solo visible en pantallas grandes) */}
        <aside className="hidden lg:flex flex-col py-4 w-48 bg-white/95 backdrop-blur-md border-r border-lila-light/50 shadow-[4px_0_24px_rgba(139,92,246,0.03)] overflow-y-auto h-full shrink-0 z-10">
          <div className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Herramientas</div>
          <button 
            onClick={() => handleToolChange('select')}
            title="Seleccionar"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'select' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MousePointer2 className="w-4 h-4 shrink-0" /> <span>Seleccionar</span>
          </button>
          <button 
            onClick={() => handleToolChange('umlClass')}
            title="Clase"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'umlClass' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Square className="w-4 h-4 shrink-0" /> <span>Clase</span>
          </button>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Relaciones</div>
          <button 
            onClick={() => handleToolChange('ASOCIACION')}
            title="Asociación"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'ASOCIACION' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ArrowRight className="w-4 h-4 shrink-0" /> <span>Asociación</span>
          </button>
          <button 
            onClick={() => handleToolChange('AGREGACION')}
            title="Agregación"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'AGREGACION' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Diamond className="w-4 h-4 shrink-0" /> <span>Agregación</span>
          </button>
          <button 
            onClick={() => handleToolChange('COMPOSICION')}
            title="Composición"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'COMPOSICION' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Layers className="w-4 h-4 shrink-0" /> <span>Composición</span>
          </button>
          <button 
            onClick={() => handleToolChange('HERENCIA')}
            title="Generalización"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'HERENCIA' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Triangle className="w-4 h-4 shrink-0" /> <span>Generalización</span>
          </button>
          <button 
            onClick={() => handleToolChange('DEPENDENCIA')}
            title="Dependencia"
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedTool === 'DEPENDENCIA' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MoveRight className="w-4 h-4 shrink-0" /> <span>Dependencia</span>
          </button>

          <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Acciones rápidas</div>
          <button 
            onClick={() => reactFlowInstance?.fitView({ padding: 0.2, duration: 300 })}
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Maximize2 className="w-4 h-4 shrink-0" /> <span>Centrar vista</span>
          </button>
        </aside>

        {/* LIENZO REACT FLOW RESPONSIVO CON SOPORTE TÁCTIL */}
        <main className="flex-1 relative bg-[#FAFAFC] min-w-0 min-h-0">
          {loadError && (
            <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex max-w-[92vw] sm:max-w-xl items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/95 backdrop-blur-md px-4 py-3 text-xs sm:text-sm text-red-700 shadow-xl">
              <span className="min-w-0 flex-1">{loadError}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLoadAttempt(value => value + 1)}
                  className="font-bold underline text-xs sm:text-sm"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => setLoadError('')}
                  className="p-1 rounded-lg text-red-500 hover:bg-red-100"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {saveError && !remoteConflict && (
            <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex max-w-[92vw] sm:max-w-xl items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 backdrop-blur-md px-4 py-3 text-xs sm:text-sm text-amber-800 shadow-xl">
              <span className="min-w-0 flex-1">{saveError}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  className="font-bold underline text-xs sm:text-sm"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => setSaveError('')}
                  className="p-1 rounded-lg text-amber-700 hover:bg-amber-100"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {remoteConflict && (
            <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex max-w-[92vw] sm:max-w-2xl items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 backdrop-blur-md px-4 py-3 text-xs sm:text-sm text-amber-900 shadow-xl">
              <span className="min-w-0 flex-1">{remoteConflict}</span>
              <div className="flex items-center gap-2 shrink-0">
                {pendingRemoteUpdate && (
                  <>
                    <button
                      type="button"
                      onClick={downloadLocalConflictCopy}
                      className="font-bold underline text-xs"
                    >
                      Descargar copia
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Se reemplazará el canvas local por la versión confirmada del servidor.')) {
                          applyPendingRemoteUpdate();
                        }
                      }}
                      className="font-bold underline text-xs"
                    >
                      Usar remota
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setRemoteConflict('')}
                  className="p-1 rounded-lg text-amber-800 hover:bg-amber-100"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* BANNER FLOTANTE GUÍA DE CREACIÓN DE RELACIONES EN 2 PASOS */}
          {isRelationTool(selectedTool) && (
            <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 max-w-md bg-white/95 backdrop-blur-md border-2 border-lila-main rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-lila-main">
                  <span className="w-2 h-2 rounded-full bg-lila-main animate-pulse"></span>
                  Relación: {relationToolLabels[selectedTool]}
                </div>
                <p className="text-xs font-semibold text-gray-700 mt-0.5 truncate">
                  {!pendingRelationSourceId
                    ? 'Paso 1: Toca la clase de origen'
                    : `Origen: ${pendingRelationSource?.data.nombre || 'Clase'} → Paso 2: Toca la clase de destino`}
                </p>
                {relationError && <p className="text-xs text-red-600 font-medium mt-0.5">{relationError}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTool('select');
                  setPendingRelationSourceId(null);
                  setRelationError('');
                }}
                className="px-3 py-1.5 min-h-[36px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}

          <ReactFlow
            nodes={pendingRelationSourceId
              ? nodes.map(node => node.id === pendingRelationSourceId ? { ...node, selected: true } : node)
              : nodes}
            edges={edges}
            onNodesChange={isEffectivelyEditing ? onNodesChange : (changes) => {
              const selectionChanges = changes.filter((c: any) => c.type === 'select');
              if (selectionChanges.length > 0) onNodesChange(selectionChanges);
            }}
            onEdgesChange={isEffectivelyEditing ? onEdgesChange : (changes) => {
              const selectionChanges = changes.filter((c: any) => c.type === 'select');
              if (selectionChanges.length > 0) onEdgesChange(selectionChanges);
            }}
            onConnect={(conn) => {
              if (!isEffectivelyEditing) return;
              if (selectedTool === 'select' || selectedTool === 'umlClass') return;
              const newEdge = { ...conn, id: generateId(), type: 'umlRelation', data: { tipo: selectedTool, nombre: '', multiplicidadOrigen: '', multiplicidadDestino: '', rolOrigen: '', rolDestino: '' }, markerEnd: getMarkerEnd(selectedTool) };
              setEdges([...edges, newEdge as any]);
              broadcastEvent('EDGE_CREATED', newEdge.id, newEdge);
            }}
            onNodeClick={(_, node) => {
              handleNodeClick(node);
              if (isReadOnlyView) {
                setRightTab('inspector');
                setIsRightPanelOpen(true);
              }
            }}
            onNodeDragStop={(_, node) => {
              if (isEffectivelyEditing) broadcastEvent('NODE_MOVED', node.id, node.position);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
              setRightTab('inspector');
              setIsRightPanelOpen(true);
            }}
            onPaneClick={(e) => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              
              if (selectedTool === 'umlClass' && isEffectivelyEditing) {
                const target = e.target as HTMLElement;
                const rect = target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const newNode: Node = {
                  id: generateId(),
                  type: 'umlClass',
                  position: { x, y },
                  data: {
                    nombre: 'NuevaClase',
                    estereotipo: '',
                    atributos: [],
                    metodos: []
                  }
                };
                addNode(newNode);
                broadcastEvent('NODE_CREATED', newNode.id, newNode);
                setSelectedNodeId(newNode.id);
                setIsRightPanelOpen(true);
                setSelectedTool('select');
              }
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.25, includeHiddenNodes: false }}
            onInit={(instance) => {
              setReactFlowInstance(instance);
              setTimeout(() => instance.fitView({ padding: 0.25, duration: 250 }), 150);
            }}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: 'umlRelation', markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' } }}
            className="bg-bg-main"
            panOnDrag={true}
            zoomOnPinch={true}
            preventScrolling={true}
            zoomOnScroll={true}
            minZoom={0.2}
            maxZoom={2.5}
            nodesDraggable={isEffectivelyEditing}
            nodesConnectable={isEffectivelyEditing}
            elementsSelectable={true}
          >
            <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
              <defs>
                <marker id="agregacion-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <polygon points="10,0 20,10 10,20 0,10" fill="white" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
                <marker id="composicion-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <polygon points="10,0 20,10 10,20 0,10" fill="#8B5CF6" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
                <marker id="generalizacion-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <polygon points="0,0 20,10 0,20" fill="white" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
                <marker id="dependencia-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <path d="M0,0 L20,10 L0,20" fill="none" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
              </defs>
            </svg>

            <Background color="#8B5CF6" gap={24} size={1} />
            <Controls className="hidden md:flex fill-lila-main" />

            {/* MiniMap para Escritorio */}
            <MiniMap 
              nodeColor="#FCE7F3" 
              maskColor="rgba(250, 250, 252, 0.7)" 
              className="hidden md:block" 
            />
          </ReactFlow>

          {/* Watermark de estado vacío cuando el diagrama no tiene clases */}
          {nodes.length === 0 && !loading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 z-10">
              <div className="pointer-events-auto text-center p-6 bg-white/90 backdrop-blur-md rounded-3xl border border-lila-light/50 shadow-xl max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-lila-light/30 text-lila-main flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Diagrama sin clases</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Comienza agregando tu primera clase UML o genera un modelo con el Asistente IA.
                </p>
                {canEdit && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleAddClass}
                      className="px-3.5 py-2.5 bg-gradient-to-r from-lila-main to-pink-main text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusSquare className="w-4 h-4" /> + Nueva Clase
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowIaModal(true)}
                      className="px-3.5 py-2.5 bg-lila-light/30 text-lila-main text-xs font-bold rounded-xl hover:bg-lila-light/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" /> Asistente IA
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Controles de Zoom Flotantes para Celular (Visibles en pantallas < md) */}
          <div className="md:hidden absolute top-3 right-3 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-2xl border border-lila-light/60 shadow-lg p-1">
            <button
              type="button"
              onClick={() => reactFlowInstance?.zoomIn({ duration: 200 })}
              title="Acercar (Zoom +)"
              aria-label="Acercar"
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-gray-700 hover:bg-lila-light/30 active:scale-95 transition-all"
            >
              <ZoomIn className="w-4 h-4 text-lila-main" />
            </button>
            <button
              type="button"
              onClick={() => reactFlowInstance?.zoomOut({ duration: 200 })}
              title="Alejar (Zoom -)"
              aria-label="Alejar"
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-gray-700 hover:bg-lila-light/30 active:scale-95 transition-all"
            >
              <ZoomOut className="w-4 h-4 text-lila-main" />
            </button>
            <button
              type="button"
              onClick={() => reactFlowInstance?.fitView({ padding: 0.25, duration: 300 })}
              title="Centrar diagrama"
              aria-label="Centrar vista"
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-gray-700 hover:bg-lila-light/30 active:scale-95 transition-all"
            >
              <Maximize2 className="w-4 h-4 text-lila-main" />
            </button>
          </div>

          {/* MiniMap flotante para Celulares/Tablets cuando el usuario lo activa */}
          {showMiniMap && (
            <div className="md:hidden absolute bottom-20 right-3 z-20 w-36 h-28 bg-white/95 backdrop-blur-md rounded-2xl border border-lila-light/60 shadow-2xl overflow-hidden p-1">
              <div className="flex items-center justify-between px-1.5 py-0.5 text-[9px] font-bold text-gray-500 uppercase">
                <span>Minimapa</span>
                <button onClick={() => setShowMiniMap(false)} className="text-gray-400 hover:text-gray-600 p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="w-full h-[calc(100%-18px)] relative">
                <MiniMap
                  nodeColor="#FCE7F3"
                  maskColor="rgba(250, 250, 252, 0.7)"
                  className="!w-full !h-full !m-0 !static !border-none"
                />
              </div>
            </div>
          )}

          {/* SELECTOR MÓVIL DE TIPO DE RELACIÓN */}
          {isMobileRelationMenuOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden flex items-end justify-center p-3" 
              onClick={() => setIsMobileRelationMenuOpen(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl border border-lila-light/60 p-3 w-full max-w-sm mb-16 space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-200" 
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
                  <span>Seleccionar tipo de relación</span>
                  <button onClick={() => setIsMobileRelationMenuOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => { handleToolChange('ASOCIACION'); setIsMobileRelationMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${selectedTool === 'ASOCIACION' ? 'bg-lila-light/30 text-lila-main' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <ArrowRight className="w-4 h-4 text-lila-main" /> Asociación simple
                </button>
                <button
                  onClick={() => { handleToolChange('AGREGACION'); setIsMobileRelationMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${selectedTool === 'AGREGACION' ? 'bg-lila-light/30 text-lila-main' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <Diamond className="w-4 h-4 text-lila-main" /> Agregación (rombo vacío)
                </button>
                <button
                  onClick={() => { handleToolChange('COMPOSICION'); setIsMobileRelationMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${selectedTool === 'COMPOSICION' ? 'bg-lila-light/30 text-lila-main' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <Layers className="w-4 h-4 text-lila-main" /> Composición (rombo lleno)
                </button>
                <button
                  onClick={() => { handleToolChange('HERENCIA'); setIsMobileRelationMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${selectedTool === 'HERENCIA' ? 'bg-lila-light/30 text-lila-main' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <Triangle className="w-4 h-4 text-lila-main" /> Generalización (herencia)
                </button>
                <button
                  onClick={() => { handleToolChange('DEPENDENCIA'); setIsMobileRelationMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${selectedTool === 'DEPENDENCIA' ? 'bg-lila-light/30 text-lila-main' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <MoveRight className="w-4 h-4 text-lila-main" /> Dependencia
                </button>
              </div>
            </div>
          )}

          {/* BARRA DE HERRAMIENTAS FLOTANTE INFERIOR PARA CELULARES Y TABLETS */}
          <div className="fixed bottom-3 inset-x-2 sm:inset-x-4 z-30 lg:hidden flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-lila-light/60 shadow-2xl rounded-2xl p-1.5 flex items-center justify-around gap-1 w-full max-w-md overflow-x-auto no-scrollbar scroll-smooth">
              {isReadOnlyView ? (
                <>
                  {/* Modo Visualización: Acciones táctiles cómodas de solo lectura (CU22) */}
                  <button
                    type="button"
                    onClick={() => handleToolChange('select')}
                    title="Modo Selección / Consulta"
                    aria-label="Seleccionar"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                      selectedTool === 'select' ? 'bg-lila-main text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MousePointer2 className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => reactFlowInstance?.fitView({ padding: 0.2, duration: 300 })}
                    title="Ajustar a pantalla"
                    aria-label="Ajustar a pantalla"
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-700 hover:bg-lila-light/30 active:scale-95 transition-all"
                  >
                    <Maximize2 className="w-5 h-5 text-lila-main" />
                  </button>

                  <button
                    type="button"
                    onClick={() => reactFlowInstance?.zoomIn({ duration: 200 })}
                    title="Acercar (Zoom +)"
                    aria-label="Zoom +"
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => reactFlowInstance?.zoomOut({ duration: 200 })}
                    title="Alejar (Zoom -)"
                    aria-label="Zoom -"
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    title={showMiniMap ? "Ocultar minimapa" : "Mostrar minimapa"}
                    aria-label="Minimapa"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                      showMiniMap ? 'bg-lila-light/40 text-lila-main font-bold' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Map className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRightTab('inspector');
                      setIsRightPanelOpen(!isRightPanelOpen);
                    }}
                    title="Ver ficha de elemento"
                    aria-label="Ficha"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all relative ${
                      isRightPanelOpen && rightTab === 'inspector' ? 'bg-lila-light/50 text-lila-main' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="w-5 h-5" />
                    {(selectedNodeId || selectedEdgeId) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-lila-main rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRightTab('chat');
                      setIsRightPanelOpen(true);
                    }}
                    title="Abrir chat del proyecto"
                    aria-label="Chat del proyecto"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all relative ${
                      isRightPanelOpen && rightTab === 'chat' ? 'bg-lila-light/50 text-lila-main' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-lila-main" />
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsReadOnlyView(false)}
                      title="Cambiar a Modo Edición"
                      aria-label="Modo Edición"
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-pink-600 hover:bg-pink-50 active:scale-95 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Modo Edición: Herramientas existentes */}
                  <button
                    onClick={() => handleToolChange('select')}
                    title="Modo Selección"
                    aria-label="Seleccionar"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                      selectedTool === 'select' ? 'bg-lila-main text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MousePointer2 className="w-5 h-5" />
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => {
                        handleAddClass();
                      }}
                      title="Crear nueva clase"
                      aria-label="Crear Clase"
                      className="p-2 min-w-[38px] sm:min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-700 hover:bg-lila-light/30 active:scale-95 transition-all"
                    >
                      <PlusSquare className="w-5 h-5 text-lila-main" />
                    </button>
                  )}

                  <button
                    onClick={handleOpenVoice}
                    title="Control por voz"
                    aria-label="Control por voz"
                    className={`p-2 min-w-[38px] sm:min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all relative ${
                      voiceRecognition.state === 'escuchando'
                        ? 'bg-red-500 text-white shadow-lg animate-pulse ring-2 ring-red-300'
                        : 'text-gray-600 hover:bg-lila-light/30 hover:text-lila-main active:scale-95'
                    }`}
                  >
                    <Mic className="w-5 h-5 text-lila-main" />
                    {voiceRecognition.state === 'escuchando' && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-ping"></span>
                    )}
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => setIsMobileRelationMenuOpen(!isMobileRelationMenuOpen)}
                      title="Elegir relación UML"
                      aria-label="Relaciones"
                      className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all relative ${
                        isRelationTool(selectedTool) ? 'bg-lila-main text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ArrowRight className="w-5 h-5" />
                      {isRelationTool(selectedTool) && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-main rounded-full ring-2 ring-white"></span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => reactFlowInstance?.fitView({ padding: 0.2, duration: 300 })}
                    title="Centrar diagrama"
                    aria-label="Centrar vista"
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    title={showMiniMap ? "Ocultar minimapa" : "Mostrar minimapa"}
                    aria-label="Minimapa"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                      showMiniMap ? 'bg-lila-light/40 text-lila-main font-bold' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Map className="w-5 h-5" />
                  </button>

                  {canEdit && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={!selectedNodeId && !selectedEdgeId}
                      title="Eliminar elemento seleccionado"
                      aria-label="Eliminar elemento"
                      className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
                        selectedNodeId || selectedEdgeId
                          ? 'text-red-500 hover:bg-red-50 active:scale-95'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setRightTab('inspector');
                      setIsRightPanelOpen(!isRightPanelOpen);
                    }}
                    title="Abrir inspector de propiedades"
                    aria-label="Inspector"
                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all relative ${
                      isRightPanelOpen && rightTab === 'inspector' ? 'bg-lila-light/50 text-lila-main' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Settings2 className="w-5 h-5" />
                    {(selectedNodeId || selectedEdgeId) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-lila-main rounded-full"></span>
                    )}
                  </button>

                  {/* Conmutador a Modo Visualización */}
                  <button
                    type="button"
                    onClick={() => setIsReadOnlyView(true)}
                    title="Pasar a Modo Visualización (proteger cambios)"
                    aria-label="Modo Visualización"
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-lila-main hover:bg-lila-light/30 active:scale-95 transition-all"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </main>

        {/* PANEL DERECHO ESCRITORIO (>= lg) */}
        <aside className="hidden lg:flex flex-col w-96 xl:w-[28rem] bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] shrink-0 h-full overflow-hidden">
          <div className="flex border-b border-lila-light/50 bg-gray-50/70 shrink-0">
            <button 
              type="button"
              className={`flex-1 py-3 px-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 min-w-0 ${
                rightTab === 'inspector'
                  ? 'text-lila-main border-lila-main bg-white shadow-xs'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100/60'
              }`}
              onClick={() => setRightTab('inspector')}
              title="Inspector de propiedades"
            >
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Inspector</span>
            </button>

            <button
              type="button"
              className={`flex-1 py-3 px-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 min-w-0 ${
                rightTab === 'colaboracion'
                  ? 'text-lila-main border-lila-main bg-white shadow-xs'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100/60'
              }`}
              onClick={() => setRightTab('colaboracion')}
              title="Usuarios en línea"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Equipo</span>
              {connectedUsers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-lila-light/40 text-lila-main text-[10px] font-bold">
                  {connectedUsers.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`flex-1 py-3 px-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 min-w-0 ${
                rightTab === 'chat'
                  ? 'text-lila-main border-lila-main bg-white shadow-xs'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100/60'
              }`}
              onClick={() => setRightTab('chat')}
              title="Chat colaborativo del proyecto"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Chat</span>
            </button>
          </div>

          <div className={`overflow-y-auto flex-1 min-h-0 ${rightTab === 'chat' ? 'p-0 flex flex-col' : 'p-5'}`}>
            {rightTab === 'inspector'
              ? renderInspectorContent()
              : rightTab === 'colaboracion'
              ? renderCollaborationContent()
              : (
                <ProjectChat
                  proyectoId={proyectoId}
                  diagramaId={id ? Number(id) : undefined}
                  diagramaNombre={nombreDiagrama}
                  diagramaVersion={diagramVersion}
                  hasUnsavedChanges={saveStatus !== 'saved'}
                  diagramClasses={diagramClasses}
                  variant="compact"
                  className="rounded-none border-none h-full shadow-none bg-transparent"
                />
              )}
          </div>
        </aside>

        {/* INSPECTOR MÓVIL Y TABLET (BOTTOM SHEET DESPLEGABLE < lg) */}
        <div className={`fixed inset-0 z-[95] lg:hidden transition-all duration-300 ${isRightPanelOpen ? 'visible' : 'invisible pointer-events-none'}`}>
          {/* Fondo oscuro para cerrar */}
          <div 
            className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${isRightPanelOpen ? 'opacity-100' : 'opacity-0'}`} 
            onClick={() => setIsRightPanelOpen(false)}
          />
          {/* Hoja deslizante hacia arriba */}
          <div 
            className={`fixed inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl border-t border-lila-light/60 flex flex-col transition-transform duration-300 ease-out z-10 ${
              isRightPanelOpen ? 'translate-y-0' : 'translate-y-full'
            } pb-[max(1rem,env(safe-area-inset-bottom))]`}
          >
            {/* Tirador táctil */}
            <div 
              className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 shrink-0 cursor-pointer"
              onClick={() => setIsRightPanelOpen(false)}
            />
            
            {/* Encabezado del Inspector Móvil */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                <button
                  type="button"
                  onClick={() => setRightTab('inspector')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                    rightTab === 'inspector' ? 'bg-lila-main text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Inspector</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('colaboracion')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                    rightTab === 'colaboracion' ? 'bg-lila-main text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Equipo {connectedUsers.length > 0 ? `(${connectedUsers.length})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('chat')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                    rightTab === 'chat' ? 'bg-lila-main text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsRightPanelOpen(false)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl shrink-0"
                aria-label="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido editable del Inspector en Celular */}
            <div className={`overflow-y-auto flex-1 min-h-0 ${rightTab === 'chat' ? 'p-0 flex flex-col' : 'p-4 space-y-4'}`}>
              {rightTab === 'inspector'
                ? renderInspectorContent()
                : rightTab === 'colaboracion'
                ? renderCollaborationContent()
                : (
                  <ProjectChat
                    proyectoId={proyectoId}
                    diagramaId={id ? Number(id) : undefined}
                    diagramaNombre={nombreDiagrama}
                    diagramaVersion={diagramVersion}
                    hasUnsavedChanges={saveStatus !== 'saved'}
                    diagramClasses={diagramClasses}
                    variant="compact"
                    onClose={() => setIsRightPanelOpen(false)}
                    className="rounded-none border-none h-full shadow-none bg-transparent"
                  />
                )}
            </div>
          </div>
        </div>

      </div>
      
      {/* DATALIST PARA MULTIPLICIDADES */}
      <datalist id="multiplicities">
        <option value="1" />
        <option value="0..1" />
        <option value="1..*" />
        <option value="0..*" />
        <option value="*" />
        <option value="0" />
        <option value="N" />
      </datalist>

      {/* MODAL HISTORIAL RESPONSIVO */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[80vh]">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Historial del diagrama</h2>
              <button 
                onClick={() => setShowHistory(false)} 
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-800 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[480px]">
                  <thead>
                    <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="p-4 border-b">Usuario</th>
                      <th className="p-4 border-b">Acción</th>
                      <th className="p-4 border-b">Elemento</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-700">
                    {historyEvents.map((ev: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{ev.usuarioNombre || 'Usuario'}</td>
                        <td className="p-4">
                          {capitalize(getActivityDescription(ev.tipoEvento))}
                        </td>
                        <td className="p-4 text-gray-500 font-mono text-xs">
                           {ev.tipoEvento.startsWith('USER') ? '-' : (ev.elementoId || '-')}
                        </td>
                      </tr>
                    ))}
                    {historyEvents.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-gray-400">No hay eventos en el historial.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERACIÓN BACKEND RESPONSIVO */}
      {showGenerateBackendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Confirmar generación de Backend</h2>
              <button 
                onClick={() => setShowGenerateBackendModal(false)} 
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600">Se generará un proyecto Spring Boot basado en el diagrama actual con las siguientes características:</p>
              
              <div className="bg-gray-50 p-4 rounded-xl space-y-1.5 text-sm text-gray-700 border border-gray-100">
                <p><strong>Clases encontradas:</strong> {nodes.length}</p>
                <p className="truncate"><strong>Nombres:</strong> {nodes.map(n => n.data.nombre).join(', ') || 'Ninguna'}</p>
                <p><strong>Relaciones:</strong> {edges.length}</p>
              </div>

              <div className="bg-lila-light/10 p-4 rounded-xl text-sm text-gray-700 border border-lila-light/30">
                <p className="font-bold text-lila-main mb-2">Configuración PostgreSQL</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Host</label>
                      <input id="db-host" type="text" defaultValue="localhost" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Puerto</label>
                      <input id="db-port" type="number" defaultValue="5432" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Base de Datos</label>
                    <input id="db-name" type="text" defaultValue="generated_db" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Usuario</label>
                      <input id="db-user" type="text" defaultValue="postgres" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña</label>
                      <input id="db-pass" type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button 
                onClick={() => setShowGenerateBackendModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const dbHost = (document.getElementById('db-host') as HTMLInputElement).value;
                  const dbPort = (document.getElementById('db-port') as HTMLInputElement).value;
                  const dbName = (document.getElementById('db-name') as HTMLInputElement).value;
                  const dbUser = (document.getElementById('db-user') as HTMLInputElement).value;
                  const dbPass = (document.getElementById('db-pass') as HTMLInputElement).value;
                  setShowGenerateBackendModal(false);
                  handleGenerateBackend({
                    host: dbHost,
                    port: parseInt(dbPort),
                    databaseName: dbName,
                    username: dbUser,
                    password: dbPass
                  });
                }}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center bg-gradient-to-r from-lila-main to-pink-main text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                Generar ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERACIÓN APP FLUTTER RESPONSIVO */}
      {showGenerateMobileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Confirmar generación de App Móvil</h2>
              <button 
                onClick={() => setShowGenerateMobileModal(false)} 
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600">Se generará un proyecto Flutter basado en el diagrama actual con las siguientes características:</p>
              
              <div className="bg-gray-50 p-4 rounded-xl space-y-1.5 text-sm text-gray-700 border border-gray-100">
                <p><strong>Clases detectadas:</strong> {nodes.length}</p>
                <p className="truncate"><strong>Modelos Dart y Pantallas CRUD:</strong> {nodes.map(n => n.data.nombre).join(', ') || 'Ninguna'}</p>
                <p className="truncate"><strong>Servicios REST:</strong> {nodes.map(n => `${n.data.nombre}Service`).join(', ') || 'Ninguno'}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl text-sm text-gray-700 border border-blue-100">
                <p className="font-bold text-blue-600 mb-2">Tecnologías incluidas:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Flutter (Base Project)</li>
                  <li>Dart (Modelos fuertemente tipados)</li>
                  <li>HTTP REST (Consumo de APIs)</li>
                  <li>Widgets de Material Design responsivos</li>
                </ul>
              </div>
            </div>
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button 
                onClick={() => setShowGenerateMobileModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowGenerateMobileModal(false);
                  handleGenerateMobile();
                }}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                Generar App Flutter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR XMI */}
      {showXmiImport && (
        <XmiImportModal
          hasExistingContent={nodes.length > 0 || edges.length > 0}
          onClose={() => setShowXmiImport(false)}
          onImport={handleImportXmi}
        />
      )}

      {/* MODAL EXPORTAR XMI */}
      {showXmiExport && (
        <XmiExportModal
          diagramName={nombreDiagrama}
          model={buildCurrentModel()}
          onClose={() => setShowXmiExport(false)}
        />
      )}

      {/* MODAL ASISTENTE IA */}
      {showIaModal && (
        <IAModelModal
          diagramaId={id ? Number(id) : null}
          hasExistingContent={nodes.length > 0}
          onClose={() => setShowIaModal(false)}
          onApply={(model) => {
            applyUmlModel(model, true);
            setShowIaModal(false);
          }}
        />
      )}

      {/* MODAL RECONSTRUIR DESDE IMAGEN */}
      {showImageModal && (
        <ImageUmlImportModal
          diagramaId={id ? Number(id) : null}
          hasExistingContent={nodes.length > 0 || edges.length > 0}
          onClose={() => setShowImageModal(false)}
          onApply={(model) => {
            applyUmlModel(model, true);
            setShowImageModal(false);
          }}
        />
      )}
      {/* MODAL CONTROL POR VOZ (CU14) */}
      <VoiceCommandModal
        isOpen={isVoiceModalOpen}
        onClose={handleCloseVoice}
        voiceState={voiceRecognition.state}
        transcript={voiceRecognition.transcript}
        command={voiceCommand}
        errorMessage={voiceRecognition.errorMessage}
        isSupported={voiceRecognition.isSupported}
        canEdit={canEdit}
        onStartListening={voiceRecognition.startListening}
        onStopListening={voiceRecognition.stopListening}
        onConfirmCommand={handleExecuteVoiceCommand}
        onRetry={() => {
          setVoiceCommand(null);
          voiceRecognition.startListening();
        }}
      />
    </div>
  );
}
