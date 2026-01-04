import { ConfigPlugin, withEntitlementsPlist } from '@expo/config-plugins';
import { HealthKitPluginProps } from './index';

export const withHealthKitEntitlements: ConfigPlugin<HealthKitPluginProps> = (
  config,
  { isClinicalDataEnabled = false, backgroundDelivery = false }
) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true;

    const accessArray: string[] = [];
    if (isClinicalDataEnabled) {
      accessArray.push('health-records');
    }
    if (accessArray.length > 0) {
      config.modResults['com.apple.developer.healthkit.access'] = accessArray;
    }

    if (backgroundDelivery) {
      config.modResults['com.apple.developer.healthkit.background-delivery'] = true;
    }

    return config;
  });
};
