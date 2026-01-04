import type {
  QueryOptions,
  StatisticsOptions,
  StatisticsAggregation,
  QuantitySample,
  CategorySample,
  WorkoutSample,
  StatisticsResult,
  ActivitySummary,
  Characteristics,
} from "./types";

const DEFAULT_PORT = 8081;
const REQUEST_TIMEOUT = 30000;
const PROTOCOL_VERSION = 1;

interface MessageKey {
  pluginName: string;
  method: string;
}

interface PackedMessage {
  messageKey: MessageKey;
  payload: unknown;
}

export class HealthKitClient {
  private ws: WebSocket | null = null;
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private connected = false;
  private browserClientId = Date.now().toString();
  private pluginName = "healthkit";

  async connect(port = DEFAULT_PORT): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      const url = `ws://localhost:${port}/expo-dev-plugins/broadcast`;
      this.ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout to ${url}`));
      }, 10000);

      this.ws.addEventListener("open", () => {
        clearTimeout(timeout);
        this.connected = true;
        // Send handshake
        this.sendHandshake();
        resolve();
      });

      this.ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: Failed to connect to Expo devtools at ${url}`));
      });

      this.ws.addEventListener("close", () => {
        this.connected = false;
      });

      this.ws.addEventListener("message", (event) => {
        this.handleMessage(event.data);
      });
    });
  }

  private sendHandshake(): void {
    const handshake = {
      protocolVersion: PROTOCOL_VERSION,
      pluginName: this.pluginName,
      method: "handshake",
      browserClientId: this.browserClientId,
      __isHandshakeMessages: true,
    };
    this.ws?.send(JSON.stringify(handshake));
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  private handleMessage(data: string | ArrayBuffer): void {
    // Handle string messages (could be handshake or packed)
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        // Check if it's a handshake message
        if (parsed.__isHandshakeMessages) {
          return;
        }
        // Check if it's a packed message with messageKey
        if (parsed.messageKey) {
          this.handlePackedMessage(parsed);
        }
      } catch {
        // Not JSON, ignore
      }
      return;
    }

    // Handle binary/ArrayBuffer messages
    if (data instanceof ArrayBuffer) {
      const unpacked = this.unpackMessage(data);
      if (unpacked) {
        this.handlePackedMessage(unpacked);
      }
    }
  }

  private handlePackedMessage(msg: PackedMessage): void {
    const { messageKey, payload } = msg;

    // Only handle messages for our plugin
    if (messageKey.pluginName !== this.pluginName) {
      return;
    }

    // Handle result/error messages
    if (messageKey.method === "result" || messageKey.method === "error") {
      const response = payload as { id: string; data?: unknown; error?: string };
      const pending = this.pending.get(response.id);
      if (!pending) return;

      this.pending.delete(response.id);
      if (messageKey.method === "error" || response.error) {
        pending.reject(new Error(response.error ?? "Unknown error"));
      } else {
        pending.resolve(response.data);
      }
    }
  }

  private packMessage(method: string, payload: unknown): ArrayBuffer {
    const messageKey: MessageKey = {
      pluginName: this.pluginName,
      method,
    };
    const msg: PackedMessage = { messageKey, payload };
    const json = JSON.stringify(msg);
    const encoder = new TextEncoder();
    return encoder.encode(json).buffer;
  }

  private unpackMessage(data: ArrayBuffer): PackedMessage | null {
    try {
      const decoder = new TextDecoder();
      const json = decoder.decode(data);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private async send<T>(type: string, payload: unknown): Promise<T> {
    if (!this.ws || !this.connected) {
      throw new Error("Not connected to Expo devtools");
    }

    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      // Send as JSON string (Expo devtools expects JSON, not binary)
      const messagePayload = { id, type, payload };
      const msg = {
        messageKey: { pluginName: this.pluginName, method: "message" },
        payload: messagePayload,
      };
      this.ws!.send(JSON.stringify(msg));

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("Request timeout"));
        }
      }, REQUEST_TIMEOUT);
    });
  }

  // Query methods
  async queryQuantitySamples(
    type: string,
    options?: QueryOptions
  ): Promise<QuantitySample[]> {
    return this.send("queryQuantitySamples", { type, options });
  }

  async queryCategorySamples(
    type: string,
    options?: QueryOptions
  ): Promise<CategorySample[]> {
    return this.send("queryCategorySamples", { type, options });
  }

  async queryWorkouts(options?: QueryOptions): Promise<WorkoutSample[]> {
    return this.send("queryWorkouts", { options });
  }

  async queryStatistics(
    type: string,
    aggregations: StatisticsAggregation[],
    options?: QueryOptions
  ): Promise<StatisticsResult> {
    return this.send("queryStatistics", { type, aggregations, options });
  }

  async queryStatisticsCollection(
    type: string,
    aggregations: StatisticsAggregation[],
    options: StatisticsOptions
  ): Promise<StatisticsResult[]> {
    return this.send("queryStatisticsCollection", { type, aggregations, options });
  }

  async queryActivitySummary(
    startDate: string,
    endDate: string
  ): Promise<ActivitySummary[]> {
    return this.send("queryActivitySummary", { startDate, endDate });
  }

  // Write methods
  async saveQuantitySample(
    type: string,
    value: number,
    unit: string,
    startDate: string,
    endDate?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    return this.send("saveQuantitySample", {
      type,
      value,
      unit,
      startDate,
      endDate: endDate ?? startDate,
      metadata,
    });
  }

  async saveCategorySample(
    type: string,
    value: number,
    startDate: string,
    endDate?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    return this.send("saveCategorySample", {
      type,
      value,
      startDate,
      endDate: endDate ?? startDate,
      metadata,
    });
  }

  async saveWorkout(
    activityType: string,
    startDate: string,
    endDate: string,
    energy?: number,
    distance?: number,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    return this.send("saveWorkout", {
      activityType,
      startDate,
      endDate,
      energy,
      distance,
      metadata,
    });
  }

  async deleteSamples(
    type: string,
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean }> {
    return this.send("deleteSamples", { type, startDate, endDate });
  }

  // Authorization methods
  async getAuthorizationStatus(
    types: string[]
  ): Promise<Record<string, string>> {
    return this.send("getAuthorizationStatus", { types });
  }

  async requestAuthorization(
    read: string[],
    write: string[]
  ): Promise<{ status: string }> {
    return this.send("requestAuthorization", { read, write });
  }

  // Characteristics
  async getCharacteristics(): Promise<Characteristics> {
    return this.send("getCharacteristics", {});
  }

  // Status
  async getStatus(): Promise<{ isAvailable: boolean }> {
    return this.send("getStatus", {});
  }

  // Subscriptions
  async subscribeToChanges(type: string): Promise<{ subscriptionId: string }> {
    return this.send("subscribeToChanges", { type });
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    return this.send("unsubscribe", { subscriptionId });
  }
}

// Singleton for CLI use
let clientInstance: HealthKitClient | null = null;

export async function getClient(port?: number): Promise<HealthKitClient> {
  if (!clientInstance) {
    clientInstance = new HealthKitClient();
  }
  await clientInstance.connect(port);
  return clientInstance;
}
