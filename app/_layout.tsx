import "../global.css";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { runMigrations } from "@/src/db/client";
import packageJson from "@/package.json";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // runMigrations() abre la DB y crea/actualiza las tablas.
    // Solo cuando termina (setReady(true)) se monta <Slot> y los hooks
    // pueden llamar a getDb() de forma segura.
    runMigrations()
      .then(() => setReady(true))
      .catch((e: any) => {
        console.error("[Cielo] Migration error:", e);
        setError(e?.message ?? "Error al iniciar base de datos");
      });
  }, []);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FF8AB3",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          Error al iniciar
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FF8AB3",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🌙</Text>
        <ActivityIndicator color="#FFFFFF" size="large" />
        <Text
          style={{
            color: "rgba(255,255,255,0.85)",
            marginTop: 12,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          Iniciando Cielo...
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.85)",
            marginTop: 12,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          Version {packageJson.version}
        </Text>
      </View>
    );
  }

  // QueryClientProvider solo se monta DESPUÉS de que la DB está lista
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
