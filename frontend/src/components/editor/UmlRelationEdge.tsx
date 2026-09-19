import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export default function UmlRelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const tipo = data?.tipo as string;
  const nombre = data?.nombre as string;
  const multiplicidadOrigen = data?.multiplicidadOrigen as string;
  const multiplicidadDestino = data?.multiplicidadDestino as string;

  let customStyle = { ...style, strokeWidth: 2, stroke: '#8B5CF6' };
  let markerEnd = '';

  switch (tipo) {
    case 'AGREGACION':
      markerEnd = 'url(#agregacion-marker)';
      break;
    case 'COMPOSICION':
      markerEnd = 'url(#composicion-marker)';
      break;
    case 'GENERALIZACION':
      markerEnd = 'url(#generalizacion-marker)';
      break;
    case 'DEPENDENCIA':
      markerEnd = 'url(#dependencia-marker)';
      customStyle.strokeDasharray = '5,5';
      break;
    default:
      // ASOCIACION
      break;
  }
  
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={customStyle} id={id} />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-lila-main border border-lila-light/50 shadow-sm cursor-pointer hover:bg-lila-light/50 transition-colors flex flex-col items-center">
            <span className="text-[8px] opacity-70 uppercase tracking-widest">{tipo}</span>
            {nombre && <span>{nombre}</span>}
          </div>
        </div>
        
        {/* Origen (cerca al source) */}
        {multiplicidadOrigen && (
           <div
           style={{
             position: 'absolute',
             transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX)*0.15}px, ${sourceY + (labelY - sourceY)*0.15}px)`,
             pointerEvents: 'none',
           }}
           className="nodrag nopan text-[11px] font-mono font-semibold text-gray-700 bg-white/90 px-1 rounded shadow-sm border border-gray-100"
         >
           {multiplicidadOrigen}
         </div>
        )}

        {/* Destino (cerca al target) */}
        {multiplicidadDestino && (
           <div
           style={{
             position: 'absolute',
             transform: `translate(-50%, -50%) translate(${targetX + (labelX - targetX)*0.15}px, ${targetY + (labelY - targetY)*0.15}px)`,
             pointerEvents: 'none',
           }}
           className="nodrag nopan text-[11px] font-mono font-semibold text-gray-700 bg-white/90 px-1 rounded shadow-sm border border-gray-100"
         >
           {multiplicidadDestino}
         </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
