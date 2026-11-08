import type { RecomendacionUml } from '../types/chat';

export function parseProposal(prop: any): any {
  if (!prop) return {};
  if (typeof prop === 'object') return prop;
  if (typeof prop === 'string') {
    try {
      const parsed = JSON.parse(prop);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return parsed;
        }
      }
      return parsed;
    } catch {
      return {};
    }
  }
  return {};
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
  appliedIds: Set<string> = new Set(),
  discardedIds: Set<string> = new Set(),
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
