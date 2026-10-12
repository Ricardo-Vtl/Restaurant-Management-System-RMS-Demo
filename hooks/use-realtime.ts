"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { dbOrderToDomain } from "@/lib/transforms/order-transform";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// A comanda insert is 1 order + N items -> N+1 realtime events. Coalesce the
// invalidations into a single refetch per burst instead of one per event.
let ordersInvalidationTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleOrdersInvalidation(queryClient: QueryClient) {
  if (ordersInvalidationTimer) return;
  ordersInvalidationTimer = setTimeout(() => {
    ordersInvalidationTimer = null;
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }, 500);
}

export function useRealtimeSubscription() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMounted = useRef(true);
  const isSubscribing = useRef(false);
  const tearingDownRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribe = useCallback(() => {
    if (!isMounted.current || isSubscribing.current) return;
    isSubscribing.current = true;

    if (channelRef.current) {
      const oldChannel = channelRef.current;
      channelRef.current = null;
      tearingDownRef.current = true;
      supabase.removeChannel(oldChannel).catch(() => {});
    }

    const channel = supabase
      .channel(`pos-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          scheduleOrdersInvalidation(queryClient);

          if (payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;
            if (row) {
              const order = dbOrderToDomain(row as unknown as Parameters<typeof dbOrderToDomain>[0]);
              window.dispatchEvent(new CustomEvent("order:new", { detail: order }));
            }
          }

          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            queryClient.invalidateQueries({ queryKey: ["tables"] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          scheduleOrdersInvalidation(queryClient);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tables"] });
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          isSubscribing.current = false;
          tearingDownRef.current = false;
          channelRef.current = channel;
        }
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          // Cierre intencional (logout/unmount/resubscribe): sin warn ni retry
          if (tearingDownRef.current) return;
          if (channelRef.current !== channel && channelRef.current !== null) return;
          isSubscribing.current = false;
          channelRef.current = null;
          console.warn("[realtime] Channel disrupted:", status, err?.message || "unknown");
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) subscribe();
          }, 3000);
        }
      });
  }, [queryClient]);

  useEffect(() => {
    isMounted.current = true;
    subscribe();

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      isMounted.current = false;
      isSubscribing.current = false;
      tearingDownRef.current = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch((err) =>
          console.error("[Realtime] Error removing channel:", err),
        );
        channelRef.current = null;
      }
    };
  }, [subscribe]);
}
