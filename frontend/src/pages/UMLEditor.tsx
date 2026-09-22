// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useEditorStore } from '../store/editorStore';
import { ArrowLeft, Save, PlusSquare, Trash2, Settings2, MousePointer2, Square, ArrowRight, Diamond, Layers, Triangle, MoveRight } from 'lucide-react';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  MarkerType
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import UmlClassNode from '../components/editor/UmlClassNode';
import UmlRelationEdge from '../components/editor/UmlRelationEdge';
import XmiImportModal from '../components/xmi/XmiImportModal';
import XmiExportModal from '../components/xmi/XmiExportModal';
import IAModelModal from '../components/ia/IAModelModal';
import ImageUmlImportModal from '../components/ia/ImageUmlImportModal';
import type { UmlModelJson } from '../types/uml';
import { useCollaboration } from '../hooks/useCollaboration';

const nodeTypes = { umlClass: UmlClassNode };
const edgeTypes = { umlRelation: UmlRelationEdge };

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
  
  const {
    historyEvents, connectedUsers, presenceReceived, connectionStatus,
    broadcastEvent
  } = useCollaboration(id);

  const [rightTab, setRightTab] = useState<'inspector' | 'colaboracion'>('inspector');
  const [showHistory, setShowHistory] = useState(false);
  const [showXmiImport, setShowXmiImport] = useState(false);
  const [showXmiExport, setShowXmiExport] = useState(false);
  const [showIaModal, setShowIaModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState('select');
  const [pendingRelationSourceId, setPendingRelationSourceId] = useState<string | null>(null);
  const [relationError, setRelationError] = useState('');
  
  const {
    nodes, edges, selectedNodeId, selectedEdgeId,
    onNodesChange, onEdgesChange, onConnect,
    setNodes, setEdges, addNode, updateNodeData,
    setSelectedNodeId, setSelectedEdgeId
  } = useEditorStore();

  const [nombreDiagrama, setNombreDiagrama] = useState('Cargando...');
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<number | null>(null);



  const handleUpdateNodeData = (nid: string, data: any) => {
    updateNodeData(nid, data);
    const n = nodes.find(x => x.id === nid);
    if (n) broadcastEvent('NODE_UPDATED', nid, { ...n.data, ...data });
  };

  const handleUpdateEdgeData = (eid: string, data: any) => {
    setEdges(edges.map(e => e.id === eid ? { ...e, data: { ...e.data, ...data } } : e));
    const edge = edges.find(e => e.id === eid);
    if (edge) broadcastEvent('EDGE_UPDATED', eid, { ...edge.data, ...data });
  };

  useEffect(() => {
    const fetchDiagrama = async () => {
      try {
        const { data } = await api.get(`/diagramas/${id}`);
        setNombreDiagrama(data.nombre);
        setProyectoId(data.proyectoId);
        
        if (data.modeloJson) {
          const parsed = JSON.parse(data.modeloJson) as UmlModelJson;
          
          if (parsed.clases) {
            const loadedNodes: Node[] = parsed.clases.map(c => ({
              id: c.id.toString(),
              type: 'umlClass',
              position: { x: c.posicionX, y: c.posicionY },
              data: {
                nombre: c.nombre,
                estereotipo: c.estereotipo,
                atributos: c.atributos || [],
                metodos: c.metodos || []
              }
            }));
            setNodes(loadedNodes);
          }
          
          if (parsed.relaciones) {
            const loadedEdges: Edge[] = parsed.relaciones.map(r => ({
              id: r.id.toString(),
              source: r.origen.toString(),
              target: r.destino.toString(),
              type: 'umlRelation',
              data: {
                tipo: r.tipo,
                nombre: r.nombre,
                multiplicidadOrigen: r.multiplicidadOrigen,
                multiplicidadDestino: r.multiplicidadDestino
              },
              markerEnd: getMarkerEnd(r.tipo)
            }));
            setEdges(loadedEdges);
          }
        }
      } catch (error) {
        console.error('Error cargando diagrama:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiagrama();
  }, [id, setNodes, setEdges]);

  const buildCurrentModel = (): UmlModelJson => ({
    clases: nodes.map(n => ({
      id: n.id,
      nombre: n.data.nombre as string,
      estereotipo: n.data.estereotipo as string | undefined,
      posicionX: n.position.x,
      posicionY: n.position.y,
      atributos: n.data.atributos as any[] || [],
      metodos: n.data.metodos as any[] || []
    })),
    relaciones: edges.map(e => ({
      id: e.id,
      origen: e.source,
      destino: e.target,
      tipo: e.data?.tipo as string || 'ASOCIACION',
      nombre: e.data?.nombre as string || '',
      multiplicidadOrigen: e.data?.multiplicidadOrigen as string || '',
      multiplicidadDestino: e.data?.multiplicidadDestino as string || ''
    }))
  });

  const handleSave = async () => {
    try {
      const modelo = buildCurrentModel();

      await api.put(`/diagramas/${id}`, {
        nombre: nombreDiagrama,
        modeloJson: JSON.stringify(modelo)
      });
      
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error guardando diagrama. Verifica tu conexión.');
    }
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      if (e.key === 'Delete') {
        if (selectedNodeId) {
          const n = nodes.find(n => n.id === selectedNodeId);
          if (n) {
            handleDeleteClass(n);
          }
        }
        if (selectedEdgeId) {
          setEdges(edges.filter(e => e.id !== selectedEdgeId));
          broadcastEvent('EDGE_DELETED', selectedEdgeId);
          setSelectedEdgeId(null);
        }
      }
      
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setPendingRelationSourceId(null);
        setRelationError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, nodes, edges, handleSave, setSelectedNodeId, setSelectedEdgeId, setEdges]);

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
  };

  const handleNodeClick = (node: Node) => {
    if (!isRelationTool(selectedTool)) {
      setSelectedNodeId(node.id);
      return;
    }

    if (!pendingRelationSourceId) {
      setPendingRelationSourceId(node.id);
      setRelationError('');
      setSelectedNodeId(node.id);
      return;
    }

    if (pendingRelationSourceId === node.id) {
      setRelationError('No puedes relacionar una clase consigo misma.');
      return;
    }

    const newEdge: Edge = {
      id: generateId(),
      source: pendingRelationSourceId,
      target: node.id,
      type: 'umlRelation',
      data: {
        tipo: selectedTool,
        nombre: '',
        multiplicidadOrigen: '',
        multiplicidadDestino: ''
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
    setSelectedTool('select');
  };

  const applyUmlModel = (model: UmlModelJson) => {
    const modelNodes: Node[] = model.clases.map(umlClass => ({
      id: umlClass.id.toString(),
      type: 'umlClass',
      position: { x: umlClass.posicionX, y: umlClass.posicionY },
      data: {
        nombre: umlClass.nombre,
        estereotipo: umlClass.estereotipo || '',
        atributos: umlClass.atributos || [],
        metodos: umlClass.metodos || []
      }
    }));
    const modelEdges: Edge[] = model.relaciones.map(relation => ({
      id: relation.id.toString(),
      source: relation.origen.toString(),
      target: relation.destino.toString(),
      type: 'umlRelation',
      data: {
        tipo: relation.tipo,
        nombre: relation.nombre || '',
        multiplicidadOrigen: relation.multiplicidadOrigen || '',
        multiplicidadDestino: relation.multiplicidadDestino || ''
      },
      markerEnd: getMarkerEnd(relation.tipo)
    }));

    edges.forEach(edge => broadcastEvent('EDGE_DELETED', edge.id));
    nodes.forEach(node => broadcastEvent('NODE_DELETED', node.id));
    modelNodes.forEach(node => broadcastEvent('NODE_CREATED', node.id, node));
    modelEdges.forEach(edge => broadcastEvent('EDGE_CREATED', edge.id, edge));

    setNodes(modelNodes);
    setEdges(modelEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const handleImportXmi = (model: UmlModelJson) => {
    applyUmlModel(model);
    setShowXmiImport(false);
    alert('Modelo XMI importado. Recuerda guardar los cambios.');
  };

  const handleAddClass = () => {
    const newNode: Node = {
      id: generateId(),
      type: 'umlClass',
      position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      data: {
        nombre: 'NuevaClase',
        estereotipo: '',
        atributos: [],
        metodos: []
      }
    };
    addNode(newNode);
    broadcastEvent('NODE_CREATED', newNode.id, newNode);
  };

  const handleDeleteClass = (n: Node) => {
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









  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-lila-main border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-text-light font-medium">Cargando diagrama...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg-main font-sans">
      
      {/* TOP BAR */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-lila-light/50 flex items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={() => navigate(proyectoId ? `/proyectos/${proyectoId}` : '/dashboard')}
            className="p-1.5 hover:bg-lila-light/30 rounded-lg text-text-light hover:text-lila-main transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-4 w-px bg-gray-200"></div>
          
          <input 
            value={nombreDiagrama}
            onChange={(e) => setNombreDiagrama(e.target.value)}
            className="font-bold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-lila-light/50 rounded px-2 py-1 max-w-[200px]"
            placeholder="Nombre del diagrama"
          />
          <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full">Guardado manual</span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${connectionStatus === 'Sin conexión' ? 'text-red-500' : connectionStatus === 'Sincronizado' ? 'text-green-500' : 'text-yellow-500'}`}>
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Sin conexión' ? 'bg-red-500' : connectionStatus === 'Sincronizado' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              {connectionStatus === 'Sincronizado'
                ? `En línea · ${connectedUsers.length} ${connectedUsers.length === 1 ? 'colaborador' : 'colaboradores'}`
                : connectionStatus}
            </span>
            {connectionStatus === "Sincronizado" && connectedUsers.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <div className="flex -space-x-2">
                  {connectedUsers.map(u => (
                    <div key={u.id} title={`${u.nombre} — ${u.rol}`} className="w-7 h-7 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-[10px] font-bold text-lila-main">
                      {getInitials(u.nombre)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHistory(true)} className="px-3 py-1.5 text-xs font-bold text-lila-main bg-lila-light/10 hover:bg-lila-light/20 rounded-lg transition-colors">Actividad</button>
            <button onClick={() => setShowIaModal(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Asistente IA</button>
            <button onClick={() => setShowImageModal(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Imagen</button>
            <button onClick={() => setShowXmiImport(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Importar XMI</button>
            <button onClick={() => setShowXmiExport(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Exportar XMI</button>
            <button onClick={() => setShowGenerateBackendModal(true)} disabled={isGeneratingBackend} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
              {isGeneratingBackend ? 'Generando backend...' : 'Generar backend'}
            </button>
            <button onClick={() => setShowGenerateMobileModal(true)} disabled={isGeneratingMobile} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
              {isGeneratingMobile ? 'Generando móvil...' : 'Generar App Móvil'}
            </button>
            
            <button 
              onClick={handleSave}
              className="ml-2 px-4 py-2 bg-gradient-to-r from-lila-main to-pink-main text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative min-w-0 min-h-0">
        {/* SIDEBAR HERRAMIENTAS */}
        <aside className="w-14 lg:w-48 bg-white/95 backdrop-blur-md border-r border-lila-light/50 flex flex-col py-4 z-40 shadow-[4px_0_24px_rgba(139,92,246,0.03)] overflow-y-auto shrink-0">
          <div className="hidden lg:block px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Herramientas</div>
          <button 
            onClick={() => handleToolChange('select')}
            title="Seleccionar"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'select' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MousePointer2 className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Seleccionar</span>
          </button>
          <button 
            onClick={() => handleToolChange('umlClass')}
            title="Clase"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'umlClass' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Square className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Clase</span>
          </button>

          <div className="hidden lg:block px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Relaciones</div>
          <button 
            onClick={() => handleToolChange('ASOCIACION')}
            title="Asociación"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'ASOCIACION' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <ArrowRight className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Asociación</span>
          </button>
          <button 
            onClick={() => handleToolChange('AGREGACION')}
            title="Agregación"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'AGREGACION' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Diamond className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Agregación</span>
          </button>
          <button 
            onClick={() => handleToolChange('COMPOSICION')}
            title="Composición"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'COMPOSICION' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Layers className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Composición</span>
          </button>
          <button 
            onClick={() => handleToolChange('HERENCIA')}
            title="Generalización"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'HERENCIA' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Triangle className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Generalización</span>
          </button>
          <button 
            onClick={() => handleToolChange('DEPENDENCIA')}
            title="Dependencia"
            className={`flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-2 text-sm transition-colors ${selectedTool === 'DEPENDENCIA' ? 'bg-lila-light/30 text-lila-main border-r-2 border-lila-main' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MoveRight className="w-4 h-4 shrink-0" /> <span className="hidden lg:inline">Dependencia</span>
          </button>
        </aside>

        {/* LIENZO REACT FLOW */}
        <main className="flex-1 relative bg-[#FAFAFC] min-w-0 min-h-0">
          <ReactFlow
            nodes={pendingRelationSourceId
              ? nodes.map(node => node.id === pendingRelationSourceId ? { ...node, selected: true } : node)
              : nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(conn) => {
              if (selectedTool === 'select' || selectedTool === 'umlClass') return;
              const newEdge = { ...conn, id: generateId(), type: 'umlRelation', data: { tipo: selectedTool, nombre: '', multiplicidadOrigen: '', multiplicidadDestino: '' }, markerEnd: getMarkerEnd(selectedTool) };
              setEdges([...edges, newEdge as any]);
              broadcastEvent('EDGE_CREATED', newEdge.id, newEdge);
            }}
            onNodeClick={(_, node) => handleNodeClick(node)}
            onNodeDragStop={(e, node) => broadcastEvent('NODE_MOVED', node.id, node.position)}
            onEdgeClick={(_, edge) => {




              setSelectedEdgeId(edge.id);
            }}
            onPaneClick={(e) => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              
              if (selectedTool === 'umlClass') {
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
                setSelectedTool('select');
              }
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: 'umlRelation', markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' } }}
            className="bg-bg-main"
          >
            <Background color="#8B5CF6" gap={24} size={1} />
            <Controls className="fill-lila-main" />
            <MiniMap nodeColor="#FCE7F3" maskColor="rgba(250, 250, 252, 0.7)" />
          </ReactFlow>
          {pendingRelationSource && isRelationTool(selectedTool) && (
            <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-xs border border-lila-main/30 bg-white/95 px-3 py-2 shadow-md">
              <p className="text-xs font-bold text-lila-main">{relationToolLabels[selectedTool]}</p>
              <p className="mt-1 text-xs font-semibold text-gray-700">Origen: {pendingRelationSource.data.nombre as string}</p>
              <p className="text-xs text-gray-500">Selecciona la clase destino</p>
              {relationError && <p className="mt-1 text-xs font-semibold text-red-600">{relationError}</p>}
            </div>
          )}
        </main>

        {/* PANEL DERECHO */}
        <aside className="absolute inset-y-0 right-0 w-80 max-w-[calc(100%_-_3.5rem)] lg:static lg:max-w-none bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col z-40 overflow-hidden shrink-0">
          <div className="flex border-b border-lila-light/50 bg-gray-50/50">
            <button 
              className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors ${rightTab === 'inspector' ? 'text-lila-main border-b-2 border-lila-main bg-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              onClick={() => setRightTab('inspector')}
            >
              <div className="flex items-center justify-center gap-2">
                <Settings2 className="w-4 h-4" /> Inspector
              </div>
            </button>
            <button 
              className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors ${rightTab === 'colaboracion' ? 'text-lila-main border-b-2 border-lila-main bg-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              onClick={() => setRightTab('colaboracion')}
            >
              Colaboración
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 min-h-0">
            {rightTab === 'inspector' && (
              <>
                {!selectedNode && !selectedEdge && (
                  <div className="text-sm text-gray-500 text-center mt-10">Selecciona una clase o relación para editarla.</div>
                )}
            
            {/* Si es CLASE */}
            {selectedNode && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estereotipo</label>
                  <input 
                    className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lila-main"
                    placeholder="ej: entity"
                    value={selectedNode.data.estereotipo as string || ''}
                    onChange={(e) => handleUpdateNodeData(selectedNode.id, { estereotipo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de Clase</label>
                  <input 
                    className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-lila-main"
                    value={selectedNode.data.nombre as string}
                    onChange={(e) => handleUpdateNodeData(selectedNode.id, { nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atributos</label>
                    <button 
                      onClick={() => {
                        const arr = selectedNode.data.atributos as any[] || [];
                        handleUpdateNodeData(selectedNode.id, { atributos: [...arr, { id: generateId(), nombre: 'nuevo', tipo: 'String', visibilidad: 'private' }]});
                      }}
                      className="text-lila-main hover:text-pink-main text-xs font-bold flex items-center gap-1"
                    >
                      <PlusSquare className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {((selectedNode.data.atributos as any[]) || []).map((attr, idx) => (
                      <div key={attr.id} className="flex gap-2 items-center p-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <select 
                          className="bg-white border border-gray-200 rounded text-xs px-1 py-1"
                          value={attr.visibilidad}
                          onChange={(e) => {
                            const arr = [...(selectedNode.data.atributos as any[])];
                            arr[idx].visibilidad = e.target.value;
                            handleUpdateNodeData(selectedNode.id, { atributos: arr });
                          }}
                        >
                          <option value="public">+</option>
                          <option value="private">-</option>
                          <option value="protected">#</option>
                        </select>
                        <input 
                          className="flex-1 bg-white border border-gray-200 rounded text-xs px-2 py-1"
                          value={attr.nombre}
                          onChange={(e) => {
                            const arr = [...(selectedNode.data.atributos as any[])];
                            arr[idx].nombre = e.target.value;
                            handleUpdateNodeData(selectedNode.id, { atributos: arr });
                          }}
                        />
                        <input 
                          className="w-20 bg-white border border-gray-200 rounded text-xs px-2 py-1"
                          value={attr.tipo}
                          onChange={(e) => {
                            const arr = [...(selectedNode.data.atributos as any[])];
                            arr[idx].tipo = e.target.value;
                            handleUpdateNodeData(selectedNode.id, { atributos: arr });
                          }}
                        />
                        <button onClick={() => {
                            const arr = [...(selectedNode.data.atributos as any[])];
                            arr.splice(idx, 1);
                            handleUpdateNodeData(selectedNode.id, { atributos: arr });
                          }} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Métodos</label>
                    <button 
                      onClick={() => {
                        const arr = selectedNode.data.metodos as any[] || [];
                        handleUpdateNodeData(selectedNode.id, { metodos: [...arr, { id: generateId(), nombre: 'nuevoMetodo', tipoRetorno: 'void', visibilidad: 'public', parametros: [] }]});
                      }}
                      className="text-lila-main hover:text-pink-main text-xs font-bold flex items-center gap-1"
                    >
                      <PlusSquare className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {((selectedNode.data.metodos as any[]) || []).map((method, idx) => (
                      <div key={method.id} className="flex flex-col gap-1 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex gap-2">
                          <select 
                            className="bg-white border border-gray-200 rounded text-xs px-1"
                            value={method.visibilidad}
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].visibilidad = e.target.value;
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }}
                          >
                            <option value="public">+</option>
                            <option value="private">-</option>
                            <option value="protected">#</option>
                          </select>
                          <input 
                            className="flex-1 bg-white border border-gray-200 rounded text-xs px-2 py-1"
                            value={method.nombre}
                            placeholder="nombre"
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].nombre = e.target.value;
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }}
                          />
                        </div>
                        <div className="flex gap-2 justify-between mt-1 items-center">
                          <span className="text-[10px] font-bold text-gray-500">Parámetros</span>
                          <button onClick={() => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].parametros = [...(arr[idx].parametros||[]), {nombre:'p', tipo:'String'}];
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }} className="text-[10px] text-lila-main">
                            + Param
                          </button>
                        </div>
                        {(Array.isArray(method.parametros) ? method.parametros : []).map((p:any, pIdx:number) => (
                          <div key={pIdx} className="flex gap-1 items-center">
                            <input className="w-14 bg-white border border-gray-200 rounded text-[9px] px-1 py-0.5"
                                   value={p.nombre}
                                   onChange={(e) => {
                                     const arr = [...(selectedNode.data.metodos as any[])];
                                     arr[idx].parametros[pIdx].nombre = e.target.value;
                                     handleUpdateNodeData(selectedNode.id, { metodos: arr });
                                   }}/>
                            <span className="text-[9px] text-gray-500">:</span>
                            <input className="w-14 bg-white border border-gray-200 rounded text-[9px] px-1 py-0.5"
                                   value={p.tipo}
                                   onChange={(e) => {
                                     const arr = [...(selectedNode.data.metodos as any[])];
                                     arr[idx].parametros[pIdx].tipo = e.target.value;
                                     handleUpdateNodeData(selectedNode.id, { metodos: arr });
                                   }}/>
                            <button onClick={() => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].parametros.splice(pIdx, 1);
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }} className="text-red-400 hover:text-red-600"><Trash2 className="w-2 h-2"/></button>
                          </div>
                        ))}
                        <div className="flex gap-2 justify-between mt-1 items-center">
                          <span className="text-[10px] font-bold text-gray-500">Retorno:</span>
                          <input 
                            className="w-16 bg-white border border-gray-200 rounded text-[10px] px-1 py-1"
                            value={method.tipoRetorno}
                            placeholder="Retorno"
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].tipoRetorno = e.target.value;
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }}
                          />
                          <button onClick={() => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr.splice(idx, 1);
                              handleUpdateNodeData(selectedNode.id, { metodos: arr });
                            }} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteClass(selectedNode)}
                  className="w-full mt-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar clase
                </button>
              </div>
            )}

            {/* Si es RELATION EDGE */}
            {selectedEdge && (
              <div className="space-y-6">
                 <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Relación</label>
                  <select 
                    className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-lila-main"
                    value={selectedEdge.data?.tipo as string || 'ASOCIACION'}
                    onChange={(e) => {
                      handleUpdateEdgeData(selectedEdge.id, { tipo: e.target.value });
                      setEdges(edges.map(edge => edge.id === selectedEdge.id ? { ...edge, markerEnd: getMarkerEnd(e.target.value) } : edge));
                    }}
                  >
                    <option value="ASOCIACION">Asociación</option>
                    <option value="HERENCIA">Herencia</option>
                    <option value="AGREGACION">Agregación</option>
                    <option value="COMPOSICION">Composición</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mult. Origen</label>
                    <input 
                      className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                      placeholder="ej: 1"
                      value={selectedEdge.data?.multiplicidadOrigen as string || ''}
                      onChange={(e) => {
                         handleUpdateEdgeData(selectedEdge.id, { multiplicidadOrigen: e.target.value });
                      }}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mult. Destino</label>
                    <input 
                      className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                      placeholder="ej: 0..*"
                      value={selectedEdge.data?.multiplicidadDestino as string || ''}
                      onChange={(e) => {
                         handleUpdateEdgeData(selectedEdge.id, { multiplicidadDestino: e.target.value });
                      }}
                    />
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setEdges(edges.filter(e => e.id !== selectedEdge.id));
                    broadcastEvent('EDGE_DELETED', selectedEdge.id);
                  }}
                  className="w-full mt-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar relación
                </button>
              </div>
            )}
              </>
            )}

            {/* CONTENIDO COLABORACIÓN */}
            {rightTab === 'colaboracion' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conectados ahora</h3>
                  <div className="space-y-2">
                    {!presenceReceived ? (
                      <div className="text-sm text-gray-400">Actualizando presencia...</div>
                    ) : connectedUsers.length === 0 ? (
                      <div className="text-sm text-gray-400">Nadie está conectado.</div>
                    ) : (
                      connectedUsers.map(u => (
                        <div key={u.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                          <div className="min-w-0">
                            <div className="font-medium break-words">{u.nombre}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{u.rol}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>























                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    Actividad reciente
                    <button onClick={() => setShowHistory(true)} className="text-[10px] bg-lila-light/20 text-lila-main px-2 py-1 rounded hover:bg-lila-light/40 transition-colors">Ver historial</button>
                  </h3>
                  <div className="space-y-3">
                    {historyEvents.slice(0, 5).map((ev: any, idx: number) => (
                         <div key={idx} className="text-[11px] text-gray-600 border-l-2 border-lila-light pl-2">
                           <span className="font-bold text-gray-800">{ev.usuarioNombre || 'Usuario'}</span>
                           {" "}
                           {getActivityDescription(ev.tipoEvento)}
                         </div>
                    ))}
                    {historyEvents.length === 0 && <div className="text-xs text-gray-400">Sin actividad reciente.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      
      {/* MODAL HISTORIAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Historial del diagrama</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-800">Cerrar</button>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
              <table className="w-full text-left border-collapse">
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
                      <td className="p-4 text-gray-500">
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
      )}

      {showGenerateBackendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Confirmar generación de Backend</h2>
              <button onClick={() => setShowGenerateBackendModal(false)} className="text-gray-500 hover:text-gray-800">Cerrar</button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-600">Se generará un proyecto Spring Boot basado en el diagrama actual con las siguientes características:</p>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700">
                <p><strong>Clases encontradas:</strong> {nodes.length}</p>
                <p><strong>Nombres:</strong> {nodes.map(n => n.data.nombre).join(', ') || 'Ninguna'}</p>
                <p><strong>Relaciones:</strong> {edges.length}</p>
              </div>

              <div className="bg-lila-light/10 p-4 rounded-lg text-sm text-gray-700">
                <p className="font-bold text-lila-main mb-2">Configuración PostgreSQL</p>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Host</label>
                      <input id="db-host" type="text" defaultValue="localhost" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Puerto</label>
                      <input id="db-port" type="number" defaultValue="5432" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Base de Datos</label>
                    <input id="db-name" type="text" defaultValue="generated_db" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Usuario</label>
                      <input id="db-user" type="text" defaultValue="postgres" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña</label>
                      <input id="db-pass" type="password" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-lila-main" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowGenerateBackendModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
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
                className="px-4 py-2 bg-gradient-to-r from-lila-main to-pink-main text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Generar ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateMobileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Confirmar generación de App Móvil</h2>
              <button onClick={() => setShowGenerateMobileModal(false)} className="text-gray-500 hover:text-gray-800">Cerrar</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Se generará un proyecto Flutter basado en el diagrama actual con las siguientes características:</p>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700">
                <p><strong>Clases detectadas:</strong> {nodes.length}</p>
                <p><strong>Modelos Dart y Pantallas CRUD:</strong> {nodes.map(n => n.data.nombre).join(', ') || 'Ninguna'}</p>
                <p><strong>Servicios REST:</strong> {nodes.map(n => `${n.data.nombre}Service`).join(', ') || 'Ninguno'}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 border border-blue-100">
                <p className="font-bold text-blue-600 mb-2">Tecnologías incluidas:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Flutter (Base Project)</li>
                  <li>Dart (Modelos fuertemente tipados)</li>
                  <li>HTTP REST (Consumo de APIs)</li>
                  <li>Widgets de Material Design</li>
                </ul>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowGenerateMobileModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowGenerateMobileModal(false);
                  handleGenerateMobile();
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Generar App Flutter
              </button>
            </div>
          </div>
        </div>
      )}

      {showXmiImport && (
        <XmiImportModal
          hasExistingContent={nodes.length > 0 || edges.length > 0}
          onClose={() => setShowXmiImport(false)}
          onImport={handleImportXmi}
        />
      )}

      {showXmiExport && (
        <XmiExportModal
          diagramName={nombreDiagrama}
          model={buildCurrentModel()}
          onClose={() => setShowXmiExport(false)}
        />
      )}

      {showIaModal && (
        <IAModelModal
          diagramaId={id ? Number(id) : null}
          hasExistingContent={nodes.length > 0}
          onClose={() => setShowIaModal(false)}
          onApply={(model) => {
            applyUmlModel(model);
            setShowIaModal(false);
          }}
        />
      )}

      {showImageModal && (
        <ImageUmlImportModal
          diagramaId={id ? Number(id) : null}
          hasExistingContent={nodes.length > 0 || edges.length > 0}
          onClose={() => setShowImageModal(false)}
          onApply={(model) => {
            applyUmlModel(model);
            setShowImageModal(false);
          }}
        />
      )}
    </div>
  );
}


