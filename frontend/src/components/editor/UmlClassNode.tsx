import { Handle, Position } from '@xyflow/react';
import type { UmlClass } from '../../types/uml';

interface Props {
  data: UmlClass;
  selected?: boolean;
}

const getVisibilitySymbol = (vis: string) => {
  switch(vis) {
    case 'public': return '+';
    case 'private': return '-';
    case 'protected': return '#';
    default: return '+';
  }
}

export default function UmlClassNode({ data, selected }: Props) {
  return (
    <div className={`bg-white min-w-[160px] max-w-[250px] shadow-sm rounded-xl overflow-hidden border ${selected ? 'border-lila-main shadow-lila-main/30 shadow-md ring-2 ring-lila-light' : 'border-lila-light/80'} transition-all`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-lila-main opacity-0 hover:opacity-100" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-lila-main opacity-0 hover:opacity-100" />
      
      {/* Header Clases */}
      <div className="bg-lila-light/50 px-4 py-2 border-b border-lila-light/80 text-center">
        <h3 className="font-bold text-sm text-text-dark font-sans break-words">{data.nombre}</h3>
      </div>
      
      {/* Atributos */}
      <div className="px-3 py-2 border-b border-lila-light/50 min-h-[1.5rem]">
        {data.atributos && data.atributos.length > 0 ? (
          <div className="flex flex-col gap-1">
            {data.atributos.map(attr => (
              <span key={attr.id} className="text-xs text-gray-700 font-mono">
                {getVisibilitySymbol(attr.visibilidad)} {attr.nombre}: {attr.tipo}
              </span>
            ))}
          </div>
        ) : (
           <div className="h-2"></div>
        )}
      </div>

      {/* Metodos */}
      <div className="px-3 py-2 min-h-[1.5rem]">
        {data.metodos && data.metodos.length > 0 ? (
          <div className="flex flex-col gap-1">
            {data.metodos.map(method => (
              <span key={method.id} className="text-xs text-gray-700 font-mono">
                {getVisibilitySymbol(method.visibilidad)} {method.nombre}({method.parametros}): {method.tipoRetorno}
              </span>
            ))}
          </div>
        ) : (
          <div className="h-2"></div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-lila-main opacity-0 hover:opacity-100" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-lila-main opacity-0 hover:opacity-100" />
    </div>
  );
}
