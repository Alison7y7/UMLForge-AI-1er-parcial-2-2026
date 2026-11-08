import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  MessageSquare, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  X,
  ChevronUp,
  Sparkles,
  Info,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Paperclip,
  Mic,
  AudioLines,
  Square,
  Trash2,
  FileText,
  ChevronDown,
  Box,
  Code2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useProjectChat } from '../../hooks/useProjectChat';
import { useAuthStore } from '../../store/authStore';
import type { MensajeChat, RecomendacionUml } from '../../types/chat';
import ChatAttachmentView from './ChatAttachmentView';
import { chatDateKey, formatChatDateLabel, formatChatTime } from '../../utils/chatDateTime';

export function formatTipoCambioLabel(tipo: string): string {
  switch (tipo) {
    case 'AGREGAR_CLASE':
      return '+ Clase';
    case 'ELIMINAR_CLASE':
      return '- Eliminar Clase';
    case 'AGREGAR_ATRIBUTO':
      return '+ Atributo';
    case 'MODIFICAR_ATRIBUTO':
      return '~ Modificar Atributo';
    case 'ELIMINAR_ATRIBUTO':
      return '- Eliminar Atributo';
    case 'AGREGAR_METODO':
      return '+ Método';
    case 'MODIFICAR_METODO':
      return '~ Modificar Método';
    case 'ELIMINAR_METODO':
      return '- Eliminar Método';
    case 'AGREGAR_RELACION':
      return '+ Relación';
    case 'MODIFICAR_RELACION':
      return '~ Modificar Relación';
    case 'ELIMINAR_RELACION':
      return '- Eliminar Relación';
    case 'RENOMBRAR_CLASE':
      return 'Renombrar Clase';
    default:
      return tipo || 'Cambio UML';
  }
}

function parseProposal(prop: any): any {
  if (!prop) return {};
  if (typeof prop === 'object') return prop;
  if (typeof prop === 'string') {
    try {
      const parsed = JSON.parse(prop);
      return typeof parsed === 'object' && parsed !== null ? parsed : { raw: prop };
    } catch {
      return { raw: prop };
    }
  }
  return {};
}

