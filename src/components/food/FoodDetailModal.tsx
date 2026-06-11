import { View, Text, Modal, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { FOOD_GROUPS, SUBGROUPS } from "@/src/hooks/useFoodLogs";

const WARNING_EXPLANATIONS: Record<string, string> = {
  nitrates: "Las verduras de hoja verde pueden acumular nitratos del suelo. Se recomienda ofrecerlas frescas y no guardar sobras por más de 24 horas. (ESPGHAN)",
  choking: "Riesgo de asfixia por forma o textura. Debe prepararse en textura segura según la edad del bebé (triturado, machacado o en tiras delgadas). (AAP)",
  vitamin_a: "El consumo excesivo de vitamina A puede ser tóxico. Limitar a 1 porción por semana. (NIH)",
  paste: "Las mantequillas de frutos secos y semillas son pegajosas y pueden obstruir las vías respiratorias. Deben diluirse siempre en agua, leche materna/fórmula o puré. (AAP, Solid Starts)",
  age_restriction: "Este alimento se recomienda a partir de cierta edad por su perfil nutricional o por ser un alérgeno mayor. Consulta con tu pediatra antes de ofrecerlo.",
};

const EFFECT_EXPLANATIONS: Record<string, string> = {
  laxative: "🟢 Este alimento tiene un efecto laxante natural: ayuda a mover el intestino y puede ser útil si el bebé presenta estreñimiento. Contiene fibra soluble y agua que ablandan las heces.",
  astringent: "🟤 Este alimento tiene un efecto astringente: puede ayudar a endurecer las heces y reducir la frecuencia de evacuaciones. Recomendado en casos de diarrea leve o transición.",
  regulator: "🔄 Este alimento tiene un efecto regulador: ayuda a mantener un tránsito intestinal normal y equilibrado, sin inclinar la balanza hacia la diarrea o el estreñimiento.",
};

export function FoodDetailModal({
  food,
  visible,
  onClose,
}: {
  food: any;
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (!food) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 32 }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 24,
            maxHeight: "80%",
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 48 }}>{food.emoji ?? ""}</Text>
              <Text style={{ color: c.textBody, fontSize: 22, fontWeight: "800", textAlign: "center" }}>
                {food.name}
              </Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              <View style={{ backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ color: c.textBody, fontSize: 13, fontWeight: "600" }}>
                  {FOOD_GROUPS[food.group] ?? food.group}
                </Text>
              </View>
              {food.subgroup ? (
                <View style={{ backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
                    {SUBGROUPS[food.subgroup] ?? food.subgroup}
                  </Text>
                </View>
              ) : null}
            </View>

            {food.property ? (
              <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 14 }}>
                <Text style={{ color: c.textBody, fontSize: 14, fontWeight: "700", marginBottom: 4 }}>
                  Propiedad intestinal
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19 }}>
                  {EFFECT_EXPLANATIONS[food.effect ?? ""] ?? food.property}
                </Text>
              </View>
            ) : null}

            {food.isAllergen ? (
              <View style={{
                backgroundColor: c.danger + "18", borderRadius: 12, padding: 14,
                borderLeftWidth: 3, borderLeftColor: c.danger,
              }}>
                <Text style={{ color: c.danger, fontSize: 14, fontWeight: "700", marginBottom: 4 }}>
                  🚨 Alérgeno mayor
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19 }}>
                  {food.allergenDetails ?? "Este alimento es considerado un alérgeno prioritario. Se recomienda introducirlo temprano (6-12 meses) y mantener exposición regular."}
                </Text>
              </View>
            ) : null}

            {food.warning ? (
              <View style={{
                backgroundColor: c.warning + "18", borderRadius: 12, padding: 14,
                borderLeftWidth: 3, borderLeftColor: c.warning,
              }}>
                <Text style={{ color: c.warning, fontSize: 14, fontWeight: "700", marginBottom: 4 }}>
                  ⚠️ Precaucion
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>
                  {food.warning}
                </Text>
                {food.warningType && WARNING_EXPLANATIONS[food.warningType] ? (
                  <Text style={{ color: c.textDim, fontSize: 12, lineHeight: 18, fontStyle: "italic" }}>
                    {WARNING_EXPLANATIONS[food.warningType]}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12,
                alignItems: "center", marginTop: 4,
              }}
            >
              <Text style={{ color: c.textOnAccent, fontWeight: "900", fontSize: 15 }}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
