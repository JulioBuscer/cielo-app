export interface SyncOffer {
  v: number;
  host: string;
  port: number;
  key: string;
  device: string;
}

export interface SyncPayload {
  deviceId: string;
  timestamp: number;
  timelineEvents: any[];
  catalogItems: any[];
  tags: any[];
}

export type SyncMessageType = 'sync_request' | 'sync_response' | 'sync_ack' | 'sync_error';

export interface SyncMessage {
  type: SyncMessageType;
  payload?: SyncPayload;
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
  | 'error';

export type SyncRole = 'host' | 'join' | null;
