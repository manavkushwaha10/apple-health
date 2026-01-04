import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';
import { HealthKitPluginProps } from './index';

export const withHealthKitBackgroundModes: ConfigPlugin<HealthKitPluginProps> = (
  config,
  { backgroundDelivery = false }
) => {
  if (!backgroundDelivery) {
    return config;
  }

  return withInfoPlist(config, (config) => {
    const existingModes = (config.modResults['UIBackgroundModes'] as string[]) ?? [];

    if (!existingModes.includes('processing')) {
      existingModes.push('processing');
    }

    config.modResults['UIBackgroundModes'] = existingModes;

    return config;
  });
};
