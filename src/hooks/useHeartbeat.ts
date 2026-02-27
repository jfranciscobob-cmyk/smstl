import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHeartbeat(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const sendHeartbeat = () => {
      supabase.functions.invoke("heartbeat").catch(() => {});
    };

    // Send immediately
    sendHeartbeat();

    // Then every 60 seconds
    const interval = setInterval(sendHeartbeat, 60_000);

    return () => clearInterval(interval);
  }, [userId]);
}
