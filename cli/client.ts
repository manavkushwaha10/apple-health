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
  PluginResponse,
} from "./types";

const DEFAULT_PORT = 8081;
const REQUEST_TIMEOUT = 30000;

export class HealthKitClient {
  private ws: WebSocket | null = null;
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private connected = false;

  async connect(port = DEFAULT_PORT): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      const url = `ws://localhost:${port}/message`;
      this.ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout to ${url}`));
      }, 5000);

      this.ws.addEventListener("open", () => {
        clearTimeout(timeout);
        this.connected = true;
        // Handshake with the devtools plugin system
        this.ws!.send(
          JSON.stringify({
            type: "handshake",
            pluginName: "healthkit",
          })
        );
        resolve();
      });

      this.ws.addEventListener("error", (e) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: Failed to connect to Expo devtools at ${url}`));
      });

      this.ws.addEventListener("close", () => {
        this.connected = false;
      });

      this.ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data as string) as PluginResponse;
          this.handleMessage(msg);
        } catch {
          // Ignore non-JSON messages
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  private handleMessage(msg: PluginResponse): void {
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    this.pending.delete(msg.id);
    if (msg.type === "error" || msg.error) {
      pending.reject(new Error(msg.error ?? "Unknown error"));
    } else {
      pending.resolve(msg.data);
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

      this.ws!.send(
        JSON.stringify({
          type: "message",
          pluginName: "healthkit",
          data: { id, type, payload },
        })
      );

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
