import type {
  AppleHealthModuleEvents,
  AuthorizationResult,
  HealthKitPermissions,
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  ActivitySummary,
} from './AppleHealth.types';

type Subscription = { remove: () => void };

const unavailableResult: AuthorizationResult = {
  status: 'notDetermined',
  permissions: { read: {}, write: {} },
};

const AppleHealthModule = {
  isAvailable(): boolean {
    return false;
  },

  async requestAuthorization(_permissions: HealthKitPermissions): Promise<AuthorizationResult> {
    return unavailableResult;
  },

  async getAuthorizationStatus(_dataTypes: string[]): Promise<Record<string, string>> {
    return {};
  },

  async queryActivitySummary(_startDate: string, _endDate: string): Promise<ActivitySummary[]> {
    return [];
  },

  async getDateOfBirth(): Promise<string | null> {
    return null;
  },

  async getBiologicalSex(): Promise<string | null> {
    return null;
  },

  async getBloodType(): Promise<string | null> {
    return null;
  },

  async getFitzpatrickSkinType(): Promise<number | null> {
    return null;
  },

  async getWheelchairUse(): Promise<boolean | null> {
    return null;
  },

  async subscribeToChanges(
    _typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier
  ): Promise<string> {
    return '';
  },

  async unsubscribe(_subscriptionId: string): Promise<void> {},

  async enableBackgroundDelivery(
    _typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier,
    _frequency: 'immediate' | 'hourly' | 'daily'
  ): Promise<boolean> {
    return false;
  },

  async disableBackgroundDelivery(
    _typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier
  ): Promise<boolean> {
    return false;
  },

  async disableAllBackgroundDelivery(): Promise<boolean> {
    return false;
  },

  async deleteSamples(
    _typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier,
    _startDate: string,
    _endDate: string
  ): Promise<boolean> {
    return false;
  },

  addListener<K extends keyof AppleHealthModuleEvents>(
    _eventName: K,
    _listener: AppleHealthModuleEvents[K]
  ): Subscription {
    return { remove: () => {} };
  },

  removeListener<K extends keyof AppleHealthModuleEvents>(
    _eventName: K,
    _listener: AppleHealthModuleEvents[K]
  ): void {},

  removeAllListeners<K extends keyof AppleHealthModuleEvents>(_eventName: K): void {},
};

export default AppleHealthModule;
