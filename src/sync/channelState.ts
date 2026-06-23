let _channel: any = null;
let _lastOutboxSync = 0;

export function setActiveChannel(ch: any | null) {
  _channel = ch;
  if (!ch) _lastOutboxSync = 0;
}

export function getActiveChannel(): any {
  return _channel;
}

export function getLastOutboxSync(): number {
  return _lastOutboxSync;
}

export function setLastOutboxSync(t: number) {
  _lastOutboxSync = t;
}
