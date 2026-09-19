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
  markerEnd,
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
  const multiplicidadOrigen = data?.multiplicidadOrigen as string;
  const multiplicidadDestino = data?.multiplicidadDestino as string;

  // Custom stroke according to UML type (e.g. solid or dashed)
  let customStyle = { ...style, strokeWidth: 2, stroke: '#8B5CF6' };
  
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={customStyle} id={id} />
      
      {/* Edge Label Renderer for Multiplicities */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-lila-main border border-lila-light/50 shadow-sm cursor-pointer hover:bg-lila-light/50 transition-colors">
            {tipo}
          </div>
        </div>
        
        {/* Origen (cerca al source) */}
        {multiplicidadOrigen && (
           <div
           style={{
             position: 'absolute',
             transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX)*0.2}px, ${sourceY + (labelY - sourceY)*0.2}px)`,
             pointerEvents: 'none',
           }}
           className="nodrag nopan text-[11px] font-mono font-semibold text-gray-500 bg-white/70 px-1 rounded"
         >
           {multiplicidadOrigen}
         </div>
        )}

        {/* Destino (cerca al target) */}
        {multiplicidadDestino && (
           <div
           style={{
             position: 'absolute',
             transform: `translate(-50%, -50%) translate(${targetX + (labelX - targetX)*0.2}px, ${targetY + (labelY - targetY)*0.2}px)`,
             pointerEvents: 'none',
           }}
           className="nodrag nopan text-[11px] font-mono font-semibold text-gray-500 bg-white/70 px-1 rounded"
         >
           {multiplicidadDestino}
         </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
