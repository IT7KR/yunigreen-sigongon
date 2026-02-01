/**
 * Offline Queue - IndexedDB-based queue for offline operations
 */

const DB_NAME = "sigongon_offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";

export interface OfflineAction {
  id: string;
  type: "photo_upload" | "daily_report" | "attendance" | "site_visit";
  payload: any;
  created_at: Date;
  retry_count: number;
  status: "pending" | "syncing" | "failed";
  error?: string;
  last_retry_at?: Date;
}

class OfflineQueueManager {
  private db: IDBDatabase | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("created_at", "created_at", { unique: false });
        }
      };
    });
  }

  async add(
    action: Omit<OfflineAction, "id" | "retry_count" | "status">
  ): Promise<string> {
    const db = await this.getDb();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullAction: OfflineAction = {
      ...action,
      id,
      retry_count: 0,
      status: "pending",
      created_at: action.created_at instanceof Date ? action.created_at : new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(fullAction);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(id);
    });
  }

  async getAll(): Promise<OfflineAction[]> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const actions = request.result.map((action: any) => ({
          ...action,
          created_at: new Date(action.created_at),
          last_retry_at: action.last_retry_at
            ? new Date(action.last_retry_at)
            : undefined,
        }));
        resolve(actions);
      };
    });
  }

  async getPending(): Promise<OfflineAction[]> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("status");
      const request = index.getAll("pending");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const actions = request.result.map((action: any) => ({
          ...action,
          created_at: new Date(action.created_at),
          last_retry_at: action.last_retry_at
            ? new Date(action.last_retry_at)
            : undefined,
        }));
        resolve(actions);
      };
    });
  }

  async updateStatus(
    id: string,
    status: OfflineAction["status"],
    error?: string
  ): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (!action) {
          reject(new Error(`Action with id ${id} not found`));
          return;
        }

        const updatedAction = {
          ...action,
          status,
          error,
          last_retry_at: status === "syncing" ? new Date() : action.last_retry_at,
          retry_count:
            status === "syncing" ? action.retry_count + 1 : action.retry_count,
        };

        const putRequest = store.put(updatedAction);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async sync(): Promise<{ success: number; failed: number }> {
    const pendingActions = await this.getPending();
    let success = 0;
    let failed = 0;

    for (const action of pendingActions) {
      try {
        await this.updateStatus(action.id, "syncing");

        // Execute the action based on type
        await this.executeAction(action);

        // Remove from queue on success
        await this.remove(action.id);
        success++;
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        await this.updateStatus(
          action.id,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
        failed++;
      }
    }

    return { success, failed };
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    // In a real implementation, this would make API calls
    // For now, we'll simulate the execution

    console.log(`Executing ${action.type} action:`, action.payload);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate 90% success rate
    if (Math.random() > 0.9) {
      throw new Error("Network error");
    }

    // TODO: Implement actual API calls based on action.type
    // switch (action.type) {
    //   case "photo_upload":
    //     await api.uploadPhoto(action.payload);
    //     break;
    //   case "daily_report":
    //     await api.submitDailyReport(action.payload);
    //     break;
    //   case "attendance":
    //     await api.recordAttendance(action.payload);
    //     break;
    //   case "site_visit":
    //     await api.createSiteVisit(action.payload);
    //     break;
    // }
  }

  async clear(): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager();
