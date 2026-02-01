"use client";

import { useState, useEffect, useCallback } from "react";
import { offlineQueue } from "./OfflineQueue";

export interface OnlineStatusHook {
  isOnline: boolean;
  wasOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  sync: () => Promise<void>;
}

export function useOnlineStatus(): OnlineStatusHook {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await offlineQueue.getPending();
      setPendingCount(pending.length);
    } catch (error) {
      console.error("Failed to get pending count:", error);
    }
  }, []);

  // Sync offline queue
  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      console.log("Starting offline queue sync...");
      const result = await offlineQueue.sync();
      console.log("Sync complete:", result);

      // Update pending count after sync
      await updatePendingCount();

      // Reset wasOffline flag after successful sync
      if (result.success > 0) {
        setWasOffline(false);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network is online");
      setIsOnline(true);
      setWasOffline(true);

      // Auto-sync when coming back online
      sync();
    };

    const handleOffline = () => {
      console.log("Network is offline");
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync]);

  // Update pending count on mount and when online status changes
  useEffect(() => {
    updatePendingCount();

    // Poll for pending count updates every 30 seconds
    const interval = setInterval(updatePendingCount, 30000);

    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    isOnline,
    wasOffline,
    isSyncing,
    pendingCount,
    sync,
  };
}
