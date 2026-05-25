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
      { emoji: "💛", label: "Amarillo", severity: "normal", note: "Típico, sin preocupación. (Stanford Medicine)" },
      { emoji: "🟡", label: "Amarillo oscuro", severity: "normal", note: "Puede necesitar más líquidos. (Stanford Medicine)" },
      { emoji: "🟠", label: "Ámbar", severity: "info", note: "Ofrece pecho o agua si aplica. (Stanford Medicine)" },
      { emoji: "🟠", label: "Naranja", severity: "info", note: "Podría ser por alimentos o poca hidratación. (Stanford Medicine)" },
      { emoji: "🔶", label: "Anaranjado rojizo", severity: "watch", note: "Podría indicar sangre. Observa y consulta si persiste. (Stanford Medicine)" },
      { emoji: "🚨", label: "Café / Rojizo", severity: "alert", note: "Posible sangre. Consulta con tu pediatra. (Mayo Clinic, Stanford)" },
    ],
  },
  {
    id: "poop-color",
    icon: "💩",
    title: "Color de la popó",
    desc: "La popó del bebé cambia de color según la edad, alimentación y salud. (Mayo Clinic, NHS, AAP)",
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
    desc: "Basado en la Escala de Bristol (tipos 1-7) adaptada para bebés. (Bristol Stool Chart, NHS)",
    legend: [
      { emoji: "💎", label: "Dura", severity: "alert", note: "Bristol tipo 1-2: bolitas duras, estreñimiento. Ofrece más líquidos, consulta si persiste. (NHS, Bristol Stool Chart)" },
      { emoji: "🍫", label: "Sólida", severity: "normal", note: "Bristol tipo 3-4: formada pero blanda. (Bristol Stool Chart)" },
      { emoji: "🥜", label: "Pastosa", severity: "normal", note: "Bristol tipo 5: tipo mantequilla de maní, común en bebés. (NHS, Bristol Stool Chart)" },
      { emoji: "💧", label: "Líquida", severity: "info", note: "Bristol tipo 6: semilíquida. En lactancia materna puede ser normal. Si es muy frecuente o acuosa, pasa al nivel 5. (Bristol Stool Chart, NHS)" },
      { emoji: "🌊", label: "Acuosa", severity: "alert", note: "Bristol tipo 7: diarrea. Vigila signos de deshidratación (boca seca, menos pañales mojados). (NHS, Bristol Stool Chart, MedlinePlus)" },
    ],
  },
  {
    id: "sleep",
    icon: "😴",
    title: "Sueño y ventanas de sueño",
    desc: "Las ventanas de sueño (wake windows) son el tiempo que el bebé está despierto entre siestas. Se calculan automáticamente entre sesiones de sueño registradas. (Cleveland Clinic, AAP, National Sleep Foundation)",
    legend: [
      { emoji: "👶", label: "0-4 semanas", severity: "normal", note: "Ventana: 35-60 min · 6+ siestas · 15-18h sueño total. Apenas da tiempo a comer y cambio de pañal. (Cleveland Clinic, NSF)" },
      { emoji: "👶", label: "1-2 meses", severity: "normal", note: "Ventana: 60-90 min · 4-5 siestas · 15-18h sueño total. Empieza a tener momentos más alerta. (Cleveland Clinic, AAP)" },
      { emoji: "👶", label: "3-4 meses", severity: "normal", note: "Ventana: 75-120 min (1.25-2h) · 3-4 siestas · 14-15h total. Llega la regresión de sueño de 4 meses. (Cleveland Clinic, Mustela USA)" },
      { emoji: "👶", label: "5-7 meses", severity: "normal", note: "Ventana: 2-3h · 3 siestas · 14-15h total. La primera ventana del día es la más corta. (Cleveland Clinic, Sleep.com)" },
      { emoji: "👶", label: "7-10 meses", severity: "normal", note: "Ventana: 2.5-3.5h · 2-3 siestas · 13-14h total. Transición a 2 siestas. (Cleveland Clinic, Dr. Craig Canapari - Yale Pediatric Sleep)" },
      { emoji: "👶", label: "11-14 meses", severity: "normal", note: "Ventana: 3-4.5h · 1-2 siestas · 12-14h total. La ventana pre-sueño nocturno es la más larga. (National Sleep Foundation)" },
      { emoji: "👶", label: "14-24 meses", severity: "normal", note: "Ventana: 4-6h · 1 siesta · 12-14h total. Transición a 1 siesta al día. (AAP, NSF)" },
      { emoji: "👶", label: "2+ años", severity: "normal", note: "Ventana: 5-7h si aún siesta · 0-1 siesta · 11-13h total. Algunos dejan la siesta entre 2.5-5 años. (AAP, National Sleep Foundation)" },
    ],
  },
  {
    id: "growth",
    icon: "📏",
    title: "Crecimiento",
    desc: "Curvas de la Organización Mundial de la Salud (OMS) para peso, talla y perímetro cefálico. (WHO Multicentre Growth Reference Study - MGRS)",
    legend: [
      { emoji: "⚖️", label: "Peso/edad", severity: "normal", note: "Refleja nutrición a corto y largo plazo. Percentiles OMS de 0-5 años. (OMS MGRS, 2006)" },
      { emoji: "📐", label: "Talla/edad", severity: "normal", note: "Refleja crecimiento lineal. La talla baja puede indicar problemas de nutrición crónica. (OMS MGRS, 2006)" },
      { emoji: "📏", label: "CC/edad", severity: "normal", note: "Perímetro cefálico. Refleja crecimiento cerebral. Los primeros 24 meses son críticos. (OMS MGRS, 2006)" },
      { emoji: "📊", label: "IMC/edad", severity: "normal", note: "Índice de masa corporal. Útil para detectar riesgo de obesidad o desnutrición. (OMS MGRS, 2006)" },
      { emoji: "📸", label: "Fotos de crecimiento", severity: "normal", note: "Tomar fotos en cada medición ayuda a visualizar el progreso. Misma posición, mismo fondo para comparar. (AAP)" },
    ],
  },
  {
    id: "feeding",
    icon: "🥣",
    title: "Alimentación complementaria",
    desc: "Introducción de sólidos a partir de los 6 meses. Basado en OMS, ESPGHAN y AAP.",
    legend: [
      { emoji: "🍎", label: "Frutas", severity: "normal", note: "Manzana 🪨, pera 💧, plátano 🪨, papaya 💧, aguacate, mango. Introducir una a la vez. (OMS, AAP)" },
      { emoji: "🥕", label: "Verduras", severity: "normal", note: "Zanahoria 🪨, calabaza, papa 🪨, camote 💧, brócoli, chayote. Cocer al vapor sin sal. (ESPGHAN, AAP)" },
      { emoji: "🥩", label: "Proteínas", severity: "normal", note: "Pollo, res, pescado blanco, huevo 🥜, tofu. Bien cocidos y desmenuzados. (ESPGHAN, AAP)" },
      { emoji: "🌾", label: "Cereales", severity: "normal", note: "Arroz 🪨, avena, quinoa, maíz. Preferir integrales. Sin gluten hasta introducción controlada. (ESPGHAN)" },
      { emoji: "🧀", label: "Lácteos", severity: "normal", note: "Yogur natural, queso fresco. La leche de vaca como bebida principal hasta después del año. (ESPGHAN, AAP)" },
      { emoji: "🫘", label: "Legumbres", severity: "normal", note: "Frijol, lenteja, garbanzo. Remojar y cocer bien. Excelente fuente de hierro. (OMS, AAP)" },
      { emoji: "🥜", label: "Alérgenos mayores", severity: "watch", note: "🥚Huevo · 🥛Leche · 🥜Cacahuate · 🌰Nueces · 🐟Pescado · 🦐Mariscos · 🌾Trigo · 🫘Soya. Introducir uno a la vez, esperar 3-5 días antes del siguiente. (ESPGHAN, AAP, AAAAI)" },
    ],
  },
  {
    id: "allergens",
    icon: "🥜",
    title: "Guía de alérgenos",
    desc: "La introducción temprana (desde los 6 meses) de alérgenos puede reducir el riesgo de alergias. Basado en estudios LEAP, EAT y guías ESPGHAN/AAP.",
    legend: [
      { emoji: "🥚", label: "Huevo", severity: "info", note: "Cocido completo (no solo clara). Comenzar con yema bien cocida. (LEAP Study, 2015; ESPGHAN)" },
      { emoji: "🥛", label: "Leche", severity: "info", note: "Yogur o queso pasteurizado. Leche de vaca como bebida hasta después de 12 meses. (ESPGHAN, AAP)" },
      { emoji: "🥜", label: "Cacahuate", severity: "info", note: "Mantequilla de cacahuate diluida (no cacahuates enteros = riesgo asfixia). (LEAP Study - NEJM 2015)" },
      { emoji: "🌰", label: "Nueces y semillas", severity: "info", note: "Molidas o en pasta. Almendra, nuez, pistache, ajonjolí. (EAT Study, 2016)" },
      { emoji: "🐟", label: "Pescado", severity: "info", note: "Blanco primero (tilapia, robalo). Sin espinas. (AAP)" },
      { emoji: "🦐", label: "Mariscos", severity: "info", note: "Bien cocidos. Camarón, langosta. (AAAAI)" },
      { emoji: "🌾", label: "Trigo", severity: "info", note: "Pan, pasta, cereal de trigo. No confundir con alergia al gluten. (ESPGHAN)" },
      { emoji: "🫘", label: "Soya", severity: "info", note: "Tofu, leche de soya, edamame. Menos común como alérgeno. (AAAAI)" },
    ],
  },
  {
    id: "dehydration",
    icon: "💧",
    title: "Signos de deshidratación",
    desc: "Saber identificar cuándo un bebé necesita más líquidos. (MedlinePlus, HealthyChildren.org/AAP)",
    legend: [
      { emoji: "💧", label: "Pañales mojados", severity: "watch", note: "Menos de 4-6 pañales mojados al día es señal de alerta. (MedlinePlus)" },
      { emoji: "👄", label: "Boca y labios secos", severity: "watch", note: "Lengua pegajosa, labios agrietados. (MedlinePlus)" },
      { emoji: "😢", label: "Llanto sin lágrimas", severity: "watch", note: "Si el bebé llora y no salen lágrimas, puede estar deshidratado. (MedlinePlus, AAP)" },
      { emoji: "🤱", label: "Fontanela hundida", severity: "alert", note: "La mollera (fontanela) hundida es signo de deshidratación moderada-severa. Contacta a tu pediatra. (AAP, MedlinePlus)" },
      { emoji: "😴", label: "Letargo / somnolencia", severity: "alert", note: "Bebé muy dormido, difícil de despertar, poca energía. Busca atención médica. (MedlinePlus, AAP)" },
    ],
  },
];

