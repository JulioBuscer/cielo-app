import TcpSocket from 'react-native-tcp-socket';
import type { SyncOffer } from './types';

const SIGNALING_TIMEOUT = 30000;

export async function startSignalingServer(): Promise<{ port: number; stop: () => void }> {
  return new Promise((resolve, reject) => {
    const server = TcpSocket.createServer((client: any) => {
      client.on('error', () => {});
      client.setTimeout(SIGNALING_TIMEOUT, () => client.destroy());
    });

    server.on('error', (err: Error) => reject(err));

    server.listen({ port: 0, host: '0.0.0.0' }, () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        port,
        stop: () => {
          try { server.close(); } catch {}
        },
      });
    });
  });
}

export async function connectToSignalingServer(
  offer: SyncOffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = TcpSocket.createConnection(
      { host: offer.host, port: offer.port },
      () => {
        client.write(JSON.stringify({ type: 'hello' }) + '\n');
      },
    );

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Signaling timeout'));
    }, SIGNALING_TIMEOUT);

    client.on('data', () => {
      clearTimeout(timeout);
      client.destroy();
      resolve();
    });

    client.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
