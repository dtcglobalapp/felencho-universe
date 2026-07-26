"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
} from "react";

export interface CapturedMedia {
  kind: "photo" | "video";
  name: string;
  size: number;
}

interface MediaCaptureProps {
  onMediaReady: (
    media: CapturedMedia,
  ) => void;
}

const MAX_RECORDING_MS = 30_000;

function formatFileSize(size: number): string {
  if (size < 1_000_000) {
    return `${Math.max(1, Math.round(size / 1_000))} KB`;
  }

  return `${(size / 1_000_000).toFixed(1)} MB`;
}

export default function MediaCapture({
  onMediaReady,
}: MediaCaptureProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const liveVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const isMountedRef =
    useRef(true);

  const discardRecordingRef =
    useRef(false);

  const recordingChunksRef =
    useRef<Blob[]>([]);

  const recordingTimeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const photoUrlRef =
    useRef<string | null>(null);

  const videoUrlRef =
    useRef<string | null>(null);

  const [captureMode, setCaptureMode] =
    useState<
      "idle" | "camera" | "photo" | "video"
    >("idle");

  const [photoUrl, setPhotoUrl] =
    useState<string | null>(null);

  const [videoUrl, setVideoUrl] =
    useState<string | null>(null);

  const [mediaLabel, setMediaLabel] =
    useState<string | null>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const [isStartingCamera, setIsStartingCamera] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function clearRecordingTimeout() {
    if (recordingTimeoutRef.current) {
      clearTimeout(
        recordingTimeoutRef.current,
      );
      recordingTimeoutRef.current = null;
    }
  }

  function stopCameraStream() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject =
        null;
    }
  }

  function revokePreviewUrls() {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(
        photoUrlRef.current,
      );
      photoUrlRef.current = null;
    }

    if (videoUrlRef.current) {
      URL.revokeObjectURL(
        videoUrlRef.current,
      );
      videoUrlRef.current = null;
    }
  }

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      discardRecordingRef.current = true;
      clearRecordingTimeout();

      if (
        recorderRef.current?.state ===
        "recording"
      ) {
        recorderRef.current.stop();
      }

      stopCameraStream();
      revokePreviewUrls();
    };
  }, []);

  useEffect(() => {
    if (
      captureMode === "camera" &&
      liveVideoRef.current &&
      streamRef.current
    ) {
      liveVideoRef.current.srcObject =
        streamRef.current;
    }
  }, [captureMode]);

  function resetCapture() {
    clearRecordingTimeout();
    discardRecordingRef.current = true;

    if (
      recorderRef.current?.state ===
      "recording"
    ) {
      recorderRef.current.stop();
    }

    recorderRef.current = null;
    stopCameraStream();
    revokePreviewUrls();
    setPhotoUrl(null);
    setVideoUrl(null);
    setMediaLabel(null);
    setIsRecording(false);
    setCaptureMode("idle");
    setError(null);
  }

  function handlePhotoSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please choose a supported image file.",
      );
      event.target.value = "";
      return;
    }

    stopCameraStream();
    revokePreviewUrls();

    const previewUrl =
      URL.createObjectURL(file);

    photoUrlRef.current = previewUrl;
    setPhotoUrl(previewUrl);
    setVideoUrl(null);
    setCaptureMode("photo");
    setMediaLabel(
      `${file.name} · ${formatFileSize(file.size)}`,
    );
    setError(null);

    onMediaReady({
      kind: "photo",
      name: file.name,
      size: file.size,
    });

    event.target.value = "";
  }

  async function startCamera() {
    setError(null);
    setIsStartingCamera(true);
    stopCameraStream();

    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        throw new Error(
          "Video recording is not supported by this browser.",
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: true,
        });

      if (!isMountedRef.current) {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop(),
          );
        return;
      }

      streamRef.current = stream;
      setCaptureMode("camera");
    } catch (cameraError) {
      const message =
        cameraError instanceof Error
          ? cameraError.message
          : "Camera access was not available.";

      if (isMountedRef.current) {
        setError(message);
        setCaptureMode("idle");
      }
    } finally {
      if (isMountedRef.current) {
        setIsStartingCamera(false);
      }
    }
  }

  function stopRecording() {
    clearRecordingTimeout();

    if (
      recorderRef.current?.state ===
      "recording"
    ) {
      recorderRef.current.stop();
    }
  }

  function startRecording() {
    const stream = streamRef.current;

    if (
      recorderRef.current?.state ===
      "recording"
    ) {
      return;
    }

    if (!stream) {
      setError(
        "Camera access is required before recording.",
      );
      return;
    }

    try {
      const recorder =
        new MediaRecorder(stream);

      discardRecordingRef.current = false;
      recordingChunksRef.current = [];

      recorder.addEventListener(
        "dataavailable",
        (event) => {
          if (event.data.size > 0) {
            recordingChunksRef.current.push(
              event.data,
            );
          }
        },
      );

      recorder.addEventListener(
        "stop",
        () => {
          clearRecordingTimeout();

          const blob = new Blob(
            recordingChunksRef.current,
            {
              type:
                recorder.mimeType ||
                "video/webm",
            },
          );

          recordingChunksRef.current = [];
          recorderRef.current = null;
          stopCameraStream();

          if (
            discardRecordingRef.current ||
            !isMountedRef.current
          ) {
            return;
          }

          setIsRecording(false);

          if (blob.size === 0) {
            setError(
              "The recording was empty. Please try again.",
            );
            setCaptureMode("idle");
            return;
          }

          revokePreviewUrls();

          const previewUrl =
            URL.createObjectURL(blob);

          videoUrlRef.current = previewUrl;
          setVideoUrl(previewUrl);
          setPhotoUrl(null);
          setCaptureMode("video");
          setMediaLabel(
            `Short video · ${formatFileSize(blob.size)}`,
          );
          setError(null);

          onMediaReady({
            kind: "video",
            name: blob.type.includes("mp4")
              ? "felencho-studio-recording.mp4"
              : "felencho-studio-recording.webm",
            size: blob.size,
          });
        },
        { once: true },
      );

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setError(null);

      recordingTimeoutRef.current =
        setTimeout(
          stopRecording,
          MAX_RECORDING_MS,
        );
    } catch {
      setError(
        "Recording could not start in this browser.",
      );
    }
  }

  return (
    <section
      aria-label="Photo or video"
      className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handlePhotoSelected}
      />

      {captureMode === "idle" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-5 text-left transition hover:border-cyan-200/60 hover:bg-cyan-300/15"
          >
            <span className="block text-lg font-semibold">
              Upload a photo
            </span>
            <span className="mt-1 block text-sm text-white/50">
              Choose one clear image
            </span>
          </button>

          <button
            type="button"
            disabled={isStartingCamera}
            onClick={startCamera}
            className="rounded-2xl border border-violet-300/25 bg-violet-300/10 px-5 py-5 text-left transition hover:border-violet-200/60 hover:bg-violet-300/15 disabled:cursor-wait disabled:opacity-55"
          >
            <span className="block text-lg font-semibold">
              {isStartingCamera
                ? "Opening camera…"
                : "Record a short video"}
            </span>
            <span className="mt-1 block text-sm text-white/50">
              Up to 30 seconds
            </span>
          </button>
        </div>
      ) : null}

      {captureMode === "camera" ? (
        <div>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full object-cover"
            />

            {isRecording ? (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                Recording
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                isRecording
                  ? stopRecording
                  : startRecording
              }
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "bg-violet-300 text-[#190a2d] hover:bg-violet-200"
              }`}
            >
              {isRecording
                ? "Stop recording"
                : "Start recording"}
            </button>

            <button
              type="button"
              disabled={isRecording}
              onClick={resetCapture}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/60 transition hover:border-white/25 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {captureMode === "photo" && photoUrl ? (
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <Image
              src={photoUrl}
              alt="Selected photo preview"
              fill
              unoptimized
              className="object-contain"
            />
          </div>

          <MediaReadyFooter
            label={mediaLabel}
            onChooseAgain={resetCapture}
          />
        </div>
      ) : null}

      {captureMode === "video" && videoUrl ? (
        <div>
          <video
            src={videoUrl}
            controls
            playsInline
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />

          <MediaReadyFooter
            label={mediaLabel}
            onChooseAgain={resetCapture}
          />
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-white/35">
        Phase 1 keeps this media on your device.
        It is not uploaded or analyzed.
      </p>
    </section>
  );
}

function MediaReadyFooter({
  label,
  onChooseAgain,
}: {
  label: string | null;
  onChooseAgain: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-emerald-200">
          Media ready
        </p>
        {label ? (
          <p className="mt-1 text-xs text-white/40">
            {label}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onChooseAgain}
        className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-white/25 hover:text-white"
      >
        Choose again
      </button>
    </div>
  );
}
