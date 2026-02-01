# Offline Support

IndexedDB-based offline queue for resilient mobile operations in construction environments with unreliable connectivity.

## Architecture

### OfflineQueue

Persistent storage layer using IndexedDB for offline actions.

**Supported Actions:**
- `photo_upload` - Photo uploads with EXIF data
- `daily_report` - Daily construction reports
- `attendance` - Worker attendance records
- `site_visit` - Site visit records

**Queue Item Structure:**
```typescript
interface OfflineAction {
  id: string;
  type: "photo_upload" | "daily_report" | "attendance" | "site_visit";
  payload: any;
  created_at: Date;
  retry_count: number;
  status: "pending" | "syncing" | "failed";
  error?: string;
  last_retry_at?: Date;
}
```

### API

```typescript
// Add action to queue
const id = await offlineQueue.add({
  type: "photo_upload",
  payload: {
    photo: blob,
    type: "before",
    project_id: "123",
  },
  created_at: new Date(),
});

// Get all actions
const all = await offlineQueue.getAll();

// Get pending actions
const pending = await offlineQueue.getPending();

// Update status
await offlineQueue.updateStatus(id, "syncing");
await offlineQueue.updateStatus(id, "failed", "Network timeout");

// Remove after success
await offlineQueue.remove(id);

// Sync all pending
const result = await offlineQueue.sync();
// { success: 5, failed: 1 }

// Clear all
await offlineQueue.clear();
```

## useOnlineStatus Hook

React hook for network status monitoring and auto-sync.

```typescript
function Component() {
  const {
    isOnline,      // Current network status
    wasOffline,    // Was offline since mount
    isSyncing,     // Currently syncing
    pendingCount,  // Number of pending items
    sync,          // Manual sync trigger
  } = useOnlineStatus();

  return (
    <div>
      {!isOnline && (
        <div>Offline mode - {pendingCount} items queued</div>
      )}

      {isSyncing && <div>Syncing...</div>}

      <button onClick={sync} disabled={isSyncing}>
        Sync Now
      </button>
    </div>
  );
}
```

### Features

- **Auto-sync on reconnect** - Automatically syncs when network returns
- **Polling** - Updates pending count every 30 seconds
- **Event listeners** - Responds to online/offline events
- **Debounced sync** - Prevents multiple simultaneous sync operations

## Implementation Pattern

### 1. Queue Actions When Offline

```typescript
async function uploadPhoto(photo: Blob, metadata: PhotoMetadata) {
  if (!navigator.onLine) {
    // Queue for later
    await offlineQueue.add({
      type: "photo_upload",
      payload: { photo, metadata },
      created_at: new Date(),
    });
    return { queued: true };
  }

  // Normal upload
  return await api.uploadPhoto(photo, metadata);
}
```

### 2. Sync on Reconnect

The `useOnlineStatus` hook handles this automatically:

```typescript
useEffect(() => {
  const handleOnline = () => {
    sync(); // Auto-sync when coming back online
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}, [sync]);
```

### 3. Display Status

```tsx
<OfflineBanner />
```

The banner automatically:
- Shows when offline
- Shows during sync
- Shows pending count
- Provides manual sync button
- Auto-hides when synced

## Error Handling

### Retry Strategy

Currently implements:
- Increment `retry_count` on each attempt
- Store `last_retry_at` timestamp
- Store error message in `error` field
- Mark as `failed` after errors

Future improvements:
- Exponential backoff
- Max retry limit
- Different strategies per action type

### Failed Actions

Failed actions remain in queue for manual intervention:

```typescript
const failed = await offlineQueue.getAll()
  .then(all => all.filter(a => a.status === "failed"));

// Retry individual action
await offlineQueue.updateStatus(failedId, "pending");
await offlineQueue.sync();

// Or clear failed
for (const action of failed) {
  await offlineQueue.remove(action.id);
}
```

## Database Schema

**Database**: `sigongon_offline`
**Version**: 1
**Store**: `queue`

**Indexes:**
- `status` - For filtering by status
- `type` - For filtering by action type
- `created_at` - For chronological ordering

**Persistence**: Permanent until explicitly cleared or synced successfully.

## Testing Offline Mode

### Chrome DevTools

1. Open DevTools → Network tab
2. Change throttling to "Offline"
3. Perform actions (upload photos, submit reports)
4. Check IndexedDB in Application tab
5. Change back to "Online"
6. Watch auto-sync occur

### Programmatic Testing

```typescript
// Simulate offline
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: false,
});
window.dispatchEvent(new Event("offline"));

// Add actions
await offlineQueue.add({ ... });

// Simulate online
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});
window.dispatchEvent(new Event("online"));

// Verify sync
await offlineQueue.getPending(); // Should be empty
```

## Performance

- **Queue size**: No hard limit, but recommend clearing old failed items
- **Sync parallelism**: Currently sequential, future parallel optimization
- **IndexedDB overhead**: Minimal (~50ms per operation)
- **Battery impact**: Polling uses 30s interval to minimize drain

## Future Enhancements

1. **Selective sync** - Sync by priority or type
2. **Compression** - Compress large payloads (photos)
3. **Conflict resolution** - Handle server conflicts
4. **Background sync** - Use Service Worker Background Sync API
5. **Encryption** - Encrypt sensitive data in IndexedDB
6. **Analytics** - Track success/failure rates
7. **User notifications** - Alert on sync completion/failure
