import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  ACTIVE_PROFILE_ID: 'active_profile_id',
  ACTIVE_BABY_ID: 'active_baby_id',
  ONBOARDING_DONE: 'onboarding_done',
  MIGRATION_MEASUREMENT_DONE: 'migration_measurement_done',
  PEE_INTENSITY_CONFIG: 'pee_intensity_config',
  POOP_INTENSITY_CONFIG: 'poop_intensity_config',
  PEE_HEALTH_CONFIG: 'pee_health_config',
  POOP_HEALTH_CONFIG: 'poop_health_config',
  POOP_CONSISTENCY_CONFIG: 'poop_consistency_config',
  THEME_ACTIVE_ID: 'theme_active_id',
  THEME_CUSTOM_THEMES: 'theme_custom_themes',
} as const;

export const DIAPER_CONFIG_KEYS = [
  KEYS.PEE_INTENSITY_CONFIG,
  KEYS.POOP_INTENSITY_CONFIG,
  KEYS.PEE_HEALTH_CONFIG,
  KEYS.POOP_HEALTH_CONFIG,
  KEYS.POOP_CONSISTENCY_CONFIG,
] as const;

export const SESSION_KEYS = [
  KEYS.ACTIVE_PROFILE_ID,
  KEYS.ACTIVE_BABY_ID,
  KEYS.ONBOARDING_DONE,
] as const;

export function getProfileId(): Promise<string> {
  return AsyncStorage.getItem(KEYS.ACTIVE_PROFILE_ID).then(r => r ?? '');
}

export function setProfileId(id: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.ACTIVE_PROFILE_ID, id);
}

export function getBabyId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_BABY_ID);
}

export function setBabyId(id: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.ACTIVE_BABY_ID, id);
}

export function getOnboardingDone(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
}

export function setOnboardingDone(): Promise<void> {
  return AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
}

export function getMigrationDone(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.MIGRATION_MEASUREMENT_DONE);
}

export function setMigrationDone(): Promise<void> {
  return AsyncStorage.setItem(KEYS.MIGRATION_MEASUREMENT_DONE, 'true');
}

export function getDiaperConfig(key: typeof DIAPER_CONFIG_KEYS[number]): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export function setDiaperConfig(key: typeof DIAPER_CONFIG_KEYS[number], value: string): Promise<void> {
  return AsyncStorage.setItem(key, value);
}

export function resetDiaperConfigs(): Promise<void[]> {
  return Promise.all(DIAPER_CONFIG_KEYS.map((k) => AsyncStorage.removeItem(k)));
}

export function clearSessionData(): Promise<void> {
  return AsyncStorage.multiRemove([...SESSION_KEYS]);
}
