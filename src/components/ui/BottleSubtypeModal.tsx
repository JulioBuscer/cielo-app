import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { BOTTLE_SUBTYPE_LABELS, type BottleSubtype } from '@/src/hooks/useFeedingSessions';

export function BottleSubtypeModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (subtype: BottleSubtype) => void;
  onClose: () => void;
}) {
  const options = Object.entries(BOTTLE_SUBTYPE_LABELS) as [BottleSubtype, { emoji: string; label: string }][];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/60 justify-end"
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View className="bg-bgElevated rounded-t-3xl p-6 pb-10">
            <View className="w-10 h-1 bg-bgCard rounded-full self-center mb-6" />
            <Text className="text-textPrimary text-xl font-bold mb-2 text-center">
              🍼 Tipo de Biberón
            </Text>
            <Text className="text-textMuted text-sm text-center mb-6">
              ¿Qué lleva el biberón?
            </Text>

            <View className="gap-3">
              {options.map(([id, { emoji, label }]) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => onSelect(id)}
                  className="bg-bgCard flex-row items-center gap-4 px-5 py-4 rounded-2xl active:opacity-70"
                >
                  <Text className="text-3xl">{emoji}</Text>
                  <Text className="text-textPrimary text-lg font-semibold">{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={onClose} className="mt-4 py-3 items-center">
              <Text className="text-textMuted">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
