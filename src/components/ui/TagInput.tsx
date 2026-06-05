import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useSearchTags } from "@/src/hooks/useTags";

export function TagInput({
  babyId,
  tags: selectedTags,
  onTagsChange,
}: {
  babyId?: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { data: suggestions = [], isLoading } = useSearchTags(babyId ?? "", input);

  const addTag = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || selectedTags.includes(trimmed)) return;
    onTagsChange([...selectedTags, trimmed]);
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (idx: number) => {
    onTagsChange(selectedTags.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    addTag(input);
  };

  const filteredSuggestions = input.trim()
    ? suggestions.filter((s) => !selectedTags.includes(s.name))
    : [];

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>
        🏷️ Etiquetas
      </Text>

      <View style={{ position: "relative" }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: c.elevated, borderRadius: 12,
          paddingHorizontal: 12, minHeight: 44,
        }}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setShowSuggestions(true);
            }}
            onSubmitEditing={handleSubmit}
            onFocus={() => setShowSuggestions(true)}
            returnKeyType="done"
            placeholder="Escribe y enter para agregar..."
            placeholderTextColor={c.textDim}
            style={{ flex: 1, fontSize: 14, color: c.textBody, paddingVertical: 8 }}
          />
          {input.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ minHeight: 36, justifyContent: "center", paddingLeft: 8 }}
            >
              <Text style={{ color: c.accent, fontSize: 18, fontWeight: "700" }}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {showSuggestions && input.trim().length > 0 && filteredSuggestions.length > 0 && (
          <View style={{
            position: "absolute", top: 48, left: 0, right: 0, zIndex: 100,
            backgroundColor: c.surface, borderRadius: 12,
            borderWidth: 1, borderColor: c.border,
            maxHeight: 200, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
          }}>
            <ScrollView nestedScrollEnabled bounces={false} keyboardShouldPersistTaps="handled">
              {isLoading && (
                <View style={{ padding: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" />
                </View>
              )}
              {filteredSuggestions.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => addTag(s.name)}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: c.textBody, fontSize: 14 }}>{s.name}</Text>
                  <Text style={{ color: c.textDim, fontSize: 11 }}>
                    {s.usageCount ?? 0}×
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {selectedTags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {selectedTags.map((t, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => removeTag(i)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: c.elevated, borderRadius: 99,
                paddingVertical: 4, paddingHorizontal: 10,
              }}
            >
              <Text style={{ color: c.textBody, fontWeight: "600", fontSize: 13 }}>{t}</Text>
              <Text style={{ color: c.textDim, fontSize: 11 }}>✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
