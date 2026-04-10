import { useEffect, useMemo, useState } from "react";
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
  const [index, setIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  const currentCandidate = useMemo(() => {
    if (!users.length) return null;
    return users[index] || null;
  }, [users, index]);

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

    setUsers((prev) => prev.filter((entry) => !blockedUserIds.has(entry?._id)));
    setIndex((prev) => {
      if (prev <= 0) return 0;
      return prev;
    });
  }, [blockedUserIds, users.length]);

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
        setIndex(0);
        if (json?.hasActiveMatch && json?.matchUser) {
          setActiveMatch(json.matchUser);
        }
      }
    } catch (error) {
      setUsers([]);
      setIndex(0);
    }
  }

  function onPass() {
    if (!currentCandidate) return;
    setDragX(0);
    setIndex((prev) => prev + 1);
  }

  async function onLike() {
    if (!currentCandidate || busy) return;
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
        setActiveMatch(json.data.matchUser);
        setUsers([]);
        await refreshPendingMatches();
      } else {
        setNotice("Match request sent.");
        setIndex((prev) => prev + 1);
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 pt-6 pb-28">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workout Buddy Match</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Pass to skip, Match to send a realtime buddy request.
        </p>

        {notice ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            {notice}
          </div>
        ) : null}

        {!loading && pendingMatches.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-white p-4 dark:bg-gray-800 dark:border-amber-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Pending Match Requests ({pendingMatches.length})
            </p>
            <div className="mt-3 space-y-3">
              {pendingMatches.map((pendingUser) => (
                <div key={pendingUser._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={pendingUser.profilePicture || "/assets/croc-dark.png"}
                      alt={pendingUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{pendingUser.name || "Unknown user"}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{pendingUser.username || "@gymbro"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{pendingUser.bio?.trim() || "No bio yet."}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onLikeById(pendingUser._id)}
                    disabled={busy || Boolean(activeMatch)}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Match Back
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && sentMatches.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 dark:bg-gray-800 dark:border-sky-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              Sent Requests ({sentMatches.length})
            </p>
            <div className="mt-3 space-y-3">
              {sentMatches.map((sentUser) => (
                <div key={sentUser._id} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <img
                    src={sentUser.profilePicture || "/assets/croc-dark.png"}
                    alt={sentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{sentUser.name || "Unknown user"}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{sentUser.username || "@gymbro"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{sentUser.bio?.trim() || "No bio yet."}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                    Waiting
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="mt-8 rounded-2xl bg-white dark:bg-gray-800 p-6 text-center text-gray-600 dark:text-gray-300">
            Loading match queue...
          </div>
        ) : null}

        {!loading && activeMatch ? (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6 dark:bg-gray-800 dark:border-emerald-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Active Workout Buddy
            </p>
            <div className="mt-4 flex items-center gap-4">
              <img
                src={activeMatch.profilePicture || "/assets/croc-dark.png"}
                alt={activeMatch.name}
                className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activeMatch.name || "Unknown user"}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{activeMatch.username || "@workoutbuddy"}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm break-words">{activeMatch.bio?.trim() || "No bio yet."}</p>
              </div>
            </div>
            <button
              onClick={onUnmatch}
              disabled={busy}
              className="mt-6 w-full rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              End Match
            </button>
          </section>
        ) : null}

        {!loading && !activeMatch ? (
          <section className="mt-6">
            {currentCandidate ? (
              <div
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700 touch-none select-none transition-transform duration-150"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`,
                }}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={currentCandidate.profilePicture || "/assets/croc-dark.png"}
                    alt={currentCandidate.name}
                    className="w-20 h-20 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{currentCandidate.name || "Unknown user"}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{currentCandidate.username || "@gymbro"}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm break-words line-clamp-3">{currentCandidate.bio?.trim() || "No bio yet."}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-500">Swipe Left to Pass</span>
                  <span className="text-blue-600 dark:text-blue-400">Swipe Right to Match</span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={onPass}
                    disabled={busy}
                    className="rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Pass
                  </button>
                  <button
                    onClick={onLike}
                    disabled={busy}
                    className="rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Match
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                No more people in queue right now. Check back later.
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
