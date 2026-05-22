export interface AppTheme {
  id: string;
  name: string;
  isBuiltIn: boolean;
  colors: {
    surface: string;
    card: string;
    elevated: string;
    inputBg: string;
    textBody: string;
    textMuted: string;
    textDim: string;
    textOnAccent: string;
    accent: string;
    accentStrong: string;
    accentLight: string;
    headerBg: string;
    headerText: string;
    border: string;
    bubbleOwn: string;
    bubbleOther: string;
    success: string;
    warning: string;
    danger: string;
    whatsGreen: string;
    biological: { pee: string; poop: string };
    feeding: { bottle: string; breast: string };
    growth: string;
  };
}
