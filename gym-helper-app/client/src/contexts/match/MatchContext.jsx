import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../theme/AuthContext.jsx";

const API_BASE = "http://localhost:5000";

const MatchContext = createContext(null);

export function MatchProvider({ children }) {
  const { user } = useAuth();
  const [pendingMatches, setPendingMatches] = useState([]);
  const [sentMatches, setSentMatches] = useState([]);
  const [unreadPendingCount, setUnreadPendingCount] = useState(0);
  const [isMatchPageActive, setIsMatchPageActive] = useState(false);
  const [latestMatchEvent, setLatestMatchEvent] = useState(null);

  async function refreshPendingMatches() {
    if (!user?._id) return;
    try {
      const response = await fetch(`${API_BASE}/api/matching/pending`, {
        credentials: "include",
      });
      const json = await response.json();
      if (response.ok) {
        const incoming = json?.data?.incoming || [];
        const outgoing = json?.data?.outgoing || [];

        setPendingMatches(incoming);
        setSentMatches(outgoing);

        if (!isMatchPageActive) {
          setUnreadPendingCount(incoming.length);
        }
      }
    } catch (error) {
      setPendingMatches([]);
      setSentMatches([]);
    }
  }

  function clearUnreadPending() {
    setUnreadPendingCount(0);
  }

  useEffect(() => {
    if (!user?._id) {
      setPendingMatches([]);
      setSentMatches([]);
      setUnreadPendingCount(0);
      return undefined;
    }

    refreshPendingMatches();

    const socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("register", user._id);
    });

    socket.on("match:like-received", (payload) => {
      const fromUser = payload?.fromUser;
      if (fromUser?._id) {
        setPendingMatches((prev) => {
          if (prev.some((entry) => entry._id === fromUser._id)) {
            return prev;
          }
          return [fromUser, ...prev];
        });
      }
      if (!isMatchPageActive) {
        setUnreadPendingCount((count) => count + 1);
      }
    });

    socket.on("match:created", (payload) => {
      const matchId = payload?.matchUser?._id;
      if (!matchId) return;
      setPendingMatches((prev) => prev.filter((entry) => entry._id !== matchId));
      setSentMatches((prev) => prev.filter((entry) => entry._id !== matchId));
      if (!isMatchPageActive) {
        setUnreadPendingCount((count) => count + 1);
      }
      setLatestMatchEvent({ type: "match:created", payload, at: Date.now() });
    });

    socket.on("match:ended", (payload) => {
      if (!isMatchPageActive) {
        setUnreadPendingCount((count) => count + 1);
      }
      setLatestMatchEvent({ type: "match:ended", payload, at: Date.now() });
      refreshPendingMatches();
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id, isMatchPageActive]);

  const value = useMemo(
    () => ({
      pendingMatches,
      sentMatches,
      unreadPendingCount,
      clearUnreadPending,
      refreshPendingMatches,
      setPendingMatches,
      setSentMatches,
      setIsMatchPageActive,
      latestMatchEvent,
    }),
    [pendingMatches, sentMatches, unreadPendingCount, latestMatchEvent]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatchContext() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error("useMatchContext must be used within MatchProvider");
  }
  return context;
}
