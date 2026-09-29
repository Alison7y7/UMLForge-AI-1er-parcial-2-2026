import { BaseEdge, EdgeLabelRenderer, getBezierPath, useInternalNode, Position } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

function getNodeIntersection(intersectionNode: any, targetNode: any, fallbackX: number, fallbackY: number) {
  const width = intersectionNode?.measured?.width || intersectionNode?.width || 0;
  const height = intersectionNode?.measured?.height || intersectionNode?.height || 0;
  const pos1 = intersectionNode?.internals?.positionAbsolute || intersectionNode?.positionAbsolute || intersectionNode?.position;
  const pos2 = targetNode?.internals?.positionAbsolute || targetNode?.positionAbsolute || targetNode?.position;

  if (!width || !height || !pos1 || !pos2) return { x: fallbackX, y: fallbackY };

  const targetWidth = targetNode?.measured?.width || targetNode?.width || 0;
  const targetHeight = targetNode?.measured?.height || targetNode?.height || 0;

  const w = width / 2;
  const h = height / 2;
  const x2 = pos1.x + w;
  const y2 = pos1.y + h;
  const x1 = pos2.x + targetWidth / 2;
  const y1 = pos2.y + targetHeight / 2;

  if (x1 === x2 && y1 === y2) return { x: fallbackX, y: fallbackY };

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;
  
  return { x, y };
}

function getEdgePosition(node: any, intersectionPoint: any, fallbackPos: Position) {
  const width = node?.measured?.width || node?.width || 0;
  const height = node?.measured?.height || node?.height || 0;
  const pos = node?.internals?.positionAbsolute || node?.positionAbsolute || node?.position;
  
  if (!width || !height || !pos) return fallbackPos;

  const nx = Math.round(pos.x);
  const ny = Math.round(pos.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + height - 1) return Position.Bottom;

  return fallbackPos;
}

export default function UmlRelationEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;
  let sPos = sourcePosition;
  let tPos = targetPosition;

  if (sourceNode && targetNode) {
    const sourceIntersectionPoint = getNodeIntersection(sourceNode, targetNode, sourceX, sourceY);
    const targetIntersectionPoint = getNodeIntersection(targetNode, sourceNode, targetX, targetY);
    
    sPos = getEdgePosition(sourceNode, sourceIntersectionPoint, sourcePosition);
    tPos = getEdgePosition(targetNode, targetIntersectionPoint, targetPosition);

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    const offset = (Math.abs(hash) % 60) - 30;

    sx = sourceIntersectionPoint.x;
    sy = sourceIntersectionPoint.y;
    tx = targetIntersectionPoint.x;
    ty = targetIntersectionPoint.y;

    if (sPos === Position.Top || sPos === Position.Bottom) {
      sx += offset;
    } else {
      sy += offset;
    }

    if (tPos === Position.Top || tPos === Position.Bottom) {
      tx += offset;
    } else {
      ty += offset;
    }
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sPos,
    targetX: tx,
    targetY: ty,
    targetPosition: tPos,
  });

  const tipo = data?.tipo as string;
  const nombre = data?.nombre as string;
  const multiplicidadOrigen = data?.multiplicidadOrigen as string;
  const multiplicidadDestino = data?.multiplicidadDestino as string;
  const rolOrigen = data?.rolOrigen as string;
  const rolDestino = data?.rolDestino as string;

  let customStyle = { ...style, strokeWidth: 2, stroke: '#8B5CF6' };
  let markerEnd = '';

  switch (tipo) {
    case 'AGREGACION':
      markerEnd = 'url(#agregacion-marker)';
      break;
    case 'COMPOSICION':
      markerEnd = 'url(#composicion-marker)';
      break;
    case 'HERENCIA':
    case 'GENERALIZACION':
      markerEnd = 'url(#generalizacion-marker)';
      break;
    case 'DEPENDENCIA':
      markerEnd = 'url(#dependencia-marker)';
      customStyle.strokeDasharray = '5,5';
      break;
    default:
      break;
  }
  
  const assocNode = useInternalNode(data?.claseAsociacion as string || '');
  let assocPath = '';
  const assocNodePos = assocNode?.internals?.positionAbsolute || (assocNode as any)?.positionAbsolute || assocNode?.position;
  if (assocNode && assocNodePos) {
    const ax = assocNodePos.x + (assocNode.measured?.width || 120) / 2;
    const ay = assocNodePos.y + (assocNode.measured?.height || 60) / 2;
    assocPath = `M ${labelX} ${labelY} L ${ax} ${ay}`;
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={customStyle} id={id} />
      {assocPath && <path d={assocPath} stroke="#666" strokeWidth={1} strokeDasharray="5,5" fill="none" />}
      
      <EdgeLabelRenderer>
        {nombre && (
          <div
            style={{
              position: 'absolute',
              transform: "translate(-50%, -50%) translate(" + labelX + "px," + labelY + "px)",
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-bold text-lila-main border border-lila-light/50 shadow-sm cursor-pointer hover:bg-lila-light/50 transition-colors">
              <span>{nombre}</span>
            </div>
          </div>
        )}
        
        {(multiplicidadOrigen || rolOrigen) && (
           <div
           style={{
             position: 'absolute',
             transform: "translate(-50%, -50%) translate(" + (sx + (labelX - sx)*0.25) + "px," + (sy + (labelY - sy)*0.25) + "px)",
             pointerEvents: 'none',
           }}
           className="nodrag nopan flex flex-col items-center gap-0.5"
         >
           {multiplicidadOrigen && <span className="text-[10px] font-mono font-semibold text-gray-700 bg-white/90 px-1 rounded shadow-sm border border-gray-100">{multiplicidadOrigen}</span>}
           {rolOrigen && <span className="text-[10px] italic font-semibold text-pink-main bg-white/90 px-1 rounded">{rolOrigen}</span>}
         </div>
        )}

        {(multiplicidadDestino || rolDestino) && (
           <div
           style={{
             position: 'absolute',
             transform: "translate(-50%, -50%) translate(" + (tx + (labelX - tx)*0.25) + "px," + (ty + (labelY - ty)*0.25) + "px)",
             pointerEvents: 'none',
           }}
           className="nodrag nopan flex flex-col items-center gap-0.5"
         >
           {multiplicidadDestino && <span className="text-[10px] font-mono font-semibold text-gray-700 bg-white/90 px-1 rounded shadow-sm border border-gray-100">{multiplicidadDestino}</span>}
           {rolDestino && <span className="text-[10px] italic font-semibold text-pink-main bg-white/90 px-1 rounded">{rolDestino}</span>}
         </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
