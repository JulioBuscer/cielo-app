const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Cambia este número cada vez que necesites invalidar el cache de Metro
// sin depender de --clear (útil cuando el cache de Windows Temp persiste)
config.cacheVersion = "cielo-v3";

module.exports = withNativeWind(config, { input: "./global.css" });
