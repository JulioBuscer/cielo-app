import { ScrollView, View, Text, TouchableOpacity, Linking, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/src/theme/useTheme";

const SECTIONS = [
  {
    id: "pee",
    icon: "💧",
    title: "Color del pipí",
    desc: "El color de la orina dice mucho sobre la hidratación y salud del bebé.",
    legend: [
      { emoji: "💧", label: "Transparente", severity: "normal", note: "Bien hidratado." },
      { emoji: "💛", label: "Amarillo claro", severity: "normal", note: "Hidratación normal." },
      { emoji: "💛", label: "Amarillo", severity: "normal", note: "Típico, sin preocupación." },
      { emoji: "🟡", label: "Amarillo oscuro", severity: "normal", note: "Puede necesitar más líquidos." },
      { emoji: "🟠", label: "Ámbar", severity: "info", note: "Ofrece pecho o agua si aplica." },
      { emoji: "🟠", label: "Naranja", severity: "info", note: "Podría ser por alimentos o poca hidratación." },
      { emoji: "🔶", label: "Anaranjado rojizo", severity: "watch", note: "Podría indicar sangre. Observa y consulta si persiste. (Stanford Medicine)" },
      { emoji: "🚨", label: "Café / Rojizo", severity: "alert", note: "Posible sangre. Consulta con tu pediatra. (Mayo Clinic)" },
    ],
  },
  {
    id: "poop-color",
    icon: "💩",
    title: "Color de la popó",
    desc: "La popó del bebé cambia de color según la edad, alimentación y salud.",
    legend: [
      { emoji: "🟢", label: "Verde", severity: "normal", note: "Común en bebés de pecho o por alimentos verdes. (Mayo Clinic)" },
      { emoji: "🟡", label: "Amarillo", severity: "normal", note: "Clásico en lactancia materna, aspecto mostaza. (Mayo Clinic)" },
      { emoji: "🟤", label: "Marrón", severity: "normal", note: "Normal en fórmula o al iniciar sólidos. (Mayo Clinic)" },
      { emoji: "🟠", label: "Naranja", severity: "info", note: "Puede ser por alimentos (zanahoria, camote). (NHS)" },
      { emoji: "🩻", label: "Arcilla / Gris", severity: "alert", note: "Poco común. Podría indicar problema hepático (vías biliares). Consulta con tu pediatra. (Mayo Clinic, AAP)" },
      { emoji: "💉", label: "Rojo", severity: "alert", note: "Sangre fresca. Posible fisura anal o alergia a proteína. Consulta con tu pediatra. (Mayo Clinic, NHS)" },
      { emoji: "⚫", label: "Negro", severity: "alert", note: "Sangre digerida (excepto meconio en RN). Consulta con tu pediatra. (Mayo Clinic, NHS)" },
      { emoji: "⚪", label: "Blanco", severity: "alert", note: "Puede indicar obstrucción biliar. Consulta con tu pediatra lo antes posible. (Mayo Clinic, AAP)" },
    ],
  },
  {
    id: "poop-cons",
    icon: "💩",
    title: "Consistencia de la popó",
    desc: "Basado en la Escala de Bristol (tipos 1-7) adaptada para bebés.",
    legend: [
      { emoji: "💎", label: "Dura", severity: "alert", note: "Bristol tipo 1-2: bolitas duras, estreñimiento. Ofrece más líquidos, consulta si persiste. (NHS, Bristol Stool Chart)" },
      { emoji: "🍫", label: "Sólida", severity: "normal", note: "Bristol tipo 3-4: formada pero blanda. (Bristol Stool Chart)" },
      { emoji: "🥜", label: "Pastosa", severity: "normal", note: "Bristol tipo 5: tipo mantequilla de maní, común en bebés. (NHS, Bristol Stool Chart)" },
      { emoji: "💧", label: "Líquida", severity: "info", note: "Bristol tipo 6: semilíquida. En lactancia materna puede ser normal. Si es muy frecuente o acuosa, pasa al nivel 5. (Bristol Stool Chart, NHS)" },
      { emoji: "🌊", label: "Acuosa", severity: "alert", note: "Bristol tipo 7: diarrea. Vigila signos de deshidratación (boca seca, menos pañales mojados). (NHS, Bristol Stool Chart)" },
    ],
  },
];

const SEVERITY_STYLES: Record<string, { icon: string; label: string }> = {
  normal: { icon: "✅", label: "Normal" },
  info: { icon: "ℹ️", label: "Precaución" },
  watch: { icon: "👀", label: "Observa" },
  alert: { icon: "🚨", label: "Alerta" },
};

const SOURCES = [
  { label: "Mayo Clinic — Guía de color de popó en bebés", url: "https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/expert-answers/baby-poop/faq-20057971" },
  { label: "NHS — Popó y pipí del bebé (colores y consistencias)", url: "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/baby-poo-and-wee/" },
  { label: "Stanford Medicine — Color de orina en recién nacidos", url: "https://www.stanfordchildrens.org/en/topic/default?id=newborn-urine-color-90-P02683" },
  { label: "Bristol Stool Chart — Escala de consistencia (tipos 1-7)", url: "https://en.wikipedia.org/wiki/Bristol_stool_scale" },
  { label: "HealthyChildren.org (AAP) — Signos de alerta en popó", url: "https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/Bowel-Movements.aspx" },
  { label: "MedlinePlus — Deshidratación en bebés", url: "https://medlineplus.gov/ency/article/000982.htm" },
];

const SPACING = 12;

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.normal;
  return (
    <View style={{
      backgroundColor: severity === "alert" ? "#FFE0E0" : severity === "watch" ? "#FFF3CD" : severity === "info" ? "#E0F0FF" : "#E0FFE0",
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 2,
    }}>
      <Text style={{ fontSize: 10, fontWeight: "800" }}>
        {s.icon} {s.label}
      </Text>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  desc,
  legend,
}: {
  icon: string;
  title: string;
  desc: string;
  legend: { emoji: string; label: string; severity: string; note: string }[];
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: SPACING }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textBody, fontWeight: "900", fontSize: 16 }}>{title}</Text>
          <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, marginTop: 2 }}>{desc}</Text>
        </View>
      </View>
      {legend.map((item, i) => (
        <View key={i} style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: item.severity === "alert" ? c.danger + "10" : c.surface,
          borderRadius: 12,
          padding: 10,
        }}>
          <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: c.textBody, fontWeight: "800", fontSize: 13 }}>{item.label}</Text>
              <SeverityBadge severity={item.severity} />
            </View>
            <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, lineHeight: 16 }}>
              {item.note}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ResourcesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={c.headerBg} />
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: c.textBody }}>
          📖 Recursos
        </Text>
        <View style={{ minWidth: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {/* Calming intro */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 6 }}>
          <Text style={{ fontSize: 28, textAlign: "center" }}>🧘</Text>
          <Text style={{ color: c.textBody, fontWeight: "900", fontSize: 17, textAlign: "center" }}>
            Respira hondo
          </Text>
          <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 12, textAlign: "center", lineHeight: 18 }}>
            La mayoría de los cambios de color o consistencia son temporales y no representan una emergencia.
            {"\n"}Esta guía te ayuda a saber qué observar y cuándo consultar con tu pediatra.
          </Text>
        </View>

        {SECTIONS.map((s) => (
          <SectionCard key={s.id} icon={s.icon} title={s.title} desc={s.desc} legend={s.legend} />
        ))}

        {/* Sources */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18 }}>📚</Text>
            <Text style={{ color: c.textBody, fontWeight: "900", fontSize: 16 }}>Fuentes consultadas</Text>
          </View>
          {SOURCES.map((s, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => Linking.openURL(s.url)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 10,
                backgroundColor: c.surface,
                borderRadius: 10,
              }}
            >
              <Text style={{ flex: 1, color: c.accent, fontWeight: "700", fontSize: 12, textDecorationLine: "underline" }} numberOfLines={2}>
                {s.label}
              </Text>
              <Text style={{ fontSize: 12, color: c.textDim }}>↗</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disclaimer */}
        <Text style={{ color: c.textDim, fontWeight: "600", fontSize: 10, textAlign: "center", lineHeight: 16 }}>
          Esta guía es solo informativa y no reemplaza la opinión de un profesional de la salud.
          {"\n"}Ante cualquier duda, consulta con tu pediatra.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
