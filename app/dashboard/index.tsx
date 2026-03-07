import { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveBaby } from '@/src/hooks/useBaby';
import { useActiveProfile } from '@/src/hooks/useProfile';
import {
  useActiveFeedingSession,
  useFeedingHistory,
  useStartFeeding,
  type FeedingType,
  type BottleSubtype,
} from '@/src/hooks/useFeedingSessions';
import { useTimeline, useSaveTimelineEvent, useEventTypes } from '@/src/hooks/useTimeline';
import { ActiveFeedingCard } from '@/src/components/ui/ActiveFeedingCard';
import { BottleSubtypeModal } from '@/src/components/ui/BottleSubtypeModal';
import {
  TimelineBubble,
  FeedingSessionBubble,
  DateSeparator,
} from '@/src/components/ui/TimelineBubbles';

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickBtn({
  emoji, label, onPress, disabled, loading, bgColor, size = 54,
}: {
  emoji: string; label: string; onPress: () => void;
  disabled?: boolean; loading?: boolean;
  bgColor: string; size?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{ alignItems: 'center', gap: 4, opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: bgColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 4,
      }}>
        {loading
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Text style={{ fontSize: size === 62 ? 28 : 22 }}>{emoji}</Text>
        }
      </View>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#9B7A88', textAlign: 'center', lineHeight: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Modal de Eventos ─────────────────────────────────────────────────────────

function EventPickerModal({
  visible, onClose, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (typeId: string) => void;
}) {
  const { data: types } = useEventTypes();
  const available = (types ?? []).filter(t => t.id !== 'diaper');

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
      backgroundColor: 'rgba(45,27,38,0.4)',
      justifyContent: 'flex-end', zIndex: 100,
    }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      <View style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 20, paddingBottom: 36,
      }}>
        <View style={{
          width: 40, height: 4, backgroundColor: '#FFD6E8',
          borderRadius: 99, alignSelf: 'center', marginBottom: 16,
        }} />
        <Text style={{ fontWeight: '900', fontSize: 17, color: '#2D1B26', marginBottom: 12 }}>
          📝 Registrar Evento
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {available.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => onSelect(t.id)}
              style={{
                backgroundColor: '#FFF0F5', borderRadius: 14,
                paddingHorizontal: 14, paddingVertical: 10,
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
            >
              <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
              <Text style={{ fontWeight: '800', fontSize: 13, color: '#2D1B26' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 14, alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ color: '#9B7A88', fontWeight: '700' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── TIMELINE SCREEN ──────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [loadingType, setLoadingType]         = useState<FeedingType | null>(null);
  const [note, setNote]                       = useState('');

  const flatRef = useRef<FlatList>(null);

  const { data: baby }          = useActiveBaby();
  const { data: profile }       = useActiveProfile();
  const { data: activeSession } = useActiveFeedingSession(baby?.id);
  const { data: tlEvents }      = useTimeline(baby?.id, 50);
  const { data: sessions }      = useFeedingHistory(baby?.id, 20);
  const startFeeding            = useStartFeeding();
  const saveEvent               = useSaveTimelineEvent();

  // ─── Combinar y ordenar items de la timeline ───────────────────────────────
  type TLItem =
    | { kind: 'event';   data: NonNullable<typeof tlEvents>[0]; ts: number }
    | { kind: 'session'; data: NonNullable<typeof sessions>[0]; ts: number }
    | { kind: 'date';    date: Date; ts: number };

  const buildItems = (): TLItem[] => {
    const all: TLItem[] = [
      ...(tlEvents ?? []).map(e => ({ kind: 'event'   as const, data: e, ts: new Date(e.timestamp).getTime() })),
      ...(sessions ?? [])
        .filter(s => s.status === 'finished')
        .map(s => ({ kind: 'session' as const, data: s, ts: new Date(s.startedAt).getTime() })),
    ].sort((a, b) => a.ts - b.ts); // Ascendente para FlatList invertida

    // Insertar separadores de fecha
    const result: TLItem[] = [];
    let lastDate = '';
    for (const item of all) {
      const d = new Date(item.ts);
      const dateStr = d.toDateString();
      if (dateStr !== lastDate) {
        result.push({ kind: 'date', date: d, ts: item.ts - 1 });
        lastDate = dateStr;
      }
      result.push(item);
    }
    return result;
  };

  const items = buildItems();

  // ─── Acciones ──────────────────────────────────────────────────────────────

  const handleStartFeeding = async (type: FeedingType, bottleSubtype?: BottleSubtype) => {
    if (!baby) return;
    setLoadingType(type);
    try {
      await startFeeding.mutateAsync({ babyId: baby.id, type, bottleSubtype });
    } finally {
      setLoadingType(null);
    }
  };

  const handleSendNote = () => {
    if (!note.trim() || !baby) return;
    saveEvent.mutate({
      babyId: baby.id,
      eventTypeId: 'note',
      notes: note.trim(),
      feedingSessionId: activeSession?.id,
    });
    setNote('');
  };

  const handleEventSelect = (typeId: string) => {
    setShowEventPicker(false);
    if (typeId === 'diaper') {
      router.push('/logs/diaper/new');
    } else {
      router.push({ pathname: '/logs/event/new', params: { preselect: typeId } });
    }
  };

  // ─── Render de items ───────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: TLItem }) => {
    if (item.kind === 'date') {
      return <DateSeparator date={item.date} />;
    }

    if (item.kind === 'session') {
      const isOwn = item.data.profileId === profile?.id;
      return (
        <FeedingSessionBubble
          session={item.data}
          isOwn={isOwn}
          profileName={!isOwn ? 'Otro cuidador' : undefined}
          onPress={() => router.push({ pathname: '/logs/feeding/detail', params: { id: item.data.id } })}
        />
      );
    }

    // kind === 'event'
    const isOwn = item.data.profileId === profile?.id;
    // TODO: obtener del catálogo; placeholder por ahora
    const typeMap: Record<string, { emoji: string; label: string }> = {
      diaper:        { emoji: '🍑', label: 'Pañal' },
      burp:          { emoji: '💨', label: 'Eructo' },
      regurgitation: { emoji: '🤧', label: 'Regurgitación' },
      vomit:         { emoji: '🤮', label: 'Vómito' },
      medication:    { emoji: '💊', label: 'Medicamento' },
      weight:        { emoji: '⚖️', label: 'Peso' },
      height:        { emoji: '📏', label: 'Estatura' },
      temperature:   { emoji: '🌡️', label: 'Temperatura' },
      note:          { emoji: '📝', label: 'Nota' },
    };
    const { emoji, label } = typeMap[item.data.eventTypeId] ?? { emoji: '📝', label: item.data.eventTypeId };

    return (
      <TimelineBubble
        event={item.data}
        eventTypeEmoji={emoji}
        eventTypeLabel={label}
        isOwn={isOwn}
        profileName={!isOwn ? 'Otro cuidador' : undefined}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FF8AB3' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB3" />

      {/* ── Header WhatsApp style ── */}
      <View style={{
        backgroundColor: '#FF8AB3',
        paddingHorizontal: 16, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        shadowColor: '#FF5C9A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 6,
        elevation: 4,
      }}>
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: 'rgba(255,255,255,0.3)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 22 }}>👶</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 17 }}>
            {baby?.name ?? 'Cielo'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>
            {activeSession ? '🟢 Toma en curso' : '2 cuidadores · Cielo App'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/logs/feeding/retro')}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>⏱ Rezagada</Text>
        </TouchableOpacity>
      </View>

      {/* ── Fondo chat + contenido ── */}
      <View style={{ flex: 1, backgroundColor: '#FFF0F5' }}>

        {/* Toma activa — fija arriba del chat */}
        {activeSession && (
          <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
            <ActiveFeedingCard session={activeSession} />
          </View>
        )}

        {/* Lista de mensajes — invertida */}
        <FlatList
          ref={flatRef}
          data={[...items].reverse()}  // invertimos para que FlatList muestre últimos abajo
          keyExtractor={(item, i) => `${item.kind}-${item.ts}-${i}`}
          renderItem={renderItem}
          inverted
          contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🌙</Text>
              <Text style={{ color: '#9B7A88', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
                Aquí aparecerá el historial{'\n'}de Emiliano
              </Text>
              <Text style={{ color: '#9B7A88', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                Empieza registrando la primera toma
              </Text>
            </View>
          }
        />

        {/* ── Barra inferior ── */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1, borderTopColor: '#FFE4EE',
          paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
        }}>
          {/* Botones de inicio rápido */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end',
            justifyContent: 'space-between', paddingHorizontal: 4,
            marginBottom: 10,
          }}>
            <QuickBtn
              emoji="🤱" label={`Pecho\nIzq.`}
              bgColor="#FF8AB3"
              onPress={() => handleStartFeeding('breast_left')}
              loading={loadingType === 'breast_left'}
              disabled={!!loadingType}
            />
            <QuickBtn
              emoji="🤱" label={`Pecho\nDer.`}
              bgColor="#FF8AB3"
              onPress={() => handleStartFeeding('breast_right')}
              loading={loadingType === 'breast_right'}
              disabled={!!loadingType}
            />
            <QuickBtn
              emoji="+" label="Evento"
              bgColor="#FF5C9A"
              size={62}
              onPress={() => setShowEventPicker(true)}
              disabled={!!loadingType}
            />
            <QuickBtn
              emoji="🍼" label="Biberón"
              bgColor="#A855F7"
              onPress={() => setShowBottleModal(true)}
              loading={loadingType === 'bottle'}
              disabled={!!loadingType}
            />
            <QuickBtn
              emoji="🍑" label="Pañal"
              bgColor="#F59E0B"
              onPress={() => router.push('/logs/diaper/new')}
              disabled={!!loadingType}
            />
          </View>

          {/* Input de nota rápida */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              style={{
                flex: 1, backgroundColor: '#FFE4EE',
                borderRadius: 24, paddingHorizontal: 16,
                paddingVertical: 10, fontSize: 14,
                color: '#2D1B26', fontFamily: undefined,
              }}
              placeholder="Nota rápida…"
              placeholderTextColor="#9B7A88"
              value={note}
              onChangeText={setNote}
              onSubmitEditing={handleSendNote}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSendNote}
              disabled={!note.trim()}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#25D366',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#25D366', shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
                opacity: note.trim() ? 1 : 0.4,
              }}
            >
              <Text style={{ color: 'white', fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modales */}
      <BottleSubtypeModal
        visible={showBottleModal}
        onClose={() => setShowBottleModal(false)}
        onSelect={(subtype) => {
          setShowBottleModal(false);
          handleStartFeeding('bottle', subtype);
        }}
      />

      <EventPickerModal
        visible={showEventPicker}
        onClose={() => setShowEventPicker(false)}
        onSelect={handleEventSelect}
      />
    </SafeAreaView>
  );
}
