import { useEffect, useMemo, useState } from "react";
import { FaDumbbell, FaTimes } from "react-icons/fa";
import { useMatchContext } from "../../contexts/match/MatchContext.jsx";

const API_BASE = "http://localhost:5000";

export default function Match() {
  const {
    pendingMatches,
    sentMatches,
    clearUnreadPending,
    refreshPendingMatches,
    setIsMatchPageActive,
    latestMatchEvent,
  } = useMatchContext();
  const [users, setUsers] = useState([]);
  const [discoveryIndex, setDiscoveryIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [decisionFlash, setDecisionFlash] = useState("");
  const [requestTab, setRequestTab] = useState("sent");

  const currentCandidate = useMemo(() => {
    if (requestTab === "pending") {
      if (!pendingMatches.length) return null;
      return pendingMatches[pendingIndex] || null;
    }

    if (!users.length) return null;
    return users[discoveryIndex] || null;
  }, [requestTab, users, discoveryIndex, pendingMatches, pendingIndex]);

  const visibleCandidates = useMemo(() => {
    if (requestTab === "pending") {
      return pendingMatches.slice(pendingIndex, pendingIndex + 3);
    }
    return users.slice(discoveryIndex, discoveryIndex + 3);
  }, [requestTab, users, discoveryIndex, pendingMatches, pendingIndex]);

  const blockedUserIds = useMemo(() => {
    const ids = [
      ...pendingMatches.map((entry) => entry._id),
      ...sentMatches.map((entry) => entry._id),
    ];
    return new Set(ids.filter(Boolean));
  }, [pendingMatches, sentMatches]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!decisionFlash) return undefined;
    const timeoutId = setTimeout(() => setDecisionFlash(""), 550);
    return () => clearTimeout(timeoutId);
  }, [decisionFlash]);

  useEffect(() => {
    setIsMatchPageActive(true);
    clearUnreadPending();

    async function bootstrap() {
      await Promise.all([fetchActiveMatch(), fetchDiscovery(), refreshPendingMatches()]);
      setLoading(false);
    }

    bootstrap();

    return () => {
      setIsMatchPageActive(false);
    };
  }, []);

  useEffect(() => {
    if (!latestMatchEvent) return;

    if (latestMatchEvent.type === "match:ended") {
      setActiveMatch(null);
      setNotice("Your workout buddy match ended.");
      fetchDiscovery();
      return;
    }

    if (latestMatchEvent.type === "match:created") {
      const nextMatchUser = latestMatchEvent?.payload?.matchUser || null;
      if (nextMatchUser) {
        setActiveMatch(nextMatchUser);
        setUsers([]);
      }
    }
  }, [latestMatchEvent]);

  useEffect(() => {
    if (!users.length || blockedUserIds.size === 0) return;

    setUsers((prev) => {
      const next = prev.filter((entry) => !blockedUserIds.has(entry?._id));
      setDiscoveryIndex((curr) => {
        const maxIdx = Math.max(0, next.length - 1);
        return Math.min(curr, maxIdx);
      });
      return next;
    });
  }, [blockedUserIds, users.length]);

  useEffect(() => {
    setPendingIndex((prev) => {
      if (pendingMatches.length === 0) return 0;
      if (prev > pendingMatches.length - 1) return pendingMatches.length - 1;
      return prev;
    });
  }, [pendingMatches.length]);

  async function fetchActiveMatch() {
    try {
      const response = await fetch(`${API_BASE}/api/matching/active`, {
        credentials: "include",
      });
      const json = await response.json();
      if (response.ok && json?.data?.hasActiveMatch) {
        setActiveMatch(json.data.matchUser);
      } else {
        setActiveMatch(null);
      }
    } catch (error) {
      setActiveMatch(null);
    }
  }

  async function fetchDiscovery() {
    try {
      const response = await fetch(`${API_BASE}/api/matching/discovery`, {
        credentials: "include",
      });
      const json = await response.json();
      if (response.ok) {
        const filteredUsers = (json?.data || []).filter((entry) => !blockedUserIds.has(entry?._id));
        setUsers(filteredUsers);
        setDiscoveryIndex(0);
        if (json?.hasActiveMatch && json?.matchUser) {
          setActiveMatch(json.matchUser);
        }
      }
    } catch (error) {
      setUsers([]);
      setDiscoveryIndex(0);
    }
  }

  function onPass() {
    if (!currentCandidate) return;
    setDragX(0);
    setDecisionFlash("PASS");

    if (requestTab === "pending") {
      onDeclineById(currentCandidate._id);
      return;
    }

    setUsers((prev) => prev.filter((entry) => entry?._id !== currentCandidate._id));
  }

  async function onLike() {
    if (!currentCandidate || busy) return;

    if (requestTab === "pending") {
      setDecisionFlash("MATCH");
      await onLikeById(currentCandidate._id);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/matching/like/${currentCandidate._id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const json = await response.json();

      if (!response.ok) {
        if (json?.data?.hasActiveMatch) {
          setActiveMatch(json.data.matchUser || null);
        }
        setNotice(json?.message || "Could not send match request.");
        return;
      }

      if (json?.data?.matched) {
        setDecisionFlash("MATCH");
        setActiveMatch(json.data.matchUser);
        setUsers([]);
        await refreshPendingMatches();
      } else {
        setNotice("Match request sent.");
        setUsers((prev) => prev.filter((entry) => entry?._id !== currentCandidate._id));
        await refreshPendingMatches();
      }
    } catch (error) {
      setNotice("Could not send match request.");
    } finally {
      setDragX(0);
      setBusy(false);
    }
  }

  async function onLikeById(targetId) {
    if (!targetId || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/matching/like/${targetId}`, {
        method: "POST",
        credentials: "include",
      });
      const json = await response.json();

      if (!response.ok) {
        setNotice(json?.message || "Could not process pending match.");
        return;
      }

      if (json?.data?.matched) {
        setDecisionFlash("MATCH");
        setActiveMatch(json.data.matchUser);
        setUsers([]);
        setNotice("Mutual match confirmed. You are now workout buddies.");
      } else {
        setNotice("Match request sent.");
      }

      await refreshPendingMatches();
      await fetchDiscovery();
    } catch (error) {
      setNotice("Could not process pending match.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeclineById(targetId) {
    if (!targetId || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/matching/unmatch/${targetId}`, {
        method: "POST",
        credentials: "include",
      });
      const json = await response.json();

      if (!response.ok) {
        setNotice(json?.message || "Could not decline request.");
        return;
      }

      setNotice("Request declined.");
      setDecisionFlash("PASS");
      await refreshPendingMatches();
      await fetchDiscovery();
    } catch (error) {
      setNotice("Could not decline request.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnmatch() {
    if (!activeMatch?._id || busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/matching/unmatch/${activeMatch._id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const json = await response.json();
      if (!response.ok) {
        setNotice(json?.message || "Could not end match.");
        return;
      }
      setActiveMatch(null);
      setNotice("Match ended. You can discover new buddies now.");
      await fetchDiscovery();
      await refreshPendingMatches();
    } catch (error) {
      setNotice("Could not end match.");
    } finally {
      setBusy(false);
    }
  }

  function onPointerDown(event) {
    if (!currentCandidate || activeMatch || busy) return;
    setIsDragging(true);
    setDragStartX(event.clientX);
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    setDragX(event.clientX - dragStartX);
  }

  function onPointerUp() {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragX > 90) {
      onLike();
      return;
    }

    if (dragX < -90) {
      onPass();
      return;
    }

    setDragX(0);
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (busy || activeMatch || !currentCandidate) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPass();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onLike();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, activeMatch, currentCandidate, onLike]);

  return (
    <main className="h-[calc(100vh-5rem)] overflow-hidden bg-[#081224] text-white px-3 py-3">
      <div className="h-full max-w-5xl mx-auto flex flex-col">
        <div className="shrink-0 flex items-center justify-between gap-2 pb-3">
          <h1 className="text-base md:text-lg font-bold tracking-wide uppercase">Match</h1>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <button
              onClick={() => setRequestTab("sent")}
              className={`rounded-full px-3 py-1 border ${requestTab === "sent" ? "bg-[#2a4672] border-[#4f79b0]" : "bg-[#15243d] border-[#233a60]"}`}
            >
              Sent {sentMatches.length}
            </button>
            <button
              onClick={() => setRequestTab("pending")}
              className={`rounded-full px-3 py-1 border ${requestTab === "pending" ? "bg-[#2a4672] border-[#4f79b0]" : "bg-[#15243d] border-[#233a60]"}`}
            >
              Pending {pendingMatches.length}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="shrink-0 mb-3 rounded-md border border-[#2a4672] bg-[#10213c] px-3 py-2 text-xs text-blue-100">
            {notice}
          </div>
        ) : null}

        {!loading && requestTab === "sent" && sentMatches.length > 0 ? (
          <div className="shrink-0 mb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {sentMatches.slice(0, 4).map((sentUser) => (
                <div key={sentUser._id} className="shrink-0 rounded-full bg-[#1b3153] border border-[#28456f] px-3 py-1.5 text-xs font-semibold text-white">
                  Waiting on {sentUser.name || "User"}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="relative flex-1 min-h-0 flex items-center justify-center">
          {decisionFlash ? (
            <div className={`absolute top-4 z-40 rounded-md px-4 py-2 text-sm font-extrabold tracking-wider ${decisionFlash === "MATCH" ? "bg-emerald-500 text-black" : "bg-rose-500 text-white"}`}>
              {decisionFlash}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-md border border-[#2a4672] bg-[#10213c] px-4 py-3 text-sm text-blue-100">
            Loading match queue...
            </div>
          ) : null}

          {!loading && activeMatch ? (
            <div className="relative h-[min(58vh,520px)] aspect-[9/16] rounded-xl overflow-hidden border border-[#2c3d5a] shadow-2xl bg-[#0f1b31]">
              <img
                src={activeMatch.profilePicture || "/assets/croc-dark.png"}
                alt={activeMatch.name}
                className="absolute inset-0 w-full h-full object-cover bg-[#0f1b31]"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/75 p-4">
                <p className="text-xl font-extrabold leading-tight">{activeMatch.name || "Unknown user"}</p>
                <p className="text-xs text-gray-200 mt-0.5">{activeMatch.username || "@workoutbuddy"}</p>
                <p className="text-xs text-gray-300 mt-1 line-clamp-3">{activeMatch.bio?.trim() || "No bio yet."}</p>
                <div className="mt-3 flex items-center justify-center">
                  <button
                    onClick={onUnmatch}
                    disabled={busy}
                    className="w-12 h-12 rounded-full bg-rose-600 text-white grid place-items-center disabled:opacity-50"
                    title="End match"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && !activeMatch ? (
            currentCandidate ? (
              <div className="relative h-[min(58vh,520px)] aspect-[9/16]">
                {[...visibleCandidates].reverse().map((candidate, reversedIdx) => {
                  const depth = visibleCandidates.length - 1 - reversedIdx;
                  const isTopCard = depth === 0;
                  const baseTransform = `translateY(${depth * 10}px) scale(${1 - depth * 0.03})`;
                  const topTransform = `translateX(${dragX}px) translateY(${depth * 10}px) rotate(${dragX / 20}deg)`;

                  return (
                    <div
                      key={candidate._id}
                      className="absolute inset-0 rounded-xl overflow-hidden border border-[#2c3d5a] shadow-2xl touch-none select-none transition-transform duration-150 bg-[#0f1b31]"
                      onPointerDown={isTopCard ? onPointerDown : undefined}
                      onPointerMove={isTopCard ? onPointerMove : undefined}
                      onPointerUp={isTopCard ? onPointerUp : undefined}
                      onPointerCancel={isTopCard ? onPointerUp : undefined}
                      style={{
                        transform: isTopCard ? topTransform : baseTransform,
                        zIndex: 20 - depth,
                        opacity: 1 - depth * 0.08,
                        pointerEvents: isTopCard ? "auto" : "none",
                      }}
                    >
                      <img
                        src={candidate.profilePicture || "/assets/croc-dark.png"}
                        alt={candidate.name}
                        className="absolute inset-0 w-full h-full object-cover bg-[#0f1b31]"
                      />

                      <div className="absolute bottom-0 left-0 right-0 bg-black/75 p-4">
                        <p className="text-xl font-extrabold leading-tight">{candidate.name || "Unknown user"} <span className="text-sm font-semibold text-gray-300">• --</span></p>
                        <p className="text-xs text-gray-200 mt-0.5">{candidate.username || "@gymbro"}</p>
                        <p className="text-xs text-gray-300 mt-1 line-clamp-2">{candidate.bio?.trim() || "No bio yet."}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            onClick={onPass}
                            disabled={busy || !isTopCard}
                            className="w-12 h-12 rounded-full bg-rose-600 text-white grid place-items-center disabled:opacity-50"
                            title="Pass"
                          >
                            <FaTimes className="w-5 h-5" />
                          </button>
                          <button
                            onClick={onLike}
                            disabled={busy || !isTopCard}
                            className="w-12 h-12 rounded-full bg-emerald-500 text-white grid place-items-center disabled:opacity-50"
                            title="Match"
                          >
                            <FaDumbbell className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-[#2a4672] bg-[#10213c] px-4 py-3 text-sm text-blue-100">
                {requestTab === "pending"
                  ? "No incoming requests right now."
                  : "No more people in queue right now. Check back later."}
              </div>
            )
          ) : null}
        </div>
      </div>
    </main>
  );
}
