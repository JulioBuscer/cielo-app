import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeScreen } from '@/src/components/layout/SafeScreen';
import { BigButton } from '@/src/components/ui/BigButton';
import { useActiveBaby } from '@/src/hooks/useBaby';
import { useActiveProfile } from '@/src/hooks/useProfile';
import { useLastDiaperLog } from '@/src/hooks/useDiaperLogs';
import { useLastGrowthLog } from '@/src/hooks/useGrowthLogs';
import { shareDiaperReport, shareGrowthReport } from '@/src/services/reportGenerator';

export default function GenerateReport() {
  const { data: baby } = useActiveBaby();
  const { data: profile } = useActiveProfile();
  const { data: diaperLog } = useLastDiaperLog(baby?.id);
  const { data: growthLog } = useLastGrowthLog(baby?.id);

  const handleShareDiaper = async () => {
    if (baby && profile && diaperLog) {
      await shareDiaperReport(diaperLog, baby, profile);
    }
  };

  const handleShareGrowth = async () => {
    if (baby && profile && growthLog) {
      await shareGrowthReport(growthLog, baby, profile);
    }
  };

  return (
    <SafeScreen>
      <Text className="text-textPrimary text-3xl font-bold mb-2 pt-2">📋 Reportes</Text>
      <Text className="text-textMuted text-base mb-8">
        Comparte los últimos datos de {baby?.name ?? 'tu bebé'} por WhatsApp.
      </Text>

      <View className="gap-4">
        <View className="bg-bgCard p-5 rounded-2xl">
           <Text className="text-white font-bold mb-2 text-lg">Reporte de Pañal</Text>
           <Text className="text-textMuted mb-4">Envía resumen del último pañal incluyendo foto y alertas médicas.</Text>
           <BigButton 
             label="Compartir Pañal" 
             variant="primary"
             disabled={!diaperLog} 
             onPress={handleShareDiaper} 
           />
        </View>

        <View className="bg-bgCard p-5 rounded-2xl">
           <Text className="text-white font-bold mb-2 text-lg">Reporte de Crecimiento</Text>
           <Text className="text-textMuted mb-4">Envía las últimas medidas registradas para tu pediatra.</Text>
           <BigButton 
             label="Compartir Crecimiento" 
             variant="growth"
             disabled={!growthLog} 
             onPress={handleShareGrowth} 
           />
        </View>
      </View>
    </SafeScreen>
  );
}
