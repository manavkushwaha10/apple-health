import { useEffect } from "react";
import { useDevToolsPluginClient } from "expo/devtools";
import AppleHealth from "../AppleHealthModule";
import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  WorkoutActivityType,
  QueryOptions,
  StatisticsOptions,
  StatisticsAggregation,
  HealthKitDataType,
} from "../AppleHealth.types";

interface PluginMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

export function useHealthKitDevTools() {
  const client = useDevToolsPluginClient("healthkit");

  useEffect(() => {
    if (!client) return;

    const handleMessage = (data: PluginMessage) => {
      const { id, type, payload } = data;

      const sendResult = (result: unknown) => {
        client.sendMessage("result", { id, type: "result", data: result });
      };

      const sendError = (error: Error) => {
        client.sendMessage("error", { id, type: "error", error: error.message });
      };

      (async () => {
        try {
          switch (type) {
            // Query handlers
            case "queryQuantitySamples": {
              const samples = await AppleHealth.queryQuantitySamples(
                payload.type as QuantityTypeIdentifier,
                payload.options as QueryOptions | undefined
              );
              sendResult(samples);
              break;
            }

            case "queryCategorySamples": {
              const samples = await AppleHealth.queryCategorySamples(
                payload.type as CategoryTypeIdentifier,
                payload.options as QueryOptions | undefined
              );
              sendResult(samples);
              break;
            }

            case "queryWorkouts": {
              const samples = await AppleHealth.queryWorkouts(
                payload.options as QueryOptions | undefined
              );
              sendResult(samples);
              break;
            }

            case "queryStatistics": {
              const result = await AppleHealth.queryStatistics(
                payload.type as QuantityTypeIdentifier,
                payload.aggregations as StatisticsAggregation[],
                payload.options as QueryOptions | undefined
              );
              sendResult(result);
              break;
            }

            case "queryStatisticsCollection": {
              const result = await AppleHealth.queryStatisticsCollection(
                payload.type as QuantityTypeIdentifier,
                payload.aggregations as StatisticsAggregation[],
                payload.options as StatisticsOptions
              );
              sendResult(result);
              break;
            }

            case "queryActivitySummary": {
              const result = await AppleHealth.queryActivitySummary(
                payload.startDate as string,
                payload.endDate as string
              );
              sendResult(result);
              break;
            }

            // Write handlers
            case "saveQuantitySample": {
              const success = await AppleHealth.saveQuantitySample(
                payload.type as QuantityTypeIdentifier,
                payload.value as number,
                payload.unit as string,
                payload.startDate as string,
                payload.endDate as string,
                payload.metadata as Record<string, unknown> | undefined
              );
              sendResult({ success });
              break;
            }

            case "saveCategorySample": {
              const success = await AppleHealth.saveCategorySample(
                payload.type as CategoryTypeIdentifier,
                payload.value as number,
                payload.startDate as string,
                payload.endDate as string,
                payload.metadata as Record<string, unknown> | undefined
              );
              sendResult({ success });
              break;
            }

            case "saveWorkout": {
              const success = await AppleHealth.saveWorkout(
                payload.activityType as WorkoutActivityType,
                payload.startDate as string,
                payload.endDate as string,
                payload.energy as number | undefined,
                payload.distance as number | undefined,
                payload.metadata as Record<string, unknown> | undefined
              );
              sendResult({ success });
              break;
            }

            case "deleteSamples": {
              const success = await AppleHealth.deleteSamples(
                payload.type as QuantityTypeIdentifier | CategoryTypeIdentifier,
                payload.startDate as string,
                payload.endDate as string
              );
              sendResult({ success });
              break;
            }

            // Authorization handlers
            case "getAuthorizationStatus": {
              const status = await AppleHealth.getAuthorizationStatus(
                payload.types as string[]
              );
              sendResult(status);
              break;
            }

            case "requestAuthorization": {
              const result = await AppleHealth.requestAuthorization({
                read: payload.read as HealthKitDataType[],
                write: payload.write as HealthKitDataType[],
              });
              sendResult(result);
              break;
            }

            // Characteristics
            case "getCharacteristics": {
              const [
                dateOfBirth,
                biologicalSex,
                bloodType,
                fitzpatrickSkinType,
                wheelchairUse,
              ] = await Promise.all([
                AppleHealth.getDateOfBirth().catch(() => null),
                AppleHealth.getBiologicalSex().catch(() => null),
                AppleHealth.getBloodType().catch(() => null),
                AppleHealth.getFitzpatrickSkinType().catch(() => null),
                AppleHealth.getWheelchairUse().catch(() => null),
              ]);
              sendResult({
                dateOfBirth,
                biologicalSex,
                bloodType,
                fitzpatrickSkinType,
                wheelchairUse,
              });
              break;
            }

            // Status
            case "getStatus": {
              const isAvailable = AppleHealth.isAvailable();
              sendResult({ isAvailable });
              break;
            }

            // Subscriptions
            case "subscribeToChanges": {
              const subscriptionId = await AppleHealth.subscribeToChanges(
                payload.type as QuantityTypeIdentifier | CategoryTypeIdentifier
              );
              sendResult({ subscriptionId });
              break;
            }

            case "unsubscribe": {
              await AppleHealth.unsubscribe(payload.subscriptionId as string);
              sendResult({ success: true });
              break;
            }

            default:
              sendError(new Error(`Unknown message type: ${type}`));
          }
        } catch (error) {
          sendError(error as Error);
        }
      })();
    };

    // Listen for messages from the CLI
    const subscription = client.addMessageListener("message", (msg: unknown) => {
      handleMessage(msg as PluginMessage);
    });

    return () => {
      subscription?.remove?.();
    };
  }, [client]);
}