function formatVisibility(vis?: string): { symbol: string; label: string; className: string } {
  const v = (vis || 'private').toLowerCase().trim();
  if (v === 'public' || v === '+') {
    return { symbol: '+', label: 'public', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  }
  if (v === 'private' || v === '-') {
    return { symbol: '-', label: 'private', className: 'text-rose-700 bg-rose-50 border-rose-200' };
  }
  if (v === 'protected' || v === '#') {
    return { symbol: '#', label: 'protected', className: 'text-amber-700 bg-amber-50 border-amber-200' };
  }
  if (v === 'package' || v === '~') {
    return { symbol: '~', label: 'package', className: 'text-blue-700 bg-blue-50 border-blue-200' };
  }
  return { symbol: '•', label: v, className: 'text-gray-700 bg-gray-50 border-gray-200' };
}

function formatParameters(params?: any): string {
  if (!params) return '';
  if (typeof params === 'string') return params;
  if (Array.isArray(params)) {
    return params
      .map((p) => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        if (p.nombre && p.tipo) return `${p.nombre}: ${p.tipo}`;
        if (p.nombre) return p.nombre;
        return String(p);
      })
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

function formatRelationType(tipo?: string): { label: string; symbol: string; badgeClass: string } {
  const t = (tipo || 'ASOCIACION').toUpperCase();
  switch (t) {
    case 'ASOCIACION':
      return { label: 'Asociación', symbol: '──', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'HERENCIA':
    case 'GENERALIZACION':
      return { label: 'Herencia', symbol: '──▷', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'COMPOSICION':
      return { label: 'Composición', symbol: '◆──', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'AGREGACION':
      return { label: 'Agregación', symbol: '◇──', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'DEPENDENCIA':
      return { label: 'Dependencia', symbol: '- - ▷', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: t, symbol: '──', badgeClass: 'bg-gray-50 text-gray-700 border-gray-200' };
  }
}

export interface RecommendationEvaluation {
  status: 'APLICADA' | 'DESCARTADA' | 'PENDIENTE_DEPENDENCIA' | 'COMPATIBLE' | 'OBSOLETA';
  badgeLabel: string;
  badgeClass: string;
  isApplyDisabled: boolean;
  canReview: boolean;
  reason?: string;
  requiredDependency?: string;
  revalidatedAgainstCurrentVersion: boolean;
}

export function evaluateRecommendationStatus(
  rec: RecomendacionUml,
  appliedIds: Set<string>,
  discardedIds: Set<string>,
  currentDiagramVersion?: number,
  allRecsInMessage: RecomendacionUml[] = [],
  diagramClasses: Array<{ id: string; nombre: string }> = []
): RecommendationEvaluation {
  if (rec.id && appliedIds.has(rec.id)) {
    return {
      status: 'APLICADA',
      badgeLabel: 'Aplicada',
      badgeClass: 'text-green-700 bg-green-50 border border-green-200',
      isApplyDisabled: true,
      canReview: true,
      revalidatedAgainstCurrentVersion: false,
    };
  }

  if (rec.id && discardedIds.has(rec.id)) {
    return {
      status: 'DESCARTADA',
      badgeLabel: 'Descartada',
      badgeClass: 'text-gray-600 bg-gray-50 border border-gray-200',
      isApplyDisabled: true,
      canReview: true,
      revalidatedAgainstCurrentVersion: false,
    };
  }

  const isVersionDiverged = rec.versionDiagrama !== undefined
    && currentDiagramVersion !== undefined
    && rec.versionDiagrama !== currentDiagramVersion;

  const proposal = parseProposal(rec.cambioPropuesto);
  const knownClassNames = new Set(
    diagramClasses.map((c) => (c.nombre || '').trim().toLowerCase()).filter(Boolean)
  );
  const knownClassReferences = new Set(
    diagramClasses.flatMap((c) => [c.id, c.nombre]).map((value) => (value || '').trim().toLowerCase()).filter(Boolean)
  );

  // Other pending AGREGAR_CLASE proposals in the same revision
  const pendingProposedClassNames = new Set(
    allRecsInMessage
      .filter((r) => r.id !== rec.id && !appliedIds.has(r.id) && !discardedIds.has(r.id) && r.tipoCambio === 'AGREGAR_CLASE')
      .map((r) => {
        const p = parseProposal(r.cambioPropuesto);
        return (p.nombre || r.elementoAfectado?.nombre || '').trim().toLowerCase();
      })
      .filter(Boolean)
  );

  // 1. AGREGAR_CLASE
  if (rec.tipoCambio === 'AGREGAR_CLASE') {
    const className = (proposal.nombre || rec.elementoAfectado?.nombre || '').trim();
    if (className && knownClassNames.has(className.toLowerCase())) {
      return {
        status: 'OBSOLETA',
        badgeLabel: 'Ya existe en diagrama (Obsoleta)',
        badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
        isApplyDisabled: true,
        canReview: true,
        reason: `La clase «${className}» ya existe en el modelo actual.`,
        revalidatedAgainstCurrentVersion: isVersionDiverged,
      };
    }

    // Check relations inside the class
    const rels = Array.isArray(proposal.relaciones) ? proposal.relaciones : [];
    for (const rel of rels) {
      const dest = (rel.destino || rel.destinoNombre || rel.claseDestino || rel.destinoId || '').trim();
      if (dest && !knownClassReferences.has(dest.toLowerCase())) {
        if (pendingProposedClassNames.has(dest.toLowerCase())) {
          return {
            status: 'PENDIENTE_DEPENDENCIA',
            badgeLabel: `Pendiente de «${dest}»`,
            badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200',
            isApplyDisabled: true,
            canReview: true,
            requiredDependency: dest,
            reason: `Requiere que la clase «${dest}» sea creada primero`,
            revalidatedAgainstCurrentVersion: isVersionDiverged,
          };
        }
      }
    }

    return {
      status: 'COMPATIBLE',
      badgeLabel: isVersionDiverged ? `Compatible (v${currentDiagramVersion})` : 'Compatible',
      badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200',
      isApplyDisabled: false,
      canReview: true,
      revalidatedAgainstCurrentVersion: isVersionDiverged,
    };
  }

  // 2. AGREGAR_RELACION
  if (rec.tipoCambio === 'AGREGAR_RELACION') {
    const origen = (proposal.origenNombre || proposal.origen || rec.elementoAfectado?.nombre || '').trim();
    const destino = (proposal.destinoNombre || proposal.destino || '').trim();

    if (origen && !knownClassReferences.has(origen.toLowerCase())) {
      if (pendingProposedClassNames.has(origen.toLowerCase())) {
        return {
          status: 'PENDIENTE_DEPENDENCIA',
          badgeLabel: `Pendiente de «${origen}»`,
          badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200',
          isApplyDisabled: true,
          canReview: true,
          requiredDependency: origen,
          reason: `Requiere que la clase origen «${origen}» sea creada primero`,
          revalidatedAgainstCurrentVersion: isVersionDiverged,
        };
      } else if (diagramClasses.length > 0) {
        return {
          status: 'OBSOLETA',
          badgeLabel: 'Obsoleta',
          badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
          isApplyDisabled: true,
          canReview: true,
          reason: `La clase origen «${origen}» no existe en el diagrama`,
          revalidatedAgainstCurrentVersion: isVersionDiverged,
        };
      }
    }

    if (destino && !knownClassReferences.has(destino.toLowerCase())) {
      if (pendingProposedClassNames.has(destino.toLowerCase())) {
        return {
          status: 'PENDIENTE_DEPENDENCIA',
          badgeLabel: `Pendiente de «${destino}»`,
          badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200',
          isApplyDisabled: true,
          canReview: true,
          requiredDependency: destino,
          reason: `Requiere que la clase destino «${destino}» sea creada primero`,
          revalidatedAgainstCurrentVersion: isVersionDiverged,
        };
      } else if (diagramClasses.length > 0) {
        return {
          status: 'OBSOLETA',
          badgeLabel: 'Obsoleta',
          badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
          isApplyDisabled: true,
          canReview: true,
          reason: `La clase destino «${destino}» no existe en el diagrama`,
          revalidatedAgainstCurrentVersion: isVersionDiverged,
        };
      }
    }

    return {
      status: 'COMPATIBLE',
      badgeLabel: isVersionDiverged ? `Compatible (v${currentDiagramVersion})` : 'Compatible',
      badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200',
      isApplyDisabled: false,
      canReview: true,
      revalidatedAgainstCurrentVersion: isVersionDiverged,
    };
  }

  // 3. Modificaciones sobre clase existente
  const targetClass = (rec.elementoAfectado?.nombre || '').trim();
  if (targetClass && diagramClasses.length > 0 && !knownClassNames.has(targetClass.toLowerCase())) {
    return {
      status: 'OBSOLETA',
      badgeLabel: 'Obsoleta',
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
      isApplyDisabled: true,
      canReview: true,
      reason: `La clase «${targetClass}» fue eliminada o no existe en el modelo actual.`,
      revalidatedAgainstCurrentVersion: isVersionDiverged,
    };
  }

  return {
    status: 'COMPATIBLE',
    badgeLabel: isVersionDiverged ? `Compatible (v${currentDiagramVersion})` : 'Compatible',
    badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200',
    isApplyDisabled: false,
    canReview: true,
    revalidatedAgainstCurrentVersion: isVersionDiverged,
  };
}

interface UmlRecommendationPreviewProps {
  rec: RecomendacionUml;
  diagramaVersion?: number;
  diagramaNombre?: string;
  evaluation?: RecommendationEvaluation | null;
  diagramClasses?: Array<{ id: string; nombre: string }>;
}

function UmlRecommendationPreview({
  rec,
  diagramaVersion,
  diagramaNombre,
  evaluation,
  diagramClasses = [],
}: UmlRecommendationPreviewProps) {
  const c = parseProposal(rec.cambioPropuesto);
  const classLabel = (reference?: string, explicitName?: string) => explicitName
    || diagramClasses.find((item) => item.id === reference)?.nombre
    || reference
    || 'Clase';
  const className = c.nombre || rec.elementoAfectado?.nombre || 'Clase';
  const isObsolete = evaluation ? evaluation.status === 'OBSOLETA' : (rec.versionDiagrama !== undefined && diagramaVersion !== undefined && rec.versionDiagrama !== diagramaVersion);
  const isRevalidated = evaluation ? (evaluation.status === 'COMPATIBLE' && evaluation.revalidatedAgainstCurrentVersion) : false;
  const isPendingDep = evaluation?.status === 'PENDIENTE_DEPENDENCIA';
  const atributos = Array.isArray(c.atributos) ? c.atributos : [];
  const metodos = Array.isArray(c.metodos) ? c.metodos : [];
  const relaciones = Array.isArray(c.relaciones) ? c.relaciones : [];
  const responsabilidad = c.responsabilidad || c.justificacion || rec.descripcion;

  return (
    <div className="space-y-4 text-xs min-w-0">
      {/* Tarjeta de Metadatos y Versión del Diagrama */}
      <div className="p-3 bg-gray-50/90 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
            {formatTipoCambioLabel(rec.tipoCambio)}
          </span>
          <span className="text-xs font-bold text-gray-800 break-words">
            {rec.elementoAfectado?.tipo}: <span className="text-purple-900">{rec.elementoAfectado?.nombre || className}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
          <span className="text-gray-500">
            Diagrama #{rec.diagramaId}{diagramaNombre ? ` (${diagramaNombre})` : ''} · v{rec.versionDiagrama || 1}
          </span>
          {diagramaVersion !== undefined && (
            isObsolete ? (
              <span className="px-2 py-0.5 rounded-md font-bold text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Editor v{diagramaVersion} (Obsoleta)
              </span>
            ) : isPendingDep ? (
              <span className="px-2 py-0.5 rounded-md font-bold text-amber-800 bg-amber-50 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Requiere «{evaluation?.requiredDependency}»
              </span>
            ) : isRevalidated ? (
              <span className="px-2 py-0.5 rounded-md font-bold text-purple-700 bg-purple-50 border border-purple-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Editor v{diagramaVersion} (Revalidada)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Editor v{diagramaVersion} (Sincronizado)
              </span>
            )
          )}
        </div>
      </div>

      {/* CASO 1: AGREGAR_CLASE (Vista rica estructurada) */}
      {rec.tipoCambio === 'AGREGAR_CLASE' ? (
        <div className="space-y-3.5 min-w-0">
          {/* Responsabilidad y Justificación */}
          {responsabilidad && (
            <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Responsabilidad y Justificación de Dominio</span>
              </span>
              <p className="text-xs text-gray-800 leading-relaxed font-medium break-words">
                {responsabilidad}
              </p>
            </div>
          )}

          {/* Caja Visual de Clase UML (3 compartimentos estándar) */}
          <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xs overflow-hidden min-w-0">
            {/* Cabecera de la Clase con Estereotipo */}
            <div className="bg-gradient-to-r from-purple-100/90 via-purple-50 to-pink-50 px-4 py-3 border-b-2 border-purple-200 text-center">
              {c.estereotipo && (
                <div className="text-[11px] font-mono text-purple-700 tracking-wide font-semibold">
                  «{c.estereotipo}»
                </div>
              )}
              <div className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-2 flex-wrap">
                <Box className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">{className}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 ml-1 shrink-0">
                  + Nueva clase
                </span>
              </div>
            </div>

            {/* Compartimento 1: Atributos y tipos */}
            <div className="p-3.5 border-b border-purple-100 bg-white space-y-1.5 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center justify-between">
                <span>Atributos y tipos</span>
                <span className="font-mono text-gray-400">({atributos.length})</span>
              </div>
              {atributos.length > 0 ? (
                <div className="space-y-1 pl-1">
                  {atributos.map((attr: any, idx: number) => {
                    const vis = formatVisibility(attr.visibilidad);
                    return (
                      <div key={idx} className="flex items-center gap-2 font-mono text-xs py-0.5 break-all">
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border ${vis.className}`} title={vis.label}>
                          {vis.symbol}
                        </span>
                        <span className="font-semibold text-gray-800">{attr.nombre}</span>
                        <span className="text-gray-400">:</span>
                        <span className="text-purple-700 font-medium">{attr.tipo || 'any'}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 italic text-[11px] pl-1">Sin atributos iniciales declarados</p>
              )}
            </div>

            {/* Compartimento 2: Métodos y retornos */}
            <div className="p-3.5 bg-gray-50/40 space-y-1.5 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center justify-between">
                <span>Métodos y retornos</span>
                <span className="font-mono text-gray-400">({metodos.length})</span>
              </div>
              {metodos.length > 0 ? (
                <div className="space-y-1 pl-1">
                  {metodos.map((met: any, idx: number) => {
                    const vis = formatVisibility(met.visibilidad || 'public');
                    const params = formatParameters(met.parametros);
                    return (
                      <div key={idx} className="flex items-center gap-2 font-mono text-xs py-0.5 break-all">
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border ${vis.className}`} title={vis.label}>
                          {vis.symbol}
                        </span>
                        <span className="font-semibold text-gray-800">{met.nombre}</span>
                        <span className="text-gray-500">({params})</span>
                        <span className="text-gray-400">:</span>
                        <span className="text-pink-600 font-medium">{met.tipoRetorno || 'void'}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 italic text-[11px] pl-1">Sin métodos iniciales declarados</p>
              )}
            </div>
          </div>

          {/* Relaciones Propuestas con otras clases */}
          {relaciones.length > 0 ? (
            <div className="space-y-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Relaciones propuestas ({relaciones.length})</span>
              </span>
              <div className="grid grid-cols-1 gap-2">
                {relaciones.map((rel: any, idx: number) => {
                  const relType = formatRelationType(rel.tipo);
                  const destino = rel.destinoNombre || rel.destino || 'Clase destino';
                  return (
                    <div key={idx} className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-bold text-gray-900">{className}</span>
                        {rel.multiplicidadOrigen && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-bold">
                            [{rel.multiplicidadOrigen}]
                          </span>
                        )}
                        <span className="font-mono text-purple-600 font-bold">{relType.symbol}</span>
                        {rel.multiplicidadDestino && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-bold">
                            [{rel.multiplicidadDestino}]
                          </span>
                        )}
                        <span className="font-bold text-purple-900">{destino}</span>
                        {rel.rolDestino && (
                          <span className="text-[10px] text-gray-500 italic">({rel.rolDestino})</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${relType.badgeClass}`}>
                        {relType.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-500">
              No declara relaciones iniciales dependientes.
            </div>
          )}
        </div>
      ) : (
        /* CASO 2: OPERACIONES SOBRE ELEMENTOS EXISTENTES (ANTES / DESPUÉS / DESTACADO) */
        <div className="space-y-3 min-w-0">
          {/* Descripción general del cambio */}
          <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Descripción de la Propuesta
            </span>
            <p className="text-xs text-gray-800 leading-relaxed font-medium break-words">
              {rec.descripcion}
            </p>
          </div>

          {/* Comparativa Antes / Después según Tipo */}
          {rec.tipoCambio === 'RENOMBRAR_CLASE' && (
            <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 space-y-3">
              <span className="text-xs font-bold text-gray-800 block">Comparación de Nombres</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Antes (Actual)</span>
                  <span className="font-mono text-sm font-bold text-rose-700 line-through block break-words">
                    {rec.elementoAfectado?.nombre}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Después (Propuesto)</span>
                  <span className="font-mono text-sm font-bold text-emerald-700 block break-words">
                    {c.nombre || c.nuevo || 'Nuevo nombre'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                La clase se renombrará en el modelo preservando todos sus atributos, métodos y conexiones dependientes.
              </p>
            </div>
          )}

          {rec.tipoCambio === 'ELIMINAR_CLASE' && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2 text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Eliminación de la clase «{rec.elementoAfectado?.nombre}»</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-700">
                Esta propuesta eliminará la clase <strong className="font-mono font-bold">{rec.elementoAfectado?.nombre}</strong> del modelo y desconectará permanentemente todas sus relaciones asociadas.
              </p>
            </div>
          )}

          {(rec.tipoCambio === 'AGREGAR_ATRIBUTO' || rec.tipoCambio === 'MODIFICAR_ATRIBUTO' || rec.tipoCambio === 'ELIMINAR_ATRIBUTO') && (
            <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">
                  Clase: <span className="text-purple-700">{rec.elementoAfectado?.nombre}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  {formatTipoCambioLabel(rec.tipoCambio)}
                </span>
              </div>
              {rec.tipoCambio === 'AGREGAR_ATRIBUTO' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 font-mono text-xs flex items-center gap-2 text-emerald-900 flex-wrap">
                  <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">+</span>
                  <span className="font-bold">{c.nombre}</span>
                  <span className="text-gray-400">:</span>
                  <span className="font-semibold text-emerald-700">{c.tipo || 'any'}</span>
                  {c.visibilidad && <span className="text-[10px] text-gray-500 font-normal">[{c.visibilidad}]</span>}
                </div>
              )}
              {rec.tipoCambio === 'MODIFICAR_ATRIBUTO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Antes</span>
                    <span className="line-through block break-words">{c.anterior ? `${c.anterior.nombre}: ${c.anterior.tipo}` : rec.elementoAfectado?.nombre}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Después</span>
                    <span className="font-bold block break-words">{c.nuevo ? `${c.nuevo.nombre}: ${c.nuevo.tipo}` : `${c.nombre || rec.elementoAfectado?.nombre}: ${c.tipo || ''}`}</span>
                  </div>
                </div>
              )}
              {rec.tipoCambio === 'ELIMINAR_ATRIBUTO' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 font-mono text-xs flex items-center gap-2 text-rose-900 flex-wrap">
                  <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0">-</span>
                  <span className="line-through font-bold">{c.nombre || rec.elementoAfectado?.nombre}</span>
                  <span className="text-xs text-rose-600">(Se removerá del modelo)</span>
                </div>
              )}
            </div>
          )}

          {(rec.tipoCambio === 'AGREGAR_METODO' || rec.tipoCambio === 'MODIFICAR_METODO' || rec.tipoCambio === 'ELIMINAR_METODO') && (
            <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">
                  Clase: <span className="text-purple-700">{rec.elementoAfectado?.nombre}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  {formatTipoCambioLabel(rec.tipoCambio)}
                </span>
              </div>
              {rec.tipoCambio === 'AGREGAR_METODO' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 font-mono text-xs flex items-center gap-2 text-emerald-900 flex-wrap">
                  <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">+</span>
                  <span className="font-bold">{c.nombre}</span>
                  <span className="text-gray-500">({formatParameters(c.parametros)})</span>
                  <span className="text-gray-400">:</span>
                  <span className="font-semibold text-emerald-700">{c.tipoRetorno || 'void'}</span>
                </div>
              )}
              {rec.tipoCambio === 'MODIFICAR_METODO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Antes</span>
                    <span className="line-through block break-words">{c.anterior?.nombre || rec.elementoAfectado?.nombre}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Después</span>
                    <span className="font-bold block break-words">{c.nombre || c.nuevo?.nombre}: {c.tipoRetorno || c.nuevo?.tipoRetorno || 'void'}</span>
                  </div>
                </div>
              )}
              {rec.tipoCambio === 'ELIMINAR_METODO' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 font-mono text-xs flex items-center gap-2 text-rose-900 flex-wrap">
                  <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0">-</span>
                  <span className="line-through font-bold">{c.nombre || rec.elementoAfectado?.nombre}</span>
                  <span className="text-xs text-rose-600">(Se removerá del modelo)</span>
                </div>
              )}
            </div>
          )}

          {(rec.tipoCambio === 'AGREGAR_RELACION' || rec.tipoCambio === 'MODIFICAR_RELACION' || rec.tipoCambio === 'ELIMINAR_RELACION') && (
            <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100 space-y-3">
              <span className="text-sm font-bold text-purple-950 block">
                Relación recomendada: {classLabel(c.origen, c.origenNombre || rec.elementoAfectado?.nombre)} — {classLabel(c.destino, c.destinoNombre)}
              </span>
              <p className="text-xs text-gray-700 leading-relaxed">{rec.descripcion}</p>
              <div className="p-3 bg-white rounded-xl border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-mono flex-wrap">
                  <span className="font-bold text-gray-900">{classLabel(c.origen, c.origenNombre || rec.elementoAfectado?.nombre)}</span>
                  {c.multiplicidadOrigen && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">[{c.multiplicidadOrigen}]</span>}
                  <span className="text-purple-600 font-bold">{formatRelationType(c.tipo).symbol}</span>
                  {c.multiplicidadDestino && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">[{c.multiplicidadDestino}]</span>}
                  <span className="font-bold text-purple-900">{classLabel(c.destino, c.destinoNombre)}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${formatRelationType(c.tipo).badgeClass}`}>
                  {formatRelationType(c.tipo).label}
                </span>
              </div>
              {c.justificacion && (
                <div className="p-3 rounded-xl bg-pink-50/70 border border-pink-200 text-gray-800">
                  <strong className="text-purple-800">Justificación:</strong> {c.justificacion}
                </div>
              )}
            </div>
          )}

          {rec.tipoCambio === 'OTRO' && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 break-words">
              {rec.descripcion}
            </div>
          )}
        </div>
      )}

      {/* CASO 3: Sección Técnica Colapsable para consulta completa */}
      <details className="group rounded-2xl border border-gray-200 bg-gray-50/60 overflow-hidden text-xs">
        <summary className="px-4 py-2.5 font-bold text-gray-700 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors select-none">
          <span className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Detalles técnicos completos (JSON)</span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="p-3 bg-gray-950 text-gray-200 font-mono text-[11px] overflow-x-auto max-h-56 rounded-b-2xl border-t border-gray-200 leading-relaxed">
          <pre className="whitespace-pre-wrap break-all sm:break-normal">{JSON.stringify(rec, null, 2)}</pre>
        </div>
      </details>
    </div>
  );
}

interface ProjectChatProps {
  proyectoId: number | string | undefined;
  proyectoNombre?: string;
  diagramaId?: number | string;
  diagramaNombre?: string;
  diagramaVersion?: number;
  variant?: 'embedded' | 'drawer' | 'compact';
  onClose?: () => void;
  className?: string;
  hasUnsavedChanges?: boolean;
  diagramClasses?: Array<{ id: string; nombre: string }>;
  initialPrompt?: string;
}

export default function ProjectChat({
  proyectoId,
  proyectoNombre,
  diagramaId,
  diagramaNombre,
  diagramaVersion,
  variant = 'embedded',
  onClose,
  className = '',
  hasUnsavedChanges = false,
  diagramClasses = [],
  initialPrompt,
}: ProjectChatProps) {
  const { user } = useAuthStore();
  const {
    mensajes,
    loading,
    loadingMore,
    hasMore,
    sending,
    sendingIA,
    iaActivities,
    applyingRecommendationId,
    error,
    connectionStatus,
    enviarMensaje,
    enviarMensajeConAdjuntos,
    consultarIA,
    elegirAlternativa,
    descartarAlternativa,
    aplicarRecomendacion,
    descartarRecomendacion,
    aplicarCompatibles,
    cargarMas,
    recargar,
  } = useProjectChat(proyectoId);

  const [inputTexto, setInputTexto] = useState(initialPrompt || '');
  const [modoIA, setModoIA] = useState<boolean>(Boolean(initialPrompt));
  const [revisandoRecomendacion, setRevisandoRecomendacion] = useState<RecomendacionUml | null>(null);
  const [revisandoMensajeId, setRevisandoMensajeId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [choosingAlternativeId, setChoosingAlternativeId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview?: string }>>([]);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const appliedRecommendationIds = useMemo(() => new Set(
    mensajes
      .filter((message) => message.metadatos?.evento === 'recomendacion_aplicada')
      .map((message) => message.metadatos?.recomendacionId)
      .filter((id): id is string => Boolean(id))
  ), [mensajes]);
  const discardedRecommendationIds = useMemo(() => new Set(
    mensajes
      .filter((message) => message.metadatos?.evento === 'recomendacion_descartada')
      .map((message) => message.metadatos?.recomendacionId)
      .filter((id): id is string => Boolean(id))
  ), [mensajes]);

  const currentMessageForReview = useMemo(() => {
    if (!revisandoMensajeId) return null;
    return mensajes.find((m) => m.id === revisandoMensajeId) || null;
  }, [mensajes, revisandoMensajeId]);

  const allRecsInReviewMessage = useMemo(() => {
    return currentMessageForReview?.metadatos?.recomendaciones || [];
  }, [currentMessageForReview]);

  const reviewEvaluation = useMemo(() => {
    if (!revisandoRecomendacion) return null;
    return evaluateRecommendationStatus(
      revisandoRecomendacion,
      appliedRecommendationIds,
      discardedRecommendationIds,
      diagramaVersion,
      allRecsInReviewMessage,
      diagramClasses
    );
  }, [
    revisandoRecomendacion,
    appliedRecommendationIds,
    discardedRecommendationIds,
    diagramaVersion,
    allRecsInReviewMessage,
    diagramClasses,
  ]);

  const openRecommendationReview = (recommendation: RecomendacionUml, messageId: number) => {
    setLocalError(null);
    setRevisandoRecomendacion(recommendation);
    setRevisandoMensajeId(messageId);
  };

  const closeRecommendationReview = () => {
    setRevisandoRecomendacion(null);
    setRevisandoMensajeId(null);
  };

  const handleApplyBatch = async (mensajeId: number, count: number) => {
    if (hasUnsavedChanges) {
      setLocalError('Guarda o descarta tus cambios locales antes de aplicar recomendaciones en lote.');
      return;
    }
    if (
      !window.confirm(
        `¿Deseas aplicar las ${count} recomendaciones compatibles de esta revisión de forma atómica?`
      )
    ) {
      return;
    }
    try {
      if (aplicarCompatibles) {
        await aplicarCompatibles(mensajeId);
      }
    } catch (batchError: any) {
      setLocalError(batchError.message || 'No se pudieron aplicar las recomendaciones en lote.');
    }
  };

  const handleApplyRecommendation = async () => {
    if (!revisandoRecomendacion?.id || !revisandoMensajeId) return;
    if (hasUnsavedChanges) {
      setLocalError('Guarda o descarta tus cambios locales antes de aplicar una recomendación. No se sobrescribió el canvas.');
      return;
    }
    try {
      const destructive = revisandoRecomendacion.tipoCambio === 'ELIMINAR_CLASE';
      if (destructive && !window.confirm(
        `Esta operación eliminará la clase «${revisandoRecomendacion.elementoAfectado?.nombre || ''}» y todas sus relaciones dependientes. ¿Confirmas la eliminación?`
      )) return;
      await aplicarRecomendacion(revisandoMensajeId, revisandoRecomendacion.id, destructive);
      closeRecommendationReview();
    } catch (applyError: any) {
      setLocalError(applyError.message || 'No se pudo aplicar la recomendación UML.');
    }
  };

  const handleReviewDiagram = async () => {
    setLocalError(null);
    if (!diagramaId) {
      setLocalError('Abre un diagrama antes de solicitar una revisión.');
      return;
    }
    if (hasUnsavedChanges) {
      setLocalError('Guarda o descarta tus cambios locales antes de revisar el modelo persistido.');
      return;
    }
    try {
      isAutoScrollEnabledRef.current = true;
      await consultarIA(
        'Revisa integralmente el diagrama UML actual. Separa errores formales de advertencias y sugerencias de diseño; justifica cada hallazgo con evidencia del modelo y recomienda mejoras concretas, incluyendo clases faltantes solo cuando el dominio lo sustente.',
        Number(diagramaId),
        'REVISION_UML'
      );
    } catch (reviewError: any) {
      setLocalError(reviewError.message || 'No se pudo revisar el diagrama.');
    }
  };

  const handleDiscardRecommendation = async () => {
    if (!revisandoRecomendacion?.id || !revisandoMensajeId) return;
    try {
      await descartarRecomendacion(revisandoMensajeId, revisandoRecomendacion.id);
      closeRecommendationReview();
    } catch (discardError: any) {
      setLocalError(discardError.message || 'No se pudo descartar la recomendación.');
    }
  };

  const handleChooseAlternative = async (messageId: number, alternativeId: string) => {
    setLocalError(null);
    setChoosingAlternativeId(alternativeId);
    try {
      await elegirAlternativa(messageId, alternativeId);
    } catch (selectionError: any) {
      setLocalError(selectionError.response?.data?.message || selectionError.message
        || 'No se pudo elegir la alternativa.');
    } finally {
      setChoosingAlternativeId(null);
    }
  };

  const handleDiscardAlternative = async (messageId: number, alternativeId: string) => {
    setLocalError(null);
    setChoosingAlternativeId(alternativeId);
    try {
      await descartarAlternativa(messageId, alternativeId);
    } catch (discardError: any) {
      setLocalError(discardError.response?.data?.message || discardError.message
        || 'No se pudo descartar la alternativa.');
    } finally {
      setChoosingAlternativeId(null);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // Manejo de tecla Escape y bloqueo de scroll de fondo al revisar recomendación
  useEffect(() => {
    if (!revisandoRecomendacion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRecommendationReview();
      }
    };

    const previousOverflow = typeof document !== 'undefined' && document.body ? document.body.style.overflow : '';
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = 'hidden';
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = previousOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [revisandoRecomendacion]);

  // Formateador de hora
  const formatTime = formatChatTime;

  // Formateador de fecha para divisores
  const formatDateLabel = formatChatDateLabel;

  // Formateador amigable de tipos de cambio
  const formatTipoCambio = (tipo: string) => {
    switch (tipo) {
      case 'AGREGAR_CLASE':
        return '+ Clase';
      case 'ELIMINAR_CLASE':
        return '- Eliminar Clase';
      case 'AGREGAR_ATRIBUTO':
        return '+ Atributo';
      case 'MODIFICAR_ATRIBUTO':
        return '~ Modificar Atributo';
      case 'ELIMINAR_ATRIBUTO':
        return '- Eliminar Atributo';
      case 'AGREGAR_METODO':
        return '+ Método';
      case 'MODIFICAR_METODO':
        return '~ Modificar Método';
      case 'ELIMINAR_METODO':
        return '- Eliminar Método';
      case 'AGREGAR_RELACION':
        return '+ Relación';
      case 'MODIFICAR_RELACION':
        return '~ Modificar Relación';
      case 'ELIMINAR_RELACION':
        return '- Eliminar Relación';
      case 'RENOMBRAR_CLASE':
        return 'Renombrar Clase';
      default:
        return tipo || 'Cambio UML';
    }
  };

  // Formateador sintáctico para cambio propuesto
  const formatCambioPropuesto = (rec: RecomendacionUml) => {
    const c = rec.cambioPropuesto;
    if (!c) return '';
    if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c);
        if (parsed && typeof parsed === 'object') return formatCambioPropuesto({ ...rec, cambioPropuesto: parsed });
      } catch {
        return c;
      }
      return c;
    }
    if (rec.tipoCambio === 'AGREGAR_CLASE' || (c.nombre && (c.atributos || c.metodos))) {
      const partes: string[] = [];
      const className = c.nombre || rec.elementoAfectado?.nombre || 'Clase';
      partes.push(`class ${className}`);
      const attrs = Array.isArray(c.atributos) ? c.atributos : [];
      const methods = Array.isArray(c.metodos) ? c.metodos : [];
      const rels = Array.isArray(c.relaciones) ? c.relaciones : [];
      if (attrs.length > 0) {
        attrs.slice(0, 3).forEach((a: any) => {
          const vis = a.visibilidad === 'private' ? '-' : a.visibilidad === 'protected' ? '#' : '+';
          partes.push(`  ${vis} ${a.nombre || 'attr'}: ${a.tipo || 'any'}`);
        });
        if (attrs.length > 3) partes.push(`  ... (+${attrs.length - 3} atributos)`);
      }
      if (methods.length > 0) {
        methods.slice(0, 2).forEach((m: any) => {
          const vis = m.visibilidad === 'private' ? '-' : m.visibilidad === 'protected' ? '#' : '+';
          partes.push(`  ${vis} ${m.nombre || 'metodo'}(): ${m.tipoRetorno || 'void'}`);
        });
        if (methods.length > 2) partes.push(`  ... (+${methods.length - 2} métodos)`);
      }
      if (rels.length > 0) {
        partes.push(`  ➔ ${rels.length} relación(es) propuesta(s)`);
      }
      return partes.join('\n');
    }
    if (c.nombre && c.tipo) {
      const vis = c.visibilidad ? ` [${c.visibilidad}]` : '';
      return `${c.nombre}: ${c.tipo}${vis}`;
    }
    if (c.origen && c.destino) {
      return `${c.origen} ➔ ${c.destino} (${c.tipo || rec.tipoCambio})`;
    }
    try {
      return JSON.stringify(c, null, 1).replace(/[{}"]/g, '').trim();
    } catch {
      return String(c);
    }
  };

  // Agrupar mensajes con separadores de fecha
  const itemsConSeparadores = useMemo(() => {
    const items: Array<{ type: 'date'; label: string; key: string } | { type: 'message'; data: MensajeChat }> = [];
    let ultimaFecha = '';

    mensajes.forEach((m) => {
      const fechaClave = chatDateKey(m.fechaHora);
      if (fechaClave && fechaClave !== ultimaFecha) {
        items.push({
          type: 'date',
          label: formatDateLabel(m.fechaHora),
          key: `date-${fechaClave}-${m.id}`,
        });
        ultimaFecha = fechaClave;
      }
      items.push({ type: 'message', data: m });
    });

    return items;
  }, [mensajes]);

  // Manejo de scroll al cargar mensajes anteriores
  const handleCargarMas = async () => {
    if (!messagesContainerRef.current) {
      await cargarMas();
      return;
    }
    previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
    isAutoScrollEnabledRef.current = false;
    await cargarMas();
  };

  // Mantener posición de scroll al prepender mensajes
  useEffect(() => {
    if (previousScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const diff = messagesContainerRef.current.scrollHeight - previousScrollHeightRef.current;
      messagesContainerRef.current.scrollTop += diff;
      previousScrollHeightRef.current = 0;
    }
  }, [mensajes.length]);

  // Auto-scroll al fondo al recibir nuevos mensajes si el usuario estaba cerca del fondo
  useEffect(() => {
    if (isAutoScrollEnabledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes.length, sendingIA]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    isAutoScrollEnabledRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  const clearVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
    setVoiceFile(null);
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreviewUrl(null);
  };

  const startRecording = async () => {
    setLocalError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setLocalError('Este navegador no admite grabación de notas de voz. Puedes adjuntar un audio existente.');
      return;
    }
    try {
      clearVoiceRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualType });
        const extension = actualType.includes('ogg') ? 'ogg' : actualType.includes('mp4') ? 'm4a' : 'webm';
        setVoiceFile(new File([blob], `nota-voz-${Date.now()}.${extension}`, { type: actualType }));
        setVoicePreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch (err: any) {
      setLocalError(err?.name === 'NotAllowedError'
        ? 'No se concedió permiso para usar el micrófono.'
        : 'No se pudo iniciar la grabación de audio.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const startDictation = () => {
    setLocalError(null);
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setLocalError('El dictado no está disponible en este navegador. Puedes escribir o pegar el mensaje.');
      return;
    }
    const recognition = new Recognition();
    const baseText = inputTexto.trim();
    recognition.lang = navigator.language || 'es-BO';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setInputTexto(`${baseText}${baseText ? ' ' : ''}${transcript}`.trimStart());
    };
    recognition.onerror = () => setLocalError('No se pudo completar el dictado. Puedes escribir el mensaje manualmente.');
    recognition.onend = () => setDictating(false);
    setDictating(true);
    recognition.start();
  };

  const selectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const remaining = Math.max(0, 5 - pendingFiles.length - (voiceFile ? 1 : 0));
    const accepted = selected.slice(0, remaining).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setLocalError(`${file.name} supera el límite de 10 MiB.`);
        return false;
      }
      return true;
    });
    setPendingFiles((previous) => [...previous, ...accepted.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))]);
    event.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((previous) => {
      const item = previous[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const texto = inputTexto.trim();
    const archivos = [...pendingFiles.map((item) => item.file), ...(voiceFile ? [voiceFile] : [])];
    if ((!texto && archivos.length === 0) || sending || sendingIA || recording) return;

    setLocalError(null);
    try {
      isAutoScrollEnabledRef.current = true;

      if (modoIA) {
        if (archivos.length > 0) {
          throw new Error('Los adjuntos no se envían automáticamente a la IA. Cambia a Equipo para compartirlos.');
        }
        if (!diagramaId) {
          throw new Error('Para consultar a la IA, debes tener un diagrama abierto en el editor UML.');
        }
        await consultarIA(texto, Number(diagramaId), 'CHAT', hasUnsavedChanges);
      } else if (archivos.length > 0) {
        setUploadProgress(0);
        await enviarMensajeConAdjuntos(texto, archivos, {
          origen: voiceFile ? 'nota_voz' : 'adjunto_chat',
          duracionSegundos: voiceFile ? recordingSeconds : undefined,
        }, setUploadProgress);
      } else {
        await enviarMensaje(texto);
      }

      setInputTexto('');
      pendingFiles.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      setPendingFiles([]);
      clearVoiceRecording();
      setUploadProgress(null);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      setLocalError(err.message || 'No se pudo enviar el mensaje');
      setUploadProgress(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const getInitials = (nombreCompleto?: string | null) => {
    if (!nombreCompleto) return 'U';
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].slice(0, 2).toUpperCase();
  };

  const isCurrentUser = (m: MensajeChat) => {
    if (!user) return false;
    if (m.emisorId && user.id && m.emisorId === user.id) return true;
    if (m.emisorNombre && user.nombre && m.emisorNombre.toLowerCase().includes(user.nombre.toLowerCase())) {
      return true;
    }
    return false;
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={`flex flex-col bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-lila-light/60 shadow-xs overflow-hidden h-full ${className}`}
      style={isCompact ? undefined : { minHeight: '420px' }}
    >
      {/* HEADER DEL CHAT */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white/95 border-b border-lila-light/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-lila-light/60 text-lila-main flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-text-dark tracking-tight truncate flex items-center gap-1.5">
              <span>Chat del proyecto</span>
              {proyectoNombre && (
                <span className="hidden sm:inline text-xs font-semibold text-gray-400 truncate max-w-[140px]">
                  · {proyectoNombre}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'Sincronizado'
                      ? 'bg-green-500 animate-pulse'
                      : connectionStatus === 'Conectando...' || connectionStatus === 'Reconectando...'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-semibold">
                  {connectionStatus === 'Sincronizado'
                    ? 'En vivo'
                    : connectionStatus === 'Conectando...'
                    ? 'Conectando...'
                    : connectionStatus === 'Reconectando...'
                    ? 'Reconectando...'
                    : 'Sin conexión'}
                </span>
              </span>

              {diagramaId && (
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded-md font-semibold text-[10px] border border-purple-200/50">
                  <Layers className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{diagramaNombre || `Diagrama #${diagramaId}`}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {diagramaId && (
            <button
              type="button"
              onClick={() => void handleReviewDiagram()}
              disabled={sendingIA || hasUnsavedChanges}
              className="px-2.5 py-2 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5"
              title={hasUnsavedChanges ? 'Guarda tus cambios antes de revisar' : 'Revisar diagrama con IA'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Revisar diagrama con IA</span>
              <span className="xl:hidden">Revisar IA</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => recargar()}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/30 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Recargar mensajes"
            aria-label="Recargar mensajes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-lila-main' : ''}`} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-text-dark hover:bg-gray-100 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Cerrar chat"
              aria-label="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MENSAJE DE ERROR GLOBAL O LOCAL */}
      {(error || localError) && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-between text-xs text-red-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium truncate">{localError || error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              recargar();
            }}
            className="text-[11px] font-bold underline hover:text-red-900 ml-2 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* CUERPO DEL CHAT / MENSAJES */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-3.5 custom-scrollbar bg-gradient-to-b from-bg-main/30 to-transparent min-h-0 min-w-0"
      >
        {/* BOTÓN PARA CARGAR MENSAJES ANTERIORES */}
        {hasMore && (
          <div className="flex justify-center pt-1 pb-2">
            <button
              type="button"
              onClick={handleCargarMas}
              disabled={loadingMore}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-lila-main bg-lila-light/40 hover:bg-lila-light/70 border border-lila-light/70 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cargando anteriores...</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Cargar mensajes anteriores</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* SPINNER DE CARGA INICIAL */}
        {loading && mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <div className="w-8 h-8 border-3 border-lila-main border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium">Cargando conversación del proyecto...</p>
          </div>
        ) : mensajes.length === 0 && iaActivities.length === 0 ? (
          /* ESTADO VACÍO */
          <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-lila-light to-pink-light rounded-2xl flex items-center justify-center text-lila-main mb-3 shadow-inner">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-text-dark">Aún no hay mensajes</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs font-medium">
              Comunícate con tu equipo o activa <strong className="text-purple-700 font-bold">«Preguntar a la IA»</strong> para recibir recomendaciones inteligentes sobre el modelo UML.
            </p>
          </div>
        ) : (
          /* LISTA DE MENSAJES */
          itemsConSeparadores.map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.key} className="flex items-center my-3">
                  <div className="flex-1 border-t border-gray-200/60" />
                  <span className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/80 rounded-full border border-gray-200/50 shadow-xs mx-2">
                    {item.label}
                  </span>
                  <div className="flex-1 border-t border-gray-200/60" />
                </div>
              );
            }

            const m = item.data;
            const isMe = isCurrentUser(m);
            const isSystem = m.tipoEmisor === 'SISTEMA';
            const isIA = m.tipoEmisor === 'IA';
            const isSolicitudIA = m.metadatos?.origen === 'chat_ia';
            const recomendaciones = m.metadatos?.recomendaciones || [];

            /* 1. MENSAJE DE SISTEMA */
            if (isSystem) {
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <div className="px-3.5 py-2 rounded-2xl bg-amber-50/90 text-amber-900 text-xs font-medium border border-amber-200/80 flex items-start gap-2 max-w-[90%] shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="leading-snug">{m.contenido}</p>
                      {m.metadatos?.detalle && (
                        <p className="text-[10px] text-amber-700/80 mt-1 font-mono break-all line-clamp-2">
                          {m.metadatos.detalle}
                        </p>
                      )}
                      <span className="text-[10px] text-amber-600/70 mt-0.5 block">{formatTime(m.fechaHora)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* 2. MENSAJE DE IA */
            if (isIA) {
              return (
                <div key={m.id} className="flex gap-2.5 items-start justify-start my-1.5">
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md border-2 border-white mt-1"
                    title="UMLForge IA"
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <div className="flex flex-col items-start min-w-0 max-w-[calc(100%-2.5rem)] sm:max-w-[92%] xl:max-w-[88%]">
                    {/* Header IA */}
                    <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px] flex-wrap">
                      <span className="font-bold text-purple-800 flex items-center gap-1">
                        <span>UMLForge IA</span>
                      </span>
                      {m.metadatos?.proveedor && (
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200/80 shadow-2xs">
                          ✨ {m.metadatos.proveedor}
                        </span>
                      )}
                      {m.metadatos?.diagramaId && (
                        <span className="text-[10px] text-gray-400 font-semibold">
                          · Diagrama #{m.metadatos.diagramaId}
                        </span>
                      )}
                    </div>

                    {/* Burbuja de contenido IA */}
                    <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-xs text-xs sm:text-sm font-medium leading-relaxed bg-gradient-to-br from-purple-50/90 via-white to-pink-50/30 text-purple-950 border border-purple-200/80 space-y-3">
                      <p className="whitespace-pre-wrap">{m.contenido}</p>

                      {m.metadatos?.tipoInforme === 'REVISION_UML' && (
                        <div className="rounded-xl border border-purple-200 bg-white/90 overflow-hidden">
                          <div className="px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-50 border-b border-purple-100">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <strong className="text-purple-900">Informe de revisión UML</strong>
                              <span className="text-[10px] font-bold text-purple-700">v{m.metadatos.diagramaVersion ?? '?'}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {m.metadatos.diagramaNombre || `Diagrama #${m.metadatos.diagramaId}`} · {m.metadatos.solicitanteNombre || 'Participante'}
                              {m.metadatos.fechaRevision ? ` · ${new Date(m.metadatos.fechaRevision).toLocaleString('es-BO')}` : ''}
                            </p>
                          </div>
                          <div className="p-2.5 space-y-2 max-h-72 overflow-y-auto">
                            {(m.metadatos.hallazgos || []).length === 0 ? (
                              <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2 border border-green-100">No se detectaron incumplimientos formales verificables.</p>
                            ) : (m.metadatos.hallazgos || []).map((finding) => {
                              const obsolete = diagramaVersion !== undefined && m.metadatos?.diagramaVersion !== undefined
                                && diagramaVersion !== m.metadatos.diagramaVersion;
                              const findingClass = finding.severidad === 'ERROR'
                                ? 'bg-red-50 border-red-200'
                                : finding.severidad === 'ADVERTENCIA'
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-purple-50 border-purple-200';
                              const severityClass = finding.severidad === 'ERROR'
                                ? 'text-red-700'
                                : finding.severidad === 'ADVERTENCIA'
                                ? 'text-amber-700'
                                : 'text-purple-700';
                              return (
                                <div key={finding.id} className={`rounded-lg border p-2 ${findingClass}`}>
                                  <div className="flex flex-wrap justify-between gap-1">
                                    <span className={`text-[10px] font-extrabold ${severityClass}`}>{finding.severidad} · {finding.categoria}</span>
                                    <span className="text-[10px] font-bold text-gray-500">{obsolete ? 'OBSOLETA' : finding.estado}</span>
                                  </div>
                                  {finding.elementoNombre && <p className="text-[11px] font-bold text-gray-800 mt-1">{finding.elementoTipo}: {finding.elementoNombre}</p>}
                                  <p className="text-xs text-gray-700 mt-1">{finding.explicacion}</p>
                                  <p className="text-[11px] text-gray-500 mt-1"><strong>Evidencia:</strong> {finding.evidencia}</p>
                                  <p className="text-[11px] text-purple-800 mt-1"><strong>Propuesta:</strong> {finding.propuesta}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(m.metadatos?.alternativas || []).length > 0 && (
                        <div className="pt-2 border-t border-purple-100/90 space-y-2">
                          <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Alternativas de diseño
                          </div>
                          <p className="text-[11px] text-gray-600">
                            Elige una alternativa para preparar sus cambios. Elegir no modifica el diagrama.
                          </p>
                          {(m.metadatos?.alternativas || []).map((option) => {
                            const selected = m.metadatos?.alternativaSeleccionadaId === option.id;
                            const discarded = (m.metadatos?.alternativasDescartadasIds || []).includes(option.id);
                            return (
                              <div key={option.id} className={`p-3 rounded-xl border space-y-2 ${selected ? 'border-green-300 bg-green-50/70' : 'border-purple-200 bg-white'}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-bold text-gray-900">{option.nombre}</p>
                                    <p className="text-[11px] text-gray-600 mt-0.5">{option.descripcion}</p>
                                  </div>
                                  {option.recomendada && <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Recomendada</span>}
                                </div>
                                {option.ventajas?.length > 0 && <p className="text-[11px] text-green-800"><strong>Ventajas:</strong> {option.ventajas.join(' · ')}</p>}
                                {option.limitaciones?.length > 0 && <p className="text-[11px] text-amber-800"><strong>Limitaciones:</strong> {option.limitaciones.join(' · ')}</p>}
                                {option.requisitosFaltantes && <p className="text-[11px] text-gray-600"><strong>Falta confirmar:</strong> {option.requisitosFaltantes}</p>}
                                <p className="text-[10px] text-gray-500">{option.recomendaciones?.length || 0} cambio(s) para revisar</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <button type="button" onClick={() => void handleChooseAlternative(m.id, option.id)}
                                    disabled={selected || discarded || Boolean(m.metadatos?.alternativaSeleccionadaId) || choosingAlternativeId === option.id}
                                    className="min-h-[40px] rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-500">
                                    {selected ? 'Alternativa elegida' : discarded ? 'Descartada' : choosingAlternativeId === option.id ? 'Preparando…' : 'Elegir esta alternativa'}
                                  </button>
                                  <button type="button" onClick={() => void handleDiscardAlternative(m.id, option.id)}
                                    disabled={selected || discarded || Boolean(m.metadatos?.alternativaSeleccionadaId) || choosingAlternativeId === option.id}
                                    className="min-h-[40px] rounded-lg text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40">
                                    Descartar alternativa
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* TARJETAS DE RECOMENDACIONES ESTRUCTURADAS */}
                      {recomendaciones.length > 0 && (
                        <div className="pt-2 border-t border-purple-100/90 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-purple-900 flex-wrap gap-2">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>Recomendaciones propuestas ({recomendaciones.length}):</span>
                            </span>
                            {(() => {
                              const compatibleCount = recomendaciones.filter((r) => {
                                const ev = evaluateRecommendationStatus(
                                  r,
                                  appliedRecommendationIds,
                                  discardedRecommendationIds,
                                  diagramaVersion,
                                  recomendaciones,
                                  diagramClasses
                                );
                                return ev.status === 'COMPATIBLE';
                              }).length;
                              if (compatibleCount < 2) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={() => void handleApplyBatch(m.id, compatibleCount)}
                                  disabled={hasUnsavedChanges || applyingRecommendationId === 'LOTE'}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                                  title={hasUnsavedChanges ? 'Guarda tus cambios antes de aplicar' : 'Aplicar recomendaciones compatibles en lote'}
                                >
                                  {applyingRecommendationId === 'LOTE' ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  <span>{applyingRecommendationId === 'LOTE' ? 'Aplicando…' : `Aplicar compatibles (${compatibleCount})`}</span>
                                </button>
                              );
                            })()}
                          </div>

                          <div className="space-y-2">
                            {recomendaciones.map((rec, rIdx) => {
                              const evaluation = evaluateRecommendationStatus(
                                rec,
                                appliedRecommendationIds,
                                discardedRecommendationIds,
                                diagramaVersion,
                                recomendaciones,
                                diagramClasses
                              );
                              return (
                                <div
                                  key={rec.id || rIdx}
                                  className="p-2.5 sm:p-3 bg-white/95 rounded-xl border border-purple-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors min-w-0 overflow-hidden"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200/80 shrink-0">
                                      {formatTipoCambio(rec.tipoCambio)}
                                    </span>
                                    {rec.elementoAfectado?.nombre && (
                                      <span className="text-[11px] font-semibold text-gray-600 break-words min-w-0">
                                        {rec.elementoAfectado.tipo}: <strong className="text-gray-800">{rec.elementoAfectado.nombre}</strong>
                                      </span>
                                    )}
                                  </div>

                                  {rec.tipoCambio === 'AGREGAR_RELACION' && (() => {
                                    const relation = parseProposal(rec.cambioPropuesto);
                                    const label = (reference?: string, explicitName?: string) => explicitName
                                      || diagramClasses.find((item) => item.id === reference)?.nombre
                                      || reference
                                      || 'Clase pendiente';
                                    return (
                                      <p className="text-xs font-bold text-purple-950">
                                        Relación recomendada: {label(relation.origen, relation.origenNombre || rec.elementoAfectado?.nombre)} — {label(relation.destino, relation.destinoNombre)}
                                      </p>
                                    );
                                  })()}

                                  <p className="text-xs font-medium text-gray-700 leading-snug">
                                    {rec.descripcion}
                                  </p>

                                  {rec.cambioPropuesto && (
                                    <div className="px-2 py-1 bg-gray-50 rounded-lg border border-gray-100 font-mono text-[11px] text-gray-700 whitespace-pre-wrap break-all max-h-24 overflow-auto">
                                      {formatCambioPropuesto(rec)}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => openRecommendationReview(rec, m.id)}
                                      className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-lila-main bg-lila-light/25 hover:bg-lila-light/45 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Revisar recomendación</span>
                                    </button>

                                    {evaluation.status === 'APLICADA' ? (
                                      <span className="py-1.5 px-3 rounded-lg text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Aplicada
                                      </span>
                                    ) : evaluation.status === 'DESCARTADA' ? (
                                      <span className="py-1.5 px-3 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 flex items-center gap-1">
                                        Descartada
                                      </span>
                                    ) : evaluation.status === 'PENDIENTE_DEPENDENCIA' ? (
                                      <span
                                        className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 flex items-center gap-1"
                                        title={evaluation.reason}
                                      >
                                        <Clock className="w-3.5 h-3.5" /> {evaluation.badgeLabel}
                                      </span>
                                    ) : evaluation.status === 'OBSOLETA' ? (
                                      <span
                                        className="py-1.5 px-3 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-1"
                                        title={evaluation.reason}
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" /> Obsoleta
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openRecommendationReview(rec, m.id)}
                                        className="py-1.5 px-3 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 flex items-center justify-center gap-1"
                                      >
                                        <span>Aplicar</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hora */}
                    <div className="px-1 mt-1 text-[10px] text-gray-400 font-medium">
                      <span>{formatTime(m.fechaHora)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* 3. MENSAJE HUMANO (USUARIO) */
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* AVATAR OTRO USUARIO */}
                {!isMe && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-lila-light to-pink-light text-lila-main flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 shadow-inner border border-white"
                    title={m.emisorNombre || 'Participante'}
                  >
                    {getInitials(m.emisorNombre)}
                  </div>
                )}

                {/* BURBUJA DE MENSAJE HUMANO */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                  {/* NOMBRE DEL EMISOR */}
                  <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px]">
                    <span
                      className={`font-bold truncate max-w-[160px] sm:max-w-[200px] ${
                        isMe ? 'text-gray-500' : 'text-lila-main'
                      }`}
                    >
                      {isMe ? 'Tú' : m.emisorNombre || 'Participante'}
                    </span>
                    {isSolicitudIA && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-md border border-purple-200/60">
                        <Sparkles className="w-2.5 h-2.5" /> Solicitud IA
                      </span>
                    )}
                  </div>

                  {/* CONTENIDO */}
                  <div
                    className={`px-4 py-2.5 rounded-2xl shadow-xs text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-pre-wrap ${
                      isMe
                        ? 'bg-gradient-to-r from-lila-main to-pink-main text-white rounded-br-xs'
                        : 'bg-white text-text-dark border border-lila-light/60 rounded-bl-xs'
                    }`}
                  >
                    {m.contenido && <p>{m.contenido}</p>}
                    {m.adjuntos?.map((adjunto) => (
                      <ChatAttachmentView key={adjunto.id} adjunto={adjunto} />
                    ))}
                  </div>

                  {/* HORA Y ESTADO */}
                  <div
                    className={`flex items-center gap-1 px-1 mt-1 text-[10px] text-gray-400 font-medium ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{formatTime(m.fechaHora)}</span>
                    {isMe && (
                      <span title={m.estado}>
                        {m.estado === 'ENVIADO' && <span className="text-gray-400">✓</span>}
                        {m.estado === 'COMPLETADO' && <span className="text-lila-main font-bold">✓✓</span>}
                        {m.estado === 'PROCESANDO' && <Clock className="w-2.5 h-2.5 animate-spin text-gray-400" />}
                        {m.estado === 'ERROR' && <AlertCircle className="w-2.5 h-2.5 text-red-500" />}
                      </span>
                    )}
                  </div>
                </div>

                {/* AVATAR USUARIO ACTUAL */}
                {isMe && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center font-bold text-[10px] sm:text-xs text-lila-main shrink-0 shadow-inner border border-white"
                    title={user?.nombre ? `${user.nombre} (Tú)` : 'Tú'}
                  >
                    {getInitials(user?.nombre)}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* INDICADOR EN TIEMPO REAL DE PROCESAMIENTO IA */}
        {iaActivities.map((activity) => (
          <div key={activity.solicitudId} className="flex gap-2.5 items-start justify-start animate-in fade-in duration-200" role="status" aria-live="polite">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md border-2 border-white mt-1">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex flex-col items-start max-w-[85%] sm:max-w-[78%]">
              <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px]">
                <span className="font-bold text-purple-800">UMLForge AI</span>
                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-full animate-pulse">
                  Pensando...
                </span>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs text-xs font-medium leading-relaxed bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-2.5">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-purple-700 font-semibold">
                  UMLForge AI está escribiendo… <span className="sr-only">Solicitud iniciada por {activity.usuarioNombre}</span>
                </span>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* SELECTOR DE MODO: EQUIPO VS IA */}
      <div className="px-3 pt-2 pb-1.5 bg-gray-50/70 border-t border-lila-light/30 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModoIA(false)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              !modoIA
                ? 'bg-white text-gray-800 shadow-2xs border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-lila-main" />
            <span>Equipo</span>
          </button>
          <button
            type="button"
            onClick={() => setModoIA(true)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              modoIA
                ? 'bg-gradient-to-r from-lila-main to-pink-main text-white shadow-2xs'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100/70 border border-purple-200/60'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${modoIA ? 'text-white' : 'text-purple-600'}`} />
            <span>Preguntar a la IA</span>
          </button>
        </div>

        {modoIA && (
          <div className="text-[11px] font-semibold text-purple-700 truncate flex items-center gap-1">
            {diagramaId ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                <span className="truncate max-w-[130px] sm:max-w-[180px]" title={diagramaNombre || `Diagrama #${diagramaId}`}>
                  {diagramaNombre || `Diagrama #${diagramaId}`}
                </span>
              </>
            ) : (
              <span className="text-amber-600 font-medium text-[10px]">Sin diagrama activo</span>
            )}
          </div>
        )}
      </div>

      {!modoIA && (pendingFiles.length > 0 || recording || voiceFile) && (
        <div className="px-3 py-2 bg-white border-t border-lila-light/30 space-y-2 shrink-0">
          {recording && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-bold text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Grabando nota de voz · {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={stopRecording} className="p-2 rounded-lg bg-red-600 text-white" title="Detener y revisar"><Square className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={clearVoiceRecording} className="p-2 rounded-lg bg-white text-red-600 border border-red-200" title="Cancelar grabación"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
          {voiceFile && voicePreviewUrl && !recording && (
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-3 py-2">
              <AudioLines className="w-4 h-4 text-lila-main shrink-0" />
              <audio src={voicePreviewUrl} controls preload="metadata" className="h-8 flex-1 min-w-0" aria-label="Revisar nota de voz antes de enviar" />
              <span className="text-[10px] text-gray-500 shrink-0">{recordingSeconds}s</span>
              <button type="button" onClick={clearVoiceRecording} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar nota de voz"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingFiles.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="relative flex items-center gap-2 min-w-[180px] max-w-[240px] rounded-xl border border-lila-light bg-gray-50 p-2">
                  {item.preview ? <img src={item.preview} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <FileText className="w-8 h-8 text-lila-main shrink-0" />}
                  <div className="min-w-0"><p className="text-[11px] font-bold truncate">{item.file.name}</p><p className="text-[10px] text-gray-500">{Math.ceil(item.file.size / 1024)} KB</p></div>
                  <button type="button" onClick={() => removePendingFile(index)} className="ml-auto p-1 text-red-500" aria-label={`Quitar ${item.file.name}`}><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          {uploadProgress !== null && <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-lila-main to-pink-main transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
        </div>
      )}

      {/* ÁREA DE ENVÍO DE MENSAJES */}
      <form
        onSubmit={handleSend}
        className={`p-2 sm:p-3 bg-white/95 border-t flex items-end gap-1 sm:gap-2 shrink-0 transition-colors min-w-0 ${
          modoIA ? 'border-purple-200/80 bg-purple-50/20' : 'border-lila-light/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.docx,.json,.xml,.xmi"
          onChange={selectFiles}
        />
        {!modoIA && (
          <div className="flex items-center gap-0 shrink-0">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || recording} className="p-2 sm:p-2.5 text-gray-500 hover:text-lila-main hover:bg-lila-light/30 rounded-xl disabled:opacity-40" title="Adjuntar archivo" aria-label="Adjuntar archivo">
              <Paperclip className="w-4 h-4" />
            </button>
            <button type="button" onClick={recording ? stopRecording : startRecording} disabled={sending || Boolean(voiceFile)} className={`p-2 sm:p-2.5 rounded-xl disabled:opacity-40 ${recording ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50'}`} title="Grabar audio" aria-label="Grabar audio">
              <Mic className="w-4 h-4" />
            </button>
            <button type="button" onClick={startDictation} disabled={sending || recording || dictating} className={`p-2 sm:p-2.5 rounded-xl disabled:opacity-40 ${dictating ? 'bg-purple-100 text-purple-700 animate-pulse' : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50'}`} title="Dictar mensaje" aria-label="Dictar mensaje">
              <AudioLines className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 relative min-w-0">
          <textarea
            rows={1}
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              modoIA
                ? 'Pregunta a la IA (ej: «Sugiere atributos para la clase Cliente»)...'
                : 'Escribe un mensaje para el equipo...'
            }
            disabled={sending || sendingIA}
            maxLength={10000}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl sm:rounded-2xl focus:outline-none transition-all font-medium text-text-dark text-xs sm:text-sm min-h-[44px] max-h-28 resize-y ${
              modoIA
                ? 'bg-purple-50/50 border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-500 placeholder-purple-400/80'
                : 'bg-gray-50/80 border-lila-light/60 focus:bg-white focus:ring-2 focus:ring-lila-main placeholder-gray-400'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={(!inputTexto.trim() && pendingFiles.length === 0 && !voiceFile) || sending || sendingIA || recording}
          className={`px-3 py-2.5 sm:px-5 sm:py-3 min-h-[44px] min-w-[44px] text-white font-bold rounded-xl sm:rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 ${
            modoIA
              ? 'bg-gradient-to-r from-purple-600 to-pink-500 shadow-purple-500/20'
              : 'bg-gradient-to-r from-lila-main to-pink-main shadow-pink-main/20'
          }`}
          title={modoIA ? 'Consultar a la IA' : 'Enviar mensaje'}
          aria-label={modoIA ? 'Consultar a la IA' : 'Enviar mensaje'}
        >
          {sending || sendingIA ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : modoIA ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline text-xs sm:text-sm">
            {modoIA ? 'Consultar' : 'Enviar'}
          </span>
        </button>
      </form>

      {/* MODAL PARA REVISAR RECOMENDACIÓN CON PORTAL Y DISEÑO RESPONSIVE */}
      {revisandoRecomendacion && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-contain transition-all"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-recommendation-title"
          onClick={closeRecommendationReview}
        >
          <div
            className="bg-white w-full sm:max-w-2xl lg:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-purple-200/80 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[88dvh] max-h-[100dvh] overflow-hidden min-w-0 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tirador táctil móvil */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0 cursor-pointer" onClick={closeRecommendationReview} />

            {/* Encabezado fijo del Modal */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-purple-50 via-white to-pink-50 border-b border-purple-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 id="modal-recommendation-title" className="text-sm sm:text-base font-bold text-gray-900 tracking-tight truncate">
                    Revisión de Recomendación UML
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium truncate">
                    Propuesta colaborativa asistida por IA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRecommendationReview}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0 cursor-pointer"
                aria-label="Cerrar revisión"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll vertical único */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 sm:p-6 space-y-4 text-xs overscroll-contain">
              {/* Alerta de error en la acción */}
              {localError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{localError}</span>
                </div>
              )}

              {/* Alerta de cambios no guardados */}
              {hasUnsavedChanges && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block font-bold">Cambios pendientes en el lienzo:</strong>
                    <span>Primero guarda o descarta tus cambios locales antes de aplicar la recomendación.</span>
                  </div>
                </div>
              )}

              {/* Alerta de recomendación obsoleta */}
              {reviewEvaluation?.status === 'OBSOLETA' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block font-bold">Recomendación desactualizada (Obsoleta):</strong>
                    <span>{reviewEvaluation.reason || `Esta propuesta se calculó sobre la v${revisandoRecomendacion.versionDiagrama} del diagrama, pero la versión actual en el editor es v${diagramaVersion}. Requiere una nueva revisión.`}</span>
                  </div>
                </div>
              )}
              {reviewEvaluation?.status === 'PENDIENTE_DEPENDENCIA' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-2.5 text-xs">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block font-bold">Pendiente de dependencia:</strong>
                    <span>{reviewEvaluation.reason || 'Esta propuesta depende de una clase que aún no ha sido creada.'} Crea primero la clase requerida para poder aplicar esta recomendación.</span>
                  </div>
                </div>
              )}
              {reviewEvaluation?.status === 'COMPATIBLE' && reviewEvaluation.revalidatedAgainstCurrentVersion && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block font-bold">Revalidada contra versión actual:</strong>
                    <span>Esta propuesta se originó en la v{revisandoRecomendacion.versionDiagrama} y el editor se encuentra en la v{diagramaVersion}. No presenta conflictos y se aplicará de forma segura sobre la versión actual.</span>
                  </div>
                </div>
              )}

              {/* Vista previa estructurada UML */}
              <UmlRecommendationPreview
                rec={revisandoRecomendacion}
                diagramaVersion={diagramaVersion}
                diagramaNombre={diagramaNombre}
                evaluation={reviewEvaluation}
                diagramClasses={diagramClasses}
              />

              {/* Nota de seguridad y colaboración */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-purple-950 flex items-start gap-2.5 text-[11px]">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Esta propuesta fue generada por el pipeline de IA para su revisión colaborativa.
                  La aplicación requiere confirmación explícita. El backend volverá a validar la recomendación original, la versión y tus permisos antes de modificar el diagrama.
                </p>
              </div>
            </div>

            {/* Footer fijo del Modal con botones táctiles grandes y accesibles */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/95 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
                <button
                  type="button"
                  onClick={closeRecommendationReview}
                  className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-white sm:bg-transparent border border-gray-200 sm:border-transparent hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={() => void handleDiscardRecommendation()}
                  disabled={!revisandoRecomendacion.id || !revisandoMensajeId || applyingRecommendationId === revisandoRecomendacion.id || appliedRecommendationIds.has(revisandoRecomendacion.id) || discardedRecommendationIds.has(revisandoRecomendacion.id)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                >
                  Descartar propuesta
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleApplyRecommendation()}
                disabled={
                  hasUnsavedChanges ||
                  !revisandoRecomendacion.id ||
                  !revisandoMensajeId ||
                  applyingRecommendationId === revisandoRecomendacion.id ||
                  appliedRecommendationIds.has(revisandoRecomendacion.id) ||
                  discardedRecommendationIds.has(revisandoRecomendacion.id) ||
                  Boolean(reviewEvaluation?.isApplyDisabled)
                }
                title={
                  hasUnsavedChanges
                    ? 'Guarda o descarta tus cambios locales antes de aplicar'
                    : reviewEvaluation?.status === 'PENDIENTE_DEPENDENCIA'
                    ? (reviewEvaluation.reason || 'Pendiente de dependencia')
                    : 'Confirmar y aplicar la recomendación'
                }
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-gradient-to-r from-lila-main to-pink-main border border-purple-300 hover:opacity-95 disabled:text-gray-400 disabled:bg-gray-200 disabled:border-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer order-1 sm:order-2"
              >
                {applyingRecommendationId === revisandoRecomendacion.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{applyingRecommendationId === revisandoRecomendacion.id ? 'Aplicando…' : revisandoRecomendacion.tipoCambio === 'ELIMINAR_CLASE' ? 'Confirmar eliminación' : 'Confirmar y aplicar'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
