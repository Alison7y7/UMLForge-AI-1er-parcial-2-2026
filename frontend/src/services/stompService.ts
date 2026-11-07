import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';

export type StompConnectionStatus =
  | 'Conectando...'
  | 'Sincronizado'
  | 'Reconectando...'
  | 'Sin conexión';

type MessageCallback = (data: any) => void;
type StatusCallback = (status: StompConnectionStatus) => void;

class StompService {
  private client: Client | null = null;
  private status: StompConnectionStatus = 'Sin conexión';
  private topicCallbacks = new Map<string, Set<MessageCallback>>();
  private brokerSubscriptions = new Map<string, StompSubscription>();
  private statusListeners = new Set<StatusCallback>();
  private disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  public getStatus(): StompConnectionStatus {
    return this.status;
  }

  public addStatusListener(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(newStatus: StompConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus);
        } catch (err) {
          console.error('Error in status listener:', err);
        }
      });
    }
  }

  private getWsUrl(): string {
    return import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws-uml';
  }

  private ensureClient(): Client {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    if (this.client) {
      return this.client;
    }

    const token = useAuthStore.getState().token;

    this.setStatus('Conectando...');

    this.client = new Client({
      webSocketFactory: () => new SockJS(this.getWsUrl()),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        this.setStatus('Sincronizado');
        this.resubscribeAll();
      },
      onStompError: (frame) => {
        console.warn('STOMP error frame:', frame);
        this.setStatus('Sin conexión');
      },
      onWebSocketClose: () => {
        // Si aún tenemos suscriptores, pasamos a 'Reconectando...'
        if (this.topicCallbacks.size > 0) {
          this.setStatus('Reconectando...');
        } else {
          this.setStatus('Sin conexión');
        }
        // Limpiamos referencias de suscripciones del broker porque la conexión cayó
        this.brokerSubscriptions.clear();
      },
    });

    this.client.activate();
    return this.client;
  }

  private resubscribeAll() {
    if (!this.client || !this.client.connected) return;

    this.topicCallbacks.forEach((callbacks, destination) => {
      if (callbacks.size > 0 && !this.brokerSubscriptions.has(destination)) {
        this.createBrokerSubscription(destination);
      }
    });
  }

  private createBrokerSubscription(destination: string) {
    if (!this.client || !this.client.connected) return;

    try {
      const sub = this.client.subscribe(destination, (message) => {
        let payload: any;
        try {
          payload = JSON.parse(message.body);
        } catch {
          payload = message.body;
        }

        const callbacks = this.topicCallbacks.get(destination);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error(`Error in message callback for ${destination}:`, err);
            }
          });
        }
      });

      this.brokerSubscriptions.set(destination, sub);
    } catch (err) {
      console.error(`Error subscribing to destination ${destination}:`, err);
    }
  }

  public subscribe(destination: string, callback: MessageCallback): () => void {
    if (!this.topicCallbacks.has(destination)) {
      this.topicCallbacks.set(destination, new Set());
    }

    const callbacks = this.topicCallbacks.get(destination)!;
    callbacks.add(callback);

    this.ensureClient();

    if (this.client?.connected && !this.brokerSubscriptions.has(destination)) {
      this.createBrokerSubscription(destination);
    }

    return () => {
      this.unsubscribe(destination, callback);
    };
  }

  public unsubscribe(destination: string, callback: MessageCallback) {
    const callbacks = this.topicCallbacks.get(destination);
    if (!callbacks) return;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.topicCallbacks.delete(destination);
      const brokerSub = this.brokerSubscriptions.get(destination);
      if (brokerSub) {
        try {
          brokerSub.unsubscribe();
        } catch (err) {
          console.warn(`Error unsubscribing broker for ${destination}:`, err);
        }
        this.brokerSubscriptions.delete(destination);
      }
    }

    // Si ya no quedan suscriptores activos en ningún topic, programamos desconexión tras gracia
    if (this.topicCallbacks.size === 0) {
      this.scheduleDisconnect();
    }
  }

  public publish(destination: string, body?: any) {
    if (!this.client || !this.client.connected) {
      console.warn(`Cannot publish to ${destination}: STOMP client not connected`);
      return;
    }

    this.client.publish({
      destination,
      body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
    });
  }

  private scheduleDisconnect() {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
    }

    // Esperar 8 segundos antes de desconectar el socket por inactividad
    this.disconnectTimeout = setTimeout(() => {
      if (this.topicCallbacks.size === 0 && this.client) {
        const clientToClose = this.client;
        this.client = null;
        this.brokerSubscriptions.clear();
        this.setStatus('Sin conexión');
        void clientToClose.deactivate();
      }
      this.disconnectTimeout = null;
    }, 8000);
  }

  public forceDisconnect() {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    if (this.client) {
      const clientToClose = this.client;
      this.client = null;
      this.brokerSubscriptions.clear();
      this.topicCallbacks.clear();
      this.setStatus('Sin conexión');
      void clientToClose.deactivate();
    }
  }
}

export const stompService = new StompService();
