"use client";

import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { PrimitiveButton, cn } from "@sigongon/ui";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline, wasOffline, isSyncing, pendingCount, sync } =
    useOnlineStatus();

  // Don't show if online and never was offline
  if (isOnline && !wasOffline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-b-2 transition-all duration-300",
        isOnline
          ? "border-green-500 bg-green-50"
          : "border-amber-500 bg-amber-50"
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className="flex-shrink-0">
            {!isOnline && (
              <div className="rounded-lg bg-amber-100 p-2">
                <WifiOff className="h-5 w-5 text-amber-700" />
              </div>
            )}
            {isOnline && isSyncing && (
              <div className="rounded-lg bg-green-100 p-2">
                <RefreshCw className="h-5 w-5 animate-spin text-green-700" />
              </div>
            )}
            {isOnline && !isSyncing && pendingCount > 0 && (
              <div className="rounded-lg bg-blue-100 p-2">
                <AlertCircle className="h-5 w-5 text-blue-700" />
              </div>
            )}
            {isOnline && !isSyncing && pendingCount === 0 && wasOffline && (
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="flex-1">
            {!isOnline && (
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  오프라인 모드
                </p>
                <p className="text-xs text-amber-700">
                  인터넷 연결이 끊어졌습니다. 작업은 계속 가능하며, 연결 복구 시
                  자동으로 동기화됩니다.
                </p>
              </div>
            )}

            {isOnline && isSyncing && (
              <div>
                <p className="text-sm font-semibold text-green-900">
                  동기화 중
                </p>
                <p className="text-xs text-green-700">
                  오프라인 작업을 서버와 동기화하고 있습니다...
                </p>
              </div>
            )}

            {isOnline && !isSyncing && pendingCount > 0 && (
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  대기 중인 작업
                </p>
                <p className="text-xs text-blue-700">
                  {pendingCount}개의 작업이 동기화 대기 중입니다
                </p>
              </div>
            )}

            {isOnline && !isSyncing && pendingCount === 0 && wasOffline && (
              <div>
                <p className="text-sm font-semibold text-green-900">
                  동기화 완료
                </p>
                <p className="text-xs text-green-700">
                  모든 작업이 성공적으로 동기화되었습니다
                </p>
              </div>
            )}
          </div>

          {/* Action button */}
          {isOnline && !isSyncing && pendingCount > 0 && (
            <PrimitiveButton
              onClick={sync}
              className="flex items-center gap-1.5 rounded-lg bg-brand-point-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-point-600 hover:shadow-lg active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              동기화
            </PrimitiveButton>
          )}

          {/* Pending count badge */}
          {!isOnline && pendingCount > 0 && (
            <div className="flex-shrink-0 rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white shadow-md">
              {pendingCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
