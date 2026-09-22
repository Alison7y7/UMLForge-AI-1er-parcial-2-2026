import axios from 'axios';
import { api } from '../api/axios';
import type { UmlModelJson } from '../types/uml';

export interface IAModelRequest {
  diagramaId: number | null;
  prompt: string;
}

export interface IAModelResponse {
  peticionId: number;
  proveedor: string;
  modelo: UmlModelJson;
  tokensUsados: number | null;
}

export const generarModeloUml = async (
  request: IAModelRequest
): Promise<IAModelResponse> => {
  const response = await api.post<IAModelResponse>('/ia/modelar', request);
  return response.data;
};

export const obtenerMensajeErrorIA = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo generar el modelo UML.';
  }

  const responseData = error.response?.data as { message?: string } | string | undefined;
  if (typeof responseData === 'string') return responseData;
  return responseData?.message || 'No se pudo generar el modelo UML.';
};
