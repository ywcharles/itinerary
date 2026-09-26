"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Stop, NewStop } from "../types";

export function useStops(itineraryId: string) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStops = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stops")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .order("stop_order", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setStops((data ?? []) as Stop[]);
      setError(null);
    }
    setLoading(false);
  }, [itineraryId]);

  // Initial fetch + live sync so every connected client sees new/changed/removed
  // stops without refreshing. Requires the `stops` table to have Realtime
  // replication turned on in the Supabase dashboard (Database > Replication).
  useEffect(() => {
    if (!itineraryId) return;

    fetchStops();

    const channel = supabase
      .channel(`stops-${itineraryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stops",
          filter: `itinerary_id=eq.${itineraryId}`,
        },
        (payload) => {
          setStops((current) => {
            if (payload.eventType === "INSERT") {
              const incoming = payload.new as Stop;
              if (current.some((s) => s.id === incoming.id)) return current;
              return [...current, incoming].sort(
                (a, b) => a.stop_order - b.stop_order,
              );
            }

            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Stop;
              return current
                .map((s) => (s.id === updated.id ? updated : s))
                .sort((a, b) => a.stop_order - b.stop_order);
            }

            if (payload.eventType === "DELETE") {
              const removed = payload.old as Partial<Stop>;
              return current.filter((s) => s.id !== removed.id);
            }

            return current;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itineraryId, fetchStops]);

  const addStop = useCallback(async (newStop: NewStop) => {
    const { data, error } = await supabase
      .from("stops")
      .insert(newStop)
      .select()
      .single();

    if (error) throw error;

    // Optimistic update — the realtime event for this insert will also
    // arrive, but the id check above dedupes it.
    setStops((current) => {
      if (current.some((s) => s.id === data.id)) return current;
      return [...current, data as Stop].sort(
        (a, b) => a.stop_order - b.stop_order,
      );
    });

    return data as Stop;
  }, []);

  return { stops, loading, error, addStop, refetch: fetchStops };
}