import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useCreateCatalogItem, useUpdateCatalogItem, useDeleteCatalogItem } from "@/src/hooks/useCatalogItems";
import { USER_CATEGORIES, getCategoryEmoji, getCategoryLabel } from "@/src/utils/categories";
import { units, getUnit } from "@/src/units/registry";
import type { EventMetric } from "@/src/units/types";
import type { UnitDimension } from "@/src/units/types";
import type { CatalogItem } from "@/src/db/schema";

function generateMetricId() {
  return "m_" + Math.random().toString(36).substring(2, 8);
}

const DIMENSION_LABELS: Record<UnitDimension, string> = {
  mass: "Masa",
  volume: "Volumen",
  temperature: "Temperatura",
  length: "Longitud",
  dimensionless: "Sin dimensión",
};

function parseMetrics(json: string | null): EventMetric[] {
  if (!json) return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p : []; } catch { return []; }
}

export function ItemEditorModal({
  visible,
  onClose,
  onSelect,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (itemId: string) => void;
  item?: CatalogItem | null;  // if provided, edit mode
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const create = useCreateCatalogItem();
  const update = useUpdateCatalogItem();
  const remove = useDeleteCatalogItem();

  const isEdit = !!item;

  const [emoji, setEmoji] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [metrics, setMetrics] = useState<EventMetric[]>([]);
  const [showUnitPicker, setShowUnitPicker] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (item) {
        setEmoji(item.emoji ?? "");
        setName(item.name);
        setCategory(item.category);
        setMetrics(parseMetrics(item.metrics));
      } else {
        setEmoji("");
        setName("");
        setCategory("other");
        setMetrics([]);
      }
    }
  }, [visible, item]);

  const isFormValid = emoji.trim().length > 0 && name.trim().length > 0;
  const isPending = create.isPending || update.isPending;

  const addMetric = useCallback(() => {
    setMetrics((prev) => [
      ...prev,
      { id: generateMetricId(), name: "", unitId: "count", scaleMin: 0, scaleMax: 100 },
    ]);
  }, []);

  const removeMetricCb = useCallback((id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMetric = useCallback((id: string, patch: Partial<EventMetric>) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const handleSave = () => {
    if (!isFormValid || isPending) return;
    const filteredMetrics = metrics.filter((m) => m.name.trim().length > 0);

    if (isEdit && item) {
      update.mutate(
        {
          id: item.id,
          emoji: emoji.trim(),
          name: name.trim(),
          metrics: filteredMetrics.length > 0 ? filteredMetrics : [],
        },
        {
          onSuccess: () => {
            onSelect(item.id);
            onClose();
          },
        },
      );
    } else {
      create.mutate(
        {
          category,
          name: name.trim(),
          emoji: emoji.trim(),
          metrics: filteredMetrics.length > 0 ? filteredMetrics : undefined,
        },
        {
          onSuccess: (id) => {
            onSelect(id);
            onClose();
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(
      "Eliminar item",
      `¿Eliminar "${item.name}" y todas sus plantillas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            // Get child ids too
            const { getDb } = await import('@/src/db/client');
            const { catalogItems } = await import('@/src/db/schema');
            const { eq } = await import('drizzle-orm');
            const children = await getDb().select().from(catalogItems).where(eq(catalogItems.parentId, item.id));
            const ids = [item.id, ...children.map((c: CatalogItem) => c.id)];
            await remove.mutateAsync(ids);
            setDeleting(false);
            onClose();
          },
        },
      ],
    );
  };

  const unitsForPicker = Object.values(units);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
          <ScrollView
            style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" }}
            contentContainerStyle={{ padding: 24, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "900", fontSize: 18, color: c.textBody }}>
                {isEdit ? "Editar Item" : "Nuevo Item"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 24, color: c.textDim }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Emoji + Name */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 64 }}>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
                  Emoji
                </Text>
                <TextInput
                  value={emoji}
                  onChangeText={setEmoji}
                  placeholder="✨"
                  maxLength={2}
                  style={{
                    backgroundColor: c.card, borderRadius: 12, padding: 12,
                    fontSize: 24, textAlign: "center", color: c.textBody,
                    minHeight: 48,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
                  Nombre
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Cólico"
                  placeholderTextColor={c.textDim}
                  autoFocus={!isEdit}
                  style={{
                    backgroundColor: c.card, borderRadius: 12, padding: 12,
                    fontSize: 15, color: c.textBody, minHeight: 48,
                  }}
                />
              </View>
            </View>

            {/* Category (only in create mode) */}
            {!isEdit && (
              <View>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>
                  Categoría
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {USER_CATEGORIES.map((catDef) => (
                    <TouchableOpacity
                      key={catDef.id}
                      onPress={() => setCategory(catDef.id)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                        borderWidth: 1.5,
                        backgroundColor: category === catDef.id ? c.accent + "20" : c.card,
                        borderColor: category === catDef.id ? c.accent : "transparent",
                      }}
                    >
                      <Text style={{
                        fontSize: 12, fontWeight: "800",
                        color: category === catDef.id ? c.accent : c.textMuted,
                      }}>
                        {getCategoryEmoji(catDef.id)} {getCategoryLabel(catDef.id)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Metrics */}
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 11, textTransform: "uppercase" }}>
                  Métricas
                </Text>
                <TouchableOpacity onPress={addMetric} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}>
                  <Text style={{ color: c.accent, fontWeight: "700", fontSize: 13 }}>
                    + Añadir
                  </Text>
                </TouchableOpacity>
              </View>

              {metrics.length === 0 && (
                <Text style={{ color: c.textDim, fontSize: 13, fontStyle: "italic" }}>
                  Sin métricas. Los eventos serán solo nota.
                </Text>
              )}

              {metrics.map((metric, idx) => (
                <View
                  key={metric.id}
                  style={{
                    backgroundColor: c.card, borderRadius: 12, padding: 12,
                    marginBottom: 8, gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: c.textDim, fontSize: 11, fontWeight: "700" }}>
                      #{idx + 1}
                    </Text>
                    <TextInput
                      value={metric.name}
                      onChangeText={(v) => updateMetric(metric.id, { name: v })}
                      placeholder="Nombre de la métrica"
                      placeholderTextColor={c.textDim}
                      style={{
                        flex: 1, backgroundColor: c.surface, borderRadius: 8,
                        padding: 8, fontSize: 13, color: c.textBody, minHeight: 36,
                      }}
                    />
                    <TouchableOpacity onPress={() => removeMetricCb(metric.id)} style={{ minHeight: 36, justifyContent: "center" }}>
                      <Text style={{ color: c.textDim, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Unit Picker */}
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600" }}>Unidad:</Text>
                    <View style={{ position: "relative", flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => setShowUnitPicker(showUnitPicker === metric.id ? null : metric.id)}
                        style={{
                          backgroundColor: c.surface, borderRadius: 8, padding: 8,
                          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                          minHeight: 36,
                        }}
                      >
                        <Text style={{ color: c.textBody, fontSize: 13 }}>
                          {getUnit(metric.unitId)?.symbol
                            ? `${getUnit(metric.unitId)?.name} (${getUnit(metric.unitId)?.symbol})`
                            : getUnit(metric.unitId)?.name ?? metric.unitId}
                        </Text>
                        <Text style={{ color: c.textDim, fontSize: 10 }}>▼</Text>
                      </TouchableOpacity>

                      {showUnitPicker === metric.id && (
                        <View style={{
                          position: "absolute", top: 40, left: 0, right: 0, zIndex: 100,
                          backgroundColor: c.surface, borderRadius: 12,
                          borderWidth: 1, borderColor: c.border,
                          maxHeight: 240, shadowOpacity: 0.15, shadowRadius: 12,
                          elevation: 10,
                        }}>
                          <ScrollView nestedScrollEnabled bounces={false}>
                            {(["mass", "volume", "temperature", "length", "dimensionless"] as UnitDimension[]).map(
                              (dim) => {
                                const dimUnits = unitsForPicker.filter((u) => u.dimension === dim);
                                if (dimUnits.length === 0) return null;
                                return (
                                  <View key={dim}>
                                    <Text style={{
                                      color: c.textMuted, fontSize: 10, fontWeight: "700",
                                      textTransform: "uppercase", paddingHorizontal: 12,
                                      paddingTop: 10, paddingBottom: 4,
                                    }}>
                                      {DIMENSION_LABELS[dim]}
                                    </Text>
                                    {dimUnits.map((u) => (
                                      <TouchableOpacity
                                        key={u.id}
                                        onPress={() => {
                                          updateMetric(metric.id, { unitId: u.id });
                                          setShowUnitPicker(null);
                                        }}
                                        style={{
                                          flexDirection: "row", alignItems: "center",
                                          justifyContent: "space-between",
                                          paddingHorizontal: 12, paddingVertical: 10,
                                          backgroundColor: metric.unitId === u.id ? c.accent + "15" : "transparent",
                                        }}
                                      >
                                        <Text style={{
                                          color: c.textBody, fontSize: 13,
                                          fontWeight: metric.unitId === u.id ? "700" : "400",
                                        }}>
                                          {u.name}
                                        </Text>
                                        <Text style={{ color: c.textDim, fontSize: 12 }}>
                                          {u.symbol || "—"}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                );
                              },
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Scale (optional) */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "600", marginBottom: 2 }}>
                        Mín
                      </Text>
                      <TextInput
                        value={metric.scaleMin?.toString() ?? "0"}
                        onChangeText={(v) => updateMetric(metric.id, { scaleMin: parseFloat(v) || 0 })}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={c.textDim}
                        style={{
                          backgroundColor: c.surface, borderRadius: 8, padding: 8,
                          fontSize: 13, color: c.textBody, minHeight: 36,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "600", marginBottom: 2 }}>
                        Máx
                      </Text>
                      <TextInput
                        value={metric.scaleMax?.toString() ?? "100"}
                        onChangeText={(v) => updateMetric(metric.id, { scaleMax: parseFloat(v) || 0 })}
                        keyboardType="decimal-pad"
                        placeholder="100"
                        placeholderTextColor={c.textDim}
                        style={{
                          backgroundColor: c.surface, borderRadius: 8, padding: 8,
                          fontSize: 13, color: c.textBody, minHeight: 36,
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Delete button (edit mode only) */}
            {isEdit && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={{ alignItems: "center", paddingVertical: 8, minHeight: 44 }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FF5C5C" />
                ) : (
                  <Text style={{ color: "#FF5C5C", fontWeight: "600", fontSize: 13 }}>
                    Eliminar item y plantillas
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: c.card, alignItems: "center", minHeight: 48,
                }}
              >
                <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 15 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!isFormValid || isPending}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  backgroundColor: isFormValid ? c.accent : c.textDim + "40",
                  alignItems: "center", minHeight: 48,
                }}
              >
                {isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: isFormValid ? "#FFF" : c.textMuted, fontWeight: "800", fontSize: 15 }}>
                    {isEdit ? "Guardar cambios" : "Guardar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
