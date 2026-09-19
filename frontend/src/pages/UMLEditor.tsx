import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useEditorStore } from '../store/editorStore';
import { ArrowLeft, Save, PlusSquare, Trash2, Settings2 } from 'lucide-react';

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
import type { UmlModelJson } from '../types/uml';

const nodeTypes = { umlClass: UmlClassNode };
const edgeTypes = { umlRelation: UmlRelationEdge };

export default function UMLEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  // const { user } = useAuthStore();
  
  const {
    nodes, edges, selectedNodeId, selectedEdgeId,
    onNodesChange, onEdgesChange, onConnect,
    setNodes, setEdges, addNode, updateNodeData,
    setSelectedNodeId, setSelectedEdgeId
  } = useEditorStore();

  const [nombreDiagrama, setNombreDiagrama] = useState('Cargando...');
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<number | null>(null);
  
  // Right Panel state hooks for selected node/edge
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  // Generador de IDs UUID sencillo
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const fetchDiagram = async () => {
    try {
      const { data } = await api.get(`/diagramas/${id}`);
      setNombreDiagrama(data.nombre);
      setProyectoId(data.proyectoId);
      
      const parsed: UmlModelJson = JSON.parse(data.modeloJson);
      
      const reactFlowNodes: Node[] = parsed.clases.map(c => ({
        id: c.id,
        type: 'umlClass',
        position: { x: c.posicionX, y: c.posicionY },
        data: { ...c }
      }));

      const reactFlowEdges: Edge[] = parsed.relaciones.map(r => ({
        id: r.id,
        source: r.origen,
        target: r.destino,
        type: 'umlRelation',
        data: {
          tipo: r.tipo,
          multiplicidadOrigen: r.multiplicidadOrigen,
          multiplicidadDestino: r.multiplicidadDestino
        },
        markerEnd: getMarkerEnd(r.tipo)
      }));

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (err) {
      console.error(err);
      alert('Error cargando el diagrama');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDiagram();
  }, [id]);

  const getMarkerEnd = (tipo: string) => {
    switch (tipo) {
      case 'HERENCIA':
        return { type: MarkerType.ArrowClosed, color: '#8B5CF6', width: 20, height: 20 };
      case 'AGREGACION':
        return { type: MarkerType.Arrow, color: '#8B5CF6' }; // ReactFlow doesnt have built in diamond, using Arrow for now
      case 'COMPOSICION':
        return { type: MarkerType.ArrowClosed, color: '#8B5CF6' }; 
      default:
        return undefined; // ASOCIACION
    }
  };

  const handleSave = async () => {
    try {
      const modelo: UmlModelJson = {
        clases: nodes.map(n => ({
          id: n.id,
          nombre: n.data.nombre as string,
          posicionX: n.position.x,
          posicionY: n.position.y,
          atributos: n.data.atributos as any[],
          metodos: n.data.metodos as any[]
        })),
        relaciones: edges.map(e => ({
          id: e.id,
          origen: e.source,
          destino: e.target,
          tipo: (e.data?.tipo as any) || 'ASOCIACION',
          multiplicidadOrigen: (e.data?.multiplicidadOrigen as string) || '',
          multiplicidadDestino: (e.data?.multiplicidadDestino as string) || ''
        }))
      };

      await api.put(`/diagramas/${id}`, {
        nombre: nombreDiagrama,
        modeloJson: JSON.stringify(modelo)
      });

      alert('Diagrama guardado correctamente');
    } catch (err) {
      console.error(err);
      alert('Error guardando diagrama');
    }
  };

  const handleCambiarNombre = async () => {
    if(!nombreDiagrama.trim()) return;
    try {
      await api.patch(`/diagramas/${id}/nombre`, { nombre: nombreDiagrama });
    } catch(err) {
      console.error("Error cambiando nombre", err);
    }
  }

  const handleAddClass = () => {
    const newNode: Node = {
      id: `c_${generateId()}`,
      type: 'umlClass',
      position: { x: 100, y: 100 },
      data: {
        id: `c_${generateId()}`,
        nombre: 'NuevaClase',
        atributos: [],
        metodos: []
      }
    };
    addNode(newNode);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-bg-main"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main"></div></div>;
  }

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-bg-main">
      
      {/* HEADER */}
      <header className="h-16 bg-white/90 backdrop-blur-md border-b border-lila-light/50 px-4 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/proyectos/${proyectoId}`)} 
            className="p-2 text-gray-500 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all"
            title="Volver al proyecto"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <input 
            value={nombreDiagrama}
            onChange={(e) => setNombreDiagrama(e.target.value)}
            onBlur={handleCambiarNombre}
            className="font-bold text-lg text-text-dark bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-lila-light rounded px-2 w-64"
          />
        </div>
        
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-lila-main to-pink-main text-white font-bold rounded-xl shadow-md shadow-pink-main/20 hover:opacity-90 transition-all text-sm"
        >
          <Save className="w-4 h-4" /> Guardar
        </button>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR HERRAMIENTAS */}
        <aside className="w-16 bg-white/90 backdrop-blur-md border-r border-lila-light/50 flex flex-col items-center py-4 gap-4 z-40 shadow-[4px_0_24px_rgba(139,92,246,0.03)]">
          <button 
            onClick={handleAddClass}
            className="w-10 h-10 bg-lila-light/50 text-lila-main rounded-xl flex items-center justify-center hover:bg-lila-main hover:text-white transition-all shadow-sm"
            title="Añadir Clase"
          >
            <PlusSquare className="w-5 h-5" />
          </button>
          {/* Aquí podrían ir más herramientas de dibujo rápido */}
        </aside>

        {/* LIENZO REACT FLOW */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            className="bg-bg-main"
          >
            <Background color="#8B5CF6" gap={24} size={1} />
            <Controls className="fill-lila-main" />
            <MiniMap nodeColor="#FCE7F3" maskColor="rgba(250, 250, 252, 0.7)" />
          </ReactFlow>
        </main>

        {/* PANEL DE PROPIEDADES DERECHO */}
        <aside className={`w-80 bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col z-40 transform transition-transform duration-300 overflow-y-auto ${selectedNode || selectedEdge ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
          <div className="p-5 border-b border-lila-light/50 flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-lila-main" />
            <h2 className="font-bold text-text-dark">Propiedades</h2>
          </div>

          <div className="p-5">
            {/* Si es CLASE */}
            {selectedNode && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de Clase</label>
                  <input 
                    className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-lila-main"
                    value={selectedNode.data.nombre as string}
                    onChange={(e) => updateNodeData(selectedNode.id, { nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atributos</label>
                    <button 
                      onClick={() => {
                        const arr = selectedNode.data.atributos as any[] || [];
                        updateNodeData(selectedNode.id, { atributos: [...arr, { id: generateId(), nombre: 'nuevoAtr', tipo: 'String', visibilidad: 'private' }]});
                      }}
                      className="text-lila-main hover:text-pink-main text-xs font-bold flex items-center gap-1"
                    >
                      <PlusSquare className="w-3 h-3" /> Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {((selectedNode.data.atributos as any[]) || []).map((attr, idx) => (
                      <div key={attr.id} className="flex flex-col gap-1 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex gap-2">
                          <select 
                            className="bg-white border border-gray-200 rounded text-xs px-1"
                            value={attr.visibilidad}
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.atributos as any[])];
                              arr[idx].visibilidad = e.target.value;
                              updateNodeData(selectedNode.id, { atributos: arr });
                            }}
                          >
                            <option value="public">+</option>
                            <option value="private">-</option>
                            <option value="protected">#</option>
                          </select>
                          <input 
                            className="flex-1 bg-white border border-gray-200 rounded text-xs px-2 py-1"
                            value={attr.nombre}
                            placeholder="nombre"
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.atributos as any[])];
                              arr[idx].nombre = e.target.value;
                              updateNodeData(selectedNode.id, { atributos: arr });
                            }}
                          />
                        </div>
                        <div className="flex gap-2 justify-between">
                          <input 
                            className="w-24 bg-white border border-gray-200 rounded text-xs px-2 py-1"
                            value={attr.tipo}
                            placeholder="Tipo"
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.atributos as any[])];
                              arr[idx].tipo = e.target.value;
                              updateNodeData(selectedNode.id, { atributos: arr });
                            }}
                          />
                          <button onClick={() => {
                              const arr = [...(selectedNode.data.atributos as any[])];
                              arr.splice(idx, 1);
                              updateNodeData(selectedNode.id, { atributos: arr });
                            }} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Métodos</label>
                    <button 
                      onClick={() => {
                        const arr = selectedNode.data.metodos as any[] || [];
                        updateNodeData(selectedNode.id, { metodos: [...arr, { id: generateId(), nombre: 'nuevoMetodo', tipoRetorno: 'void', visibilidad: 'public', parametros: '' }]});
                      }}
                      className="text-lila-main hover:text-pink-main text-xs font-bold flex items-center gap-1"
                    >
                      <PlusSquare className="w-3 h-3" /> Add
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
                              updateNodeData(selectedNode.id, { metodos: arr });
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
                              updateNodeData(selectedNode.id, { metodos: arr });
                            }}
                          />
                        </div>
                        <div className="flex gap-2 justify-between mt-1">
                          <input 
                             className="w-16 bg-white border border-gray-200 rounded text-[10px] px-1 py-1"
                             value={method.parametros}
                             placeholder="params"
                             onChange={(e) => {
                               const arr = [...(selectedNode.data.metodos as any[])];
                               arr[idx].parametros = e.target.value;
                               updateNodeData(selectedNode.id, { metodos: arr });
                             }}
                          />
                          <input 
                            className="w-16 bg-white border border-gray-200 rounded text-[10px] px-1 py-1"
                            value={method.tipoRetorno}
                            placeholder="Retorno"
                            onChange={(e) => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr[idx].tipoRetorno = e.target.value;
                              updateNodeData(selectedNode.id, { metodos: arr });
                            }}
                          />
                          <button onClick={() => {
                              const arr = [...(selectedNode.data.metodos as any[])];
                              arr.splice(idx, 1);
                              updateNodeData(selectedNode.id, { metodos: arr });
                            }} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                      setEdges(edges.map(edge => 
                        edge.id === selectedEdge.id 
                        ? { ...edge, data: { ...edge.data, tipo: e.target.value }, markerEnd: getMarkerEnd(e.target.value) } 
                        : edge
                      ));
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
                         setEdges(edges.map(edge => 
                          edge.id === selectedEdge.id 
                          ? { ...edge, data: { ...edge.data, multiplicidadOrigen: e.target.value } } 
                          : edge
                        ));
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
                         setEdges(edges.map(edge => 
                          edge.id === selectedEdge.id 
                          ? { ...edge, data: { ...edge.data, multiplicidadDestino: e.target.value } } 
                          : edge
                        ));
                      }}
                    />
                  </div>
                </div>
                
                <button 
                  onClick={() => setEdges(edges.filter(e => e.id !== selectedEdge.id))}
                  className="w-full mt-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar relación
                </button>
              </div>
            )}

            {!selectedNode && !selectedEdge && (
               <div className="text-center text-gray-400 text-sm mt-10">
                 Selecciona una clase o una relación para editar sus propiedades.
               </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
