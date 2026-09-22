import axios from 'axios';
import { api } from '../api/axios';
import type { UmlModelJson } from '../types/uml';

export interface ImageUmlRequest {
  archivo: File;
  diagramaId: number | null;
}

export interface ImageUmlResponse {
  analisisId: number;
  proveedor: string;
  modelo: UmlModelJson;
  tokensUsados: number | null;
}

export const reconstruirDiagramaDesdeImagen = async (
  request: ImageUmlRequest
): Promise<ImageUmlResponse> => {
  const formData = new FormData();
  formData.append('archivo', request.archivo);
  if (request.diagramaId !== null) {
    formData.append('diagramaId', String(request.diagramaId));
  }

  const response = await api.post<ImageUmlResponse>('/ia/reconstruir-imagen', formData);
  return response.data;
};

export const obtenerMensajeErrorImagen = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo reconstruir el diagrama desde la imagen.';
  }

  const responseData = error.response?.data as { message?: string } | string | undefined;
  if (typeof responseData === 'string') return responseData;
  return responseData?.message || 'No se pudo reconstruir el diagrama desde la imagen.';
};
