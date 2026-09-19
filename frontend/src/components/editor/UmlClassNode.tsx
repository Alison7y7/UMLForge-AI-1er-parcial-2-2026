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
    case 'package': return '~';
    default: return '+';
  }
}

export default function UmlClassNode({ data, selected }: Props) {
  return (
    <div className={`bg-white w-[240px] shadow-sm overflow-hidden border border-gray-300 ${selected ? 'ring-2 ring-lila-main border-lila-main shadow-md' : 'hover:border-gray-400'} ${data.lockedBy ? 'ring-2 ring-orange-400 border-orange-400' : ''} transition-all relative`}>
      {data.lockedBy && (
        <div className="absolute top-0 right-0 bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md">
          {data.lockedBy} editando
        </div>
      )}
      <Handle type="target" position={Position.Top} className="w-full h-2 bg-transparent border-none rounded-none opacity-0" />
      <Handle type="target" position={Position.Left} className="w-2 h-full bg-transparent border-none rounded-none opacity-0" />
      
      {/* Header Clases */}
      <div className={`px-2 py-2 text-center border-b border-gray-300 ${selected ? 'bg-lila-main/5' : 'bg-gray-50'}`}>
        {data.estereotipo && (
          <div className="text-[10px] text-gray-500 mb-0.5">&lt;&lt;{data.estereotipo}&gt;&gt;</div>
        )}
        <h3 className="font-bold text-sm text-gray-800 font-sans break-words">{data.nombre}</h3>
      </div>
      
      {/* Atributos */}
      <div className="px-3 py-1.5 border-b border-gray-300 min-h-[1.5rem] bg-white">
        {data.atributos && data.atributos.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {data.atributos.map(attr => (
              <span key={attr.id} className="text-[11px] text-gray-700 font-mono">
                {getVisibilitySymbol(attr.visibilidad)} {attr.nombre}: {attr.tipo}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Metodos */}
      <div className="px-3 py-1.5 min-h-[1.5rem] bg-white">
        {data.metodos && data.metodos.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {data.metodos.map(method => (
              <span key={method.id} className="text-[11px] text-gray-700 font-mono">
                {getVisibilitySymbol(method.visibilidad)} {method.nombre}({(Array.isArray(method.parametros) ? method.parametros : []).map(p => `${p.nombre}: ${p.tipo}`).join(', ')}): {method.tipoRetorno}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-full h-2 bg-transparent border-none rounded-none opacity-0" />
      <Handle type="source" position={Position.Right} className="w-2 h-full bg-transparent border-none rounded-none opacity-0" />
    </div>
  );
}