const SOURCES = [
  // Popó y pipí
  { label: "Mayo Clinic — Guía de color de popó en bebés", url: "https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/expert-answers/baby-poop/faq-20057971" },
  { label: "NHS — Popó y pipí del bebé (colores y consistencias)", url: "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/baby-poo-and-wee/" },
  { label: "Stanford Medicine — Color de orina en recién nacidos", url: "https://www.stanfordchildrens.org/en/topic/default?id=newborn-urine-color-90-P02683" },
  { label: "Bristol Stool Chart — Escala de consistencia (tipos 1-7)", url: "https://en.wikipedia.org/wiki/Bristol_stool_scale" },
  { label: "HealthyChildren.org (AAP) — Popó del bebé: qué es normal", url: "https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/Bowel-Movements.aspx" },
  { label: "MedlinePlus — Deshidratación en bebés", url: "https://medlineplus.gov/ency/article/000982.htm" },
  // Sueño
  { label: "Cleveland Clinic — Wake windows by age (Dr. Barrett)", url: "https://health.clevelandclinic.org/wake-windows-by-age" },
  { label: "National Sleep Foundation — Duración de sueño por edad", url: "https://www.sleepfoundation.org/baby-sleep" },
  { label: "HealthyChildren.org (AAP) — Guía de sueño del bebé", url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/default.aspx" },
  { label: "Sleep.com — Wake windows: guía completa", url: "https://www.sleep.com/sleep-health/newborn-wake-windows" },
  { label: "Dr. Craig Canapari (Yale) — ¿Funcionan los wake windows?", url: "https://drcraigcanapari.com/do-wake-windows-help-kids-nap-better/" },
  // Crecimiento
  { label: "OMS — Curvas de crecimiento (MGRS 2006)", url: "https://www.who.int/tools/child-growth-standards" },
  { label: "HealthyChildren.org (AAP) — Cómo crece el bebé", url: "https://www.healthychildren.org/English/ages-stages/baby/Pages/How-Your-Baby-Grows.aspx" },
  // Alimentación complementaria
  { label: "ESPGHAN — Guía de alimentación complementaria", url: "https://www.espghan.org/guidelines" },
  { label: "OMS — Alimentación del lactante y niño pequeño", url: "https://www.who.int/es/news-room/fact-sheets/detail/infant-and-young-child-feeding" },
  { label: "AAAAl — Guía de introducción de alérgenos", url: "https://www.aaaai.org/Tools-for-the-Public/Conditions-Library/Allergies/food-allergy-primary-prevention" },
  { label: "LEAP Study (NEJM) — Introducción temprana de cacahuate", url: "https://www.nejm.org/doi/full/10.1056/NEJMoa1414850" },
  { label: "EAT Study (NEJM) — Introducción temprana de alérgenos múltiples", url: "https://www.nejm.org/doi/full/10.1056/NEJMoa1514210" },
];

const SEVERITY_STYLES: Record<string, { icon: string; label: string }> = {
  normal: { icon: "✅", label: "Normal" },
  info: { icon: "ℹ️", label: "Precaución" },
  watch: { icon: "👀", label: "Observa" },
  alert: { icon: "🚨", label: "Alerta" },
};

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
