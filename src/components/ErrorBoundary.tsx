import { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  children: ReactNode;
  onError?: (error: Error, stackTrace?: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error("[ErrorBoundary]", error.message, errorInfo?.componentStack ?? "");
    this.props.onError?.(error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
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
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🌙</Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 17,
              fontWeight: "900",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Algo salió mal
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              fontWeight: "600",
              textAlign: "center",
              marginBottom: 24,
              maxWidth: 280,
            }}
          >
            Ocurrió un error inesperado. Podés reintentar o volver a abrir la app.
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 99,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15 }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
