import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { calcPercentile, getMetricLabel, getMetricUnit } from "@/src/growth/percentiles";
import type { Sex, GrowthMetric } from "@/src/growth/whoData";
import { formatAgeMonths } from "@/src/utils/formatAgeMonths";

interface Props {
  visible: boolean;
  onClose: () => void;
  sex: Sex;
  metric: GrowthMetric;
  ageMonths: number;
  value: number;
}

function fm(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(4);
  if (Math.abs(n) >= 0.01) return n.toFixed(5);
  return n.toFixed(6);
}

export function PercentileDetailModal({ visible, onClose, sex, metric, ageMonths, value }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const result = calcPercentile(sex, metric, ageMonths, value);
  const { row, z, percentile } = result;
  const unit = getMetricUnit(metric);
  const label = getMetricLabel(metric);

  if (!row) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1} onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
            <Text style={{ color: c.textMuted, textAlign: "center" }}>No hay datos LMS para esta edad</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  const sexLabel = sex === "male" ? "niño" : "niña";
  const isLZero = Math.abs(row.L) < 0.001;
  const xOverM = value / row.M;
  const lTimesS = row.L * row.S;
  const pow = isLZero ? 0 : Math.pow(xOverM, row.L);
  const logVal = isLZero ? Math.log(xOverM) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}
        activeOpacity={1} onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, maxHeight: "85%",
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: c.textBody, textAlign: "center" }}>
              📐 Detalle Percentil
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: c.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.elevated }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Valor</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>{fm(value)} {unit}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Edad</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: c.textBody }}>{formatAgeMonths(ageMonths)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>Percentil</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: c.accent }}>P{Math.round(percentile)}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: c.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.elevated, gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody }}>
                {label} · {sexLabel} · {formatAgeMonths(ageMonths)}
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>
                Datos LMS (OMS 2006) para esta edad:
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Text style={{ fontSize: 12, color: c.textBody }}>L = <Text style={{ fontWeight: "700" }}>{fm(row.L)}</Text></Text>
                <Text style={{ fontSize: 12, color: c.textBody }}>M = <Text style={{ fontWeight: "700" }}>{fm(row.M)}</Text></Text>
                <Text style={{ fontSize: 12, color: c.textBody }}>S = <Text style={{ fontWeight: "700" }}>{fm(row.S)}</Text></Text>
              </View>
            </View>

            <View style={{ backgroundColor: c.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.elevated, gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody, fontFamily: "monospace" }}>
                Fórmula z-score:
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, fontFamily: "monospace" }}>
                {isLZero
                  ? "z = ln(x / M) / S"
                  : "z = ((x / M)^L − 1) / (L · S)"
                }
              </Text>
              <View style={{ height: 1, backgroundColor: c.elevated }} />
              {isLZero ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    x/M = {fm(value)} / {fm(row.M)} = {fm(xOverM)}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    ln({fm(xOverM)}) = {fm(logVal)}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    z = {fm(logVal)} / {fm(row.S)} = {fm(z)}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    x/M = {fm(value)} / {fm(row.M)} = {fm(xOverM)}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    (x/M)^L = {fm(xOverM)}^({fm(row.L)}) = {fm(pow)}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    (x/M)^L − 1 = {fm(pow)} − 1 = {fm(pow - 1)}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    L · S = {fm(row.L)} × {fm(row.S)} = {fm(lTimesS)}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textBody, fontFamily: "monospace" }}>
                    z = {fm(pow - 1)} / {fm(lTimesS)} = <Text style={{ fontWeight: "700" }}>{fm(z)}</Text>
                  </Text>
                </View>
              )}
            </View>

            <View style={{ backgroundColor: c.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.elevated, gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textBody, fontFamily: "monospace" }}>
                Percentil desde z:
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted, fontFamily: "monospace" }}>
                Φ(z) = CDF Normal Estándar (aprox. Hastings)
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent, fontFamily: "monospace" }}>
                Φ({fm(z)}) = P{Math.round(percentile)} (≈ {fm(percentile)}%)
              </Text>
            </View>

            <Text style={{ fontSize: 10, color: c.textMuted, textAlign: "center" }}>
              Basado en estándares OMS 2006 · P3/P15/P50/P85/P97
            </Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
