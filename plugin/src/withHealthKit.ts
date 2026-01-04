import { ConfigPlugin, withPlugins } from '@expo/config-plugins';
import { withHealthKitEntitlements } from './withHealthKitEntitlements';
import { withHealthKitInfoPlist } from './withHealthKitInfoPlist';
import { withHealthKitBackgroundModes } from './withHealthKitBackgroundModes';
import { HealthKitPluginProps } from './index';

export const withHealthKit: ConfigPlugin<HealthKitPluginProps> = (config, props) => {
  return withPlugins(config, [
    [withHealthKitEntitlements, props],
    [withHealthKitInfoPlist, props],
    [withHealthKitBackgroundModes, props],
  ]);
};
