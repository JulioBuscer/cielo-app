/**
 * DateTimePicker — selector de fecha y hora sin dependencias externas.
 *
 * BUG FIX: cada campo mantiene su propio string en estado local (rawValues).
 * El display NO se re-deriva del Date prop en cada render — eso causaba que
 * al tipear "5" se mostrara "05" y el siguiente dígito se perdiera.
 * La conversión a Date ocurre en onBlur (cuando el usuario sale del campo).
 */
import { useState, useCallback } from 'react';
import { View, Text, TextInput } from 'react-native';

type Fields = 'day' | 'month' | 'year' | 'hour' | 'minute';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fieldFromDate(date: Date): Record<Fields, string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    day:    String(date.getDate()),
    month:  String(date.getMonth() + 1),
    year:   String(date.getFullYear()),
    hour:   pad(date.getHours()),
    minute: pad(date.getMinutes()),
  };
}

function applyToDate(date: Date, field: Fields, rawVal: string): Date {
  const n = parseInt(rawVal, 10);
  if (isNaN(n)) return date;
  const d = new Date(date);
  if (field === 'day')    d.setDate(clamp(n, 1, 31));
  if (field === 'month')  d.setMonth(clamp(n - 1, 0, 11));
  if (field === 'year')   d.setFullYear(clamp(n, 1900, 2100));
  if (field === 'hour')   d.setHours(clamp(n, 0, 23));
  if (field === 'minute') d.setMinutes(clamp(n, 0, 59));
  return d;
}

export function DateTimePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  // raw strings — independientes del prop value para evitar re-formateo al tipear
  const [raw, setRaw] = useState<Record<Fields, string>>(() => fieldFromDate(value));

  const handleChange = useCallback((field: Fields, text: string) => {
    // Permitir vacío (borrar) y solo dígitos
    const clean = text.replace(/[^0-9]/g, '');
    setRaw(prev => ({ ...prev, [field]: clean }));
  }, []);

  const handleBlur = useCallback((field: Fields) => {
    const val = raw[field];
    if (!val || val.trim() === '') {
      // Restaurar desde la Date actual si lo dejaron vacío
      setRaw(prev => ({ ...prev, [field]: fieldFromDate(value)[field] }));
      return;
    }
    const newDate = applyToDate(value, field, val);
    onChange(newDate);
    // Re-sync el raw con el valor aplicado (para que muestre "09" si pusieron "9" en hora etc.)
    setRaw(prev => ({ ...prev, [field]: fieldFromDate(newDate)[field] }));
  }, [raw, value, onChange]);

  const fields: { key: Fields; label: string; maxLen: number; width: number; placeholder: string }[] = [
    { key: 'day',    label: 'Día',  maxLen: 2, width: 52, placeholder: '15' },
    { key: 'month',  label: 'Mes',  maxLen: 2, width: 52, placeholder: '03' },
    { key: 'year',   label: 'Año',  maxLen: 4, width: 70, placeholder: '2025' },
    { key: 'hour',   label: 'Hora', maxLen: 2, width: 52, placeholder: '14' },
    { key: 'minute', label: 'Min',  maxLen: 2, width: 52, placeholder: '30' },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {fields.map(f => (
        <View key={f.key} style={{ alignItems: 'center', width: f.width }}>
          <Text style={{
            fontSize: 10, fontWeight: '800', color: '#9B7A88',
            marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4,
          }}>
            {f.label}
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFF0F5',
              borderRadius: 10, padding: 10,
              fontSize: 16, color: '#2D1B26',
              textAlign: 'center', fontWeight: '700',
              width: f.width,
              borderWidth: 1.5, borderColor: '#FFD6E8',
            }}
            keyboardType="number-pad"
            maxLength={f.maxLen}
            placeholder={f.placeholder}
            placeholderTextColor="#FECDD3"
            value={raw[f.key]}
            onChangeText={text => handleChange(f.key, text)}
            onBlur={() => handleBlur(f.key)}
            // Al enfocar, seleccionar todo para que el siguiente dígito reemplace
            onFocus={() => setRaw(prev => ({ ...prev, [f.key]: '' }))}
          />
        </View>
      ))}
    </View>
  );
}
