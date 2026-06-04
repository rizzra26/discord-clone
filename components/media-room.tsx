"use client";

import { useEffect, useState } from "react";
import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  LiveKitRoom,
  LayoutContextProvider,
  useCreateLayoutContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useUser } from "@clerk/nextjs";
import { Loader2, Mic, Video, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
  channelName: string;
}

export const MediaRoom = ({
  chatId,
  video,
  audio,
  channelName,
}: MediaRoomProps) => {
  const { user } = useUser();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const layoutContext = useCreateLayoutContext();

  // Fetch participant count for the lobby
  useEffect(() => {
    if (!hasJoined) {
      let cancelled = false;
      (async () => {
        try {
          const resp = await fetch(`/api/livekit/participants?room=${chatId}`);
          const data = await resp.json();
          if (!cancelled) {
            setParticipantCount(data.count ?? 0);
          }
        } catch (e) {
          console.error("Failed to fetch participant count:", e);
          if (!cancelled) setParticipantCount(0);
        } finally {
          if (!cancelled) setIsLoadingCount(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [chatId, hasJoined]);

  // Fetch token only after user clicks "Join"
  useEffect(() => {
    if (!user || !hasJoined) return;

    const name =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName;

    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit?room=${chatId}&username=${encodeURIComponent(name)}`,
        );
        const data = await resp.json();

        if (!resp.ok || !data.token || !data.url) {
          console.error("LiveKit token fetch failed:", data);
          if (!cancelled) {
            setError(data.error || "Failed to connect to voice channel");
            setHasJoined(false);
          }
          return;
        }

        if (!cancelled) {
          setToken(data.token);
          setServerUrl(data.url);
        }
      } catch (e) {
        console.error("LiveKit connection error:", e);
        if (!cancelled) {
          setError("Failed to connect to voice channel. Please try again.");
          setHasJoined(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, chatId, hasJoined]);

  // ---- Lobby / Preview ----
  if (!hasJoined) {
    const Icon = video ? Video : Mic;
    const label = video ? "Video Call" : "Voice Channel";

    return (
      <div className="flex flex-col flex-1 justify-center items-center gap-6 px-4">
        {/* Icon */}
        <div className="rounded-full bg-zinc-100 dark:bg-zinc-700 p-6">
          <Icon className="h-12 w-12 text-zinc-600 dark:text-zinc-300" />
        </div>

        {/* Channel name */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
            {channelName}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {label}
          </p>
        </div>

        {/* Participant count */}
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Users className="h-4 w-4" />
          {isLoadingCount ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span>
              {participantCount} {participantCount === 1 ? "person" : "people"}{" "}
              in this room
            </span>
          )}
        </div>

        {/* Join button */}
        <button
          onClick={() => setHasJoined(true)}
          className="
            inline-flex items-center gap-2 px-8 py-3 rounded-lg
            bg-indigo-500 hover:bg-indigo-600
            dark:bg-indigo-600 dark:hover:bg-indigo-700
            text-white font-medium text-base
            transition-colors shadow-sm
          "
        >
          <Icon className="h-5 w-5" />
          Join Room
        </button>
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center gap-2">
        <p className="text-sm text-rose-500">{error}</p>
        <button
          onClick={() => {
            setError("");
            setToken("");
            setServerUrl("");
            setHasJoined(false);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Connecting ----
  if (token === "" || serverUrl === "") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center gap-4">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Connecting to voice channel...
        </p>
        <button
          onClick={() => {
            setHasJoined(false);
            setToken("");
            setServerUrl("");
          }}
          className="text-xs text-zinc-400 hover:text-zinc-300 underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ---- Connected / Room Conference ----
  return (
    <div className="flex-1 flex flex-col">
      <LiveKitRoom
        data-lk-theme="default"
        serverUrl={serverUrl}
        token={token}
        audio={audio}
        video={video}
        connect={true}
        onDisconnected={() => {
          setHasJoined(false);
          setToken("");
          setServerUrl("");
          router.refresh();
        }}
        onError={(err) => {
          console.error("LiveKit room error:", err);
          setError("Voice connection error. Please try again.");
        }}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <LayoutContextProvider value={layoutContext}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MyVideoConference />
          </div>
          <RoomAudioRenderer />
          <ControlBar
            controls={{
              microphone: audio,
              camera: video,
              screenShare: video,
              chat: false,
              leave: true,
              settings: false,
            }}
          />
        </LayoutContextProvider>
      </LiveKitRoom>
    </div>
  );
};

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "calc(100% - var(--lk-control-bar-height))" }}
    >
      <ParticipantTile />
    </GridLayout>
  );
}
