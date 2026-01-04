import {
  createPermissionHook,
  PermissionResponse,
  PermissionStatus,
} from 'expo-modules-core';

export { PermissionStatus };

import AppleHealth from '../AppleHealthModule';
import type { HealthKitDataType, HealthKitPermissions } from '../AppleHealth.types';

/**
 * Options for HealthKit permission requests.
 */
export interface HealthKitPermissionOptions {
  /**
   * Data types to request read permission for.
   * @example ['stepCount', 'heartRate', 'sleepAnalysis']
   */
  read?: HealthKitDataType[];
  /**
   * Data types to request write permission for.
   * @example ['stepCount', 'bodyMass']
   */
  write?: HealthKitDataType[];
}

/**
 * Extended permission response that includes HealthKit-specific details.
 */
export interface HealthKitPermissionResponse extends PermissionResponse {
  /**
   * Detailed authorization status for each requested data type.
   */
  permissions?: {
    read: Record<string, string>;
    write: Record<string, string>;
  };
}

/**
 * Determines the overall permission status from write authorization statuses.
 *
 * NOTE: HealthKit intentionally hides read authorization status for privacy.
 * We can only reliably check write permissions. Read permission status is
 * always "notDetermined" regardless of actual user choice.
 *
 * For this reason:
 * - If no write permissions are requested, we return UNDETERMINED (can't check reads)
 * - If all write permissions are granted, we return GRANTED
 * - If any write permission is denied, we return DENIED
 */
function determineOverallStatus(
  writeStatuses: Record<string, string>,
  hasWritePermissions: boolean
): PermissionStatus {
  // If no write permissions were requested, we can't determine status
  // (HealthKit hides read permission status for privacy)
  if (!hasWritePermissions) {
    return PermissionStatus.UNDETERMINED;
  }

  const statuses = Object.values(writeStatuses);

  if (statuses.length === 0) {
    return PermissionStatus.UNDETERMINED;
  }

  const hasDenied = statuses.some((s) => s === 'sharingDenied');
  const allGranted = statuses.every((s) => s === 'sharingAuthorized');

  if (hasDenied) {
    return PermissionStatus.DENIED;
  }
  if (allGranted) {
    return PermissionStatus.GRANTED;
  }
  return PermissionStatus.UNDETERMINED;
}

/**
 * Get the current HealthKit authorization status for the specified data types.
 *
 * @param options - The read and write data types to check permissions for.
 * @returns A promise that resolves to the permission response.
 *
 * @example
 * ```typescript
 * const status = await getPermissionsAsync({
 *   read: ['stepCount', 'heartRate'],
 *   write: ['stepCount'],
 * });
 *
 * if (status.granted) {
 *   // All permissions are granted
 * }
 * ```
 */
export async function getPermissionsAsync(
  options?: HealthKitPermissionOptions
): Promise<HealthKitPermissionResponse> {
  if (!AppleHealth.isAvailable()) {
    return {
      status: PermissionStatus.DENIED,
      expires: 'never',
      granted: false,
      canAskAgain: false,
    };
  }

  const readTypes = options?.read ?? [];
  const writeTypes = options?.write ?? [];
  const allTypes = [...new Set([...readTypes, ...writeTypes])];

  if (allTypes.length === 0) {
    return {
      status: PermissionStatus.UNDETERMINED,
      expires: 'never',
      granted: false,
      canAskAgain: true,
    };
  }

  // Only fetch statuses for write types (read status is hidden by HealthKit for privacy)
  const statuses = writeTypes.length > 0
    ? await AppleHealth.getAuthorizationStatus(writeTypes)
    : {};

  const readStatuses: Record<string, string> = {};
  const writeStatuses: Record<string, string> = {};

  // Read permissions: HealthKit always returns "notDetermined" for privacy
  for (const type of readTypes) {
    readStatuses[type] = 'notDetermined';
  }
  for (const type of writeTypes) {
    writeStatuses[type] = statuses[type] ?? 'notDetermined';
  }

  const overallStatus = determineOverallStatus(writeStatuses, writeTypes.length > 0);

  return {
    status: overallStatus,
    expires: 'never',
    granted: overallStatus === PermissionStatus.GRANTED,
    canAskAgain: overallStatus !== PermissionStatus.DENIED,
    permissions: {
      read: readStatuses,
      write: writeStatuses,
    },
  };
}

/**
 * Request HealthKit authorization for the specified data types.
 *
 * This will prompt the user to grant access to the requested health data.
 *
 * @param options - The read and write data types to request permissions for.
 * @returns A promise that resolves to the permission response.
 *
 * @example
 * ```typescript
 * const result = await requestPermissionsAsync({
 *   read: ['stepCount', 'heartRate', 'sleepAnalysis'],
 *   write: ['stepCount'],
 * });
 *
 * if (result.granted) {
 *   // User granted all requested permissions
 * }
 * ```
 */
export async function requestPermissionsAsync(
  options?: HealthKitPermissionOptions
): Promise<HealthKitPermissionResponse> {
  if (!AppleHealth.isAvailable()) {
    return {
      status: PermissionStatus.DENIED,
      expires: 'never',
      granted: false,
      canAskAgain: false,
    };
  }

  const readTypes = options?.read ?? [];
  const writeTypes = options?.write ?? [];

  if (readTypes.length === 0 && writeTypes.length === 0) {
    return {
      status: PermissionStatus.UNDETERMINED,
      expires: 'never',
      granted: false,
      canAskAgain: true,
    };
  }

  const permissions: HealthKitPermissions = {
    read: readTypes,
    write: writeTypes,
  };

  const result = await AppleHealth.requestAuthorization(permissions);

  const overallStatus = determineOverallStatus(
    result.permissions.write,
    writeTypes.length > 0
  );

  return {
    status: overallStatus,
    expires: 'never',
    granted: overallStatus === PermissionStatus.GRANTED,
    canAskAgain: overallStatus !== PermissionStatus.DENIED,
    permissions: result.permissions,
  };
}

/**
 * React hook for requesting and checking HealthKit permissions.
 *
 * Uses Expo's permission hook pattern with automatic status fetching
 * and request methods.
 *
 * @example
 * ```tsx
 * function HealthPermissions() {
 *   const [status, requestPermission, getPermission] = usePermissions({
 *     read: ['stepCount', 'heartRate'],
 *     write: ['stepCount'],
 *   });
 *
 *   if (status?.granted) {
 *     return <Text>Permissions granted!</Text>;
 *   }
 *
 *   return (
 *     <Button
 *       title="Grant Health Access"
 *       onPress={requestPermission}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Auto-request on mount
 * function AutoRequestPermissions() {
 *   const [status] = usePermissions({
 *     read: ['stepCount'],
 *     request: true, // Automatically request on mount
 *   });
 *
 *   return <Text>Status: {status?.status}</Text>;
 * }
 * ```
 */
export const usePermissions = createPermissionHook<
  HealthKitPermissionResponse,
  HealthKitPermissionOptions
>({
  getMethod: getPermissionsAsync,
  requestMethod: requestPermissionsAsync,
});
