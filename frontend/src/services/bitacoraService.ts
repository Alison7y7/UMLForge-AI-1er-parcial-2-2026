import { api } from '../api/axios';

export interface Bitacora {
  id: number;
  usuarioNombre: string | null;
  proyectoNombre: string | null;
  accion: string;
  descripcion: string;
  fechaHora: string;
}

export const getBitacoras = async (): Promise<Bitacora[]> => {
  try {
    const response = await api.get<Bitacora[]>('/bitacoras');
    return response.data;
  } catch (error) {
    console.error('Error fetching bitacoras:', error);
    throw error;
  }
};
