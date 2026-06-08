import {
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import type { SyncMessage } from './types';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection(STUN_SERVERS);
}

export function createDataChannel(pc: RTCPeerConnection, label = 'cielo-sync') {
  return (pc as any).createDataChannel(label, { ordered: true });
}

export async function createOfferSdp(pc: RTCPeerConnection): Promise<string> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    (pc as any).onicecandidate = (event: any) => {
      if (!event.candidate) resolve();
    };
  });

  return pc.localDescription?.sdp ?? '';
}

export async function createAnswerSdp(
  pc: RTCPeerConnection,
  offerSdp: string,
): Promise<string> {
  await pc.setRemoteDescription(
    new RTCSessionDescription({ type: 'offer', sdp: offerSdp }),
  );

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    (pc as any).onicecandidate = (event: any) => {
      if (!event.candidate) resolve();
    };
  });

  return pc.localDescription?.sdp ?? '';
}

export async function setRemoteAnswer(
  pc: RTCPeerConnection,
  answerSdp: string,
): Promise<void> {
  await pc.setRemoteDescription(
    new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
  );
}

export async function getLocalIp(): Promise<string> {
  try {
    const TcpSocket = (await import('react-native-tcp-socket')).default;
    return new Promise((resolve) => {
      const temp = TcpSocket.createConnection(
        { host: '8.8.8.8', port: 53 },
        () => {
          const ip = temp.localAddress || '0.0.0.0';
          temp.destroy();
          resolve(ip);
        },
      );
      temp.setTimeout(3000, () => {
        temp.destroy();
        resolve('0.0.0.0');
      });
    });
  } catch {
    return '0.0.0.0';
  }
}

export function setupChannelListeners(
  channel: any,
  onMessage: (msg: SyncMessage) => void,
  onOpen: () => void,
): void {
  if (!channel) return;
  channel.onopen = () => onOpen();
  channel.onmessage = (event: any) => {
    try {
      const msg: SyncMessage = JSON.parse(event.data);
      onMessage(msg);
    } catch {}
  };
  channel.onerror = (err: any) => {
    console.warn('[Sync] DataChannel error:', err?.message ?? err);
  };
}

export function sendSyncMessage(channel: any, msg: SyncMessage): void {
  if (channel?.readyState === 'open') {
    channel.send(JSON.stringify(msg));
  }
}
