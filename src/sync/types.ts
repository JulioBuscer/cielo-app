export interface SyncOffer {
  v: number;
  host?: string;
  port?: number;
  key: string;
  device: string;
  sessionId?: string;
}

export interface SyncPayload {
  deviceId: string;
  timestamp: number;
  timelineEvents?: any[];
  catalogItems?: any[];
  tags?: any[];
  profiles?: any[];
  babies?: any[];
  operations?: SyncOperation[];
}

export interface SyncOperation {
  tableName: 'timeline_events' | 'catalog_items' | 'tags' | 'profiles' | 'babies';
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  createdAt: number;
}

export type SyncMessageType = 'sync_request' | 'sync_response' | 'sync_ack' | 'sync_error' | 'operation';

export interface SyncMessage {
  type: SyncMessageType;
  payload?: SyncPayload;
  operation?: SyncOperation;
  deviceId?: string;
  error?: string;
}

export type SyncStep =
  | 'idle'
  | 'generating'
  | 'waiting_qr'
  | 'scanning'
  | 'signaling'
  | 'connecting_webrtc'
  | 'syncing'
  | 'merging'
  | 'done'
  | 'connected'
  | 'error';

export type SyncRole = 'host' | 'join' | null;

export interface PairedDevice {
  deviceId: string;
  name: string;
  lastConnectedAt: number;
  sessionCount: number;
}
