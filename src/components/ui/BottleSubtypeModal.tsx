import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { BOTTLE_SUBTYPE_LABELS, type BottleSubtype } from '@/src/hooks/useFeedingSessions';

export function BottleSubtypeModal({
  visible, onSelect, onClose,
}: {
  visible: boolean;
  onSelect: (subtype: BottleSubtype) => void;
  onClose: () => void;
}) {
  const options = Object.entries(BOTTLE_SUBTYPE_LABELS) as [BottleSubtype, { emoji: string; label: string }][];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(45,27,38,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 20, paddingBottom: 36,
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1, shadowRadius: 16, elevation: 16,
          }}>
            {/* Handle */}
            <View style={{
              width: 40, height: 4, backgroundColor: '#FFD6E8',
              borderRadius: 99, alignSelf: 'center', marginBottom: 20,
            }} />

            <Text style={{ fontWeight: '900', fontSize: 18, color: '#2D1B26', textAlign: 'center', marginBottom: 4 }}>
              🍼 Tipo de Biberón
            </Text>
            <Text style={{ fontSize: 13, color: '#9B7A88', fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
              ¿Qué lleva el biberón?
            </Text>

            {options.map(([id, { emoji, label }]) => (
              <TouchableOpacity
                key={id}
                onPress={() => onSelect(id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#FFF0F5', borderRadius: 16,
                  padding: 14, marginBottom: 8,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#2D1B26' }}>{label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={onClose} style={{ marginTop: 8, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#9B7A88', fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
