import { useEffect, useState } from 'react';
import { getBitacoras } from '../services/bitacoraService';
import type { Bitacora } from '../services/bitacoraService';
import { 
  Clock, X, Search, Calendar, Activity, User as UserIcon, Folder
} from 'lucide-react';
import Layout from '../components/Layout';

export default function BitacoraVista() {
  const [bitacoras, setBitacoras] = useState<Bitacora[]>([]);
  const [filteredBitacoras, setFilteredBitacoras] = useState<Bitacora[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const fetchBitacoras = async () => {
    try {
      const data = await getBitacoras();
      setBitacoras(data);
      setFilteredBitacoras(data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la bitácora. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitacoras();
  }, []);

  useEffect(() => {
    let result = bitacoras;
    
    if (filtroUsuario) {
      const lowerUser = filtroUsuario.toLowerCase();
      result = result.filter(b => b.usuarioNombre?.toLowerCase().includes(lowerUser));
    }
    
    if (filtroAccion) {
      const lowerAction = filtroAccion.toLowerCase();
      result = result.filter(b => b.accion?.toLowerCase().includes(lowerAction));
    }
    
    if (filtroFecha) {
      result = result.filter(b => {
        if (!b.fechaHora) return false;
        const datePart = b.fechaHora.split('T')[0];
        return datePart === filtroFecha;
      });
    }

    setFilteredBitacoras(result);
  }, [filtroUsuario, filtroAccion, filtroFecha, bitacoras]);

  return (
    <Layout>
      <div className="w-full">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark tracking-tight mb-2">
              Bitácora de actividades
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm lg:text-base font-medium max-w-2xl leading-relaxed">
              Revisa el historial de acciones y eventos realizados en el sistema.
            </p>
          </div>
        </div>

        {/* Contenedor Principal */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl sm:rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden mb-8 sm:mb-10">
          
          {/* Barra de Filtros Responsiva */}
          <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100/80">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por usuario..."
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  className="w-full pl-10 pr-3 sm:pl-11 sm:pr-4 py-2.5 sm:py-3 bg-gray-50/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-xs sm:text-sm"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por acción (ej. LOGIN)..."
                  value={filtroAccion}
                  onChange={(e) => setFiltroAccion(e.target.value)}
                  className="w-full pl-10 pr-3 sm:pl-11 sm:pr-4 py-2.5 sm:py-3 bg-gray-50/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-xs sm:text-sm"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full pl-10 pr-3 sm:pl-11 sm:pr-4 py-2.5 sm:py-3 bg-gray-50/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main mb-3"></div>
              <p className="text-gray-500 font-medium text-sm">Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-3">
                <X className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-text-dark mb-1">Error de conexión</h3>
              <p className="text-gray-500 font-medium text-xs sm:text-sm max-w-sm">{error}</p>
              <button 
                type="button"
                onClick={fetchBitacoras}
                className="mt-5 px-5 py-2.5 bg-lila-main text-white rounded-xl font-bold hover:bg-opacity-90 transition-all text-sm min-h-[44px]"
              >
                Reintentar
              </button>
            </div>
          ) : filteredBitacoras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-text-dark">No se encontraron registros</h3>
              <p className="text-gray-500 mt-1 font-medium max-w-sm text-xs sm:text-sm">
                Aún no hay actividades registradas en el sistema o ningún evento coincide con tus filtros.
              </p>
            </div>
          ) : (
            <>
              {/* VISTA ESCRITORIO / TABLET: Tabla Completa */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                      <th className="px-6 md:px-8 py-4">Fecha/Hora</th>
                      <th className="px-6 md:px-8 py-4">Usuario</th>
                      <th className="px-6 md:px-8 py-4">Acción</th>
                      <th className="px-6 md:px-8 py-4">Descripción</th>
                      <th className="px-6 md:px-8 py-4">Proyecto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBitacoras.map((b) => {
                      const fecha = new Date(b.fechaHora);
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/40 transition-colors group">
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-xs sm:text-sm font-semibold text-text-dark">{fecha.toLocaleDateString()}</span>
                            <span className="text-xs font-medium text-gray-500 ml-2">{fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                              {b.usuarioNombre || 'Sistema'}
                            </span>
                          </td>
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-lila-main bg-lila-light/40 px-2.5 py-1 rounded-lg tracking-wide">
                              {b.accion}
                            </span>
                          </td>
                          <td className="px-6 md:px-8 py-4 text-xs sm:text-sm font-medium text-gray-600 max-w-xs truncate" title={b.descripcion}>
                            {b.descripcion}
                          </td>
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-xs sm:text-sm font-medium text-gray-500">
                              {b.proyectoNombre || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* VISTA MÓVIL: Tarjetas de Actividad Claras y Legibles (Requisito 5) */}
              <div className="md:hidden divide-y divide-gray-100/80">
                {filteredBitacoras.map((b) => {
                  const fecha = new Date(b.fechaHora);
                  return (
                    <div key={b.id} className="p-4 space-y-2 hover:bg-gray-50/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-lila-main bg-lila-light/50 px-2.5 py-0.5 rounded-lg tracking-wide">
                          {b.accion}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {fecha.toLocaleDateString()} {fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-text-dark leading-relaxed">
                        {b.descripcion}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-700">
                          <UserIcon className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[140px]">{b.usuarioNombre || 'Sistema'}</span>
                        </span>
                        {b.proyectoNombre && (
                          <span className="inline-flex items-center gap-1 bg-pink-light/40 px-2 py-0.5 rounded-md font-medium text-pink-700">
                            <Folder className="w-3 h-3 text-pink-400" />
                            <span className="truncate max-w-[140px]">{b.proyectoNombre}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
