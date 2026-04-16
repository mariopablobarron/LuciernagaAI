import { logInfo } from "@/lib/logger";
import { fetchWithTimeout } from "@/lib/utils";

const HEYGEN_BASE = "https://api.heygen.com";
const REQUEST_TIMEOUT_MS = 30_000;

type HeygenGenerateResponse = {
  data?: { video_id?: string };
  error?: { message?: string } | null;
};

type HeygenStatus =
  | "pending"
  | "processing"
  | "waiting"
  | "completed"
  | "failed";

type HeygenStatusResponse = {
  data?: {
    id?: string;
    status?: HeygenStatus;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: { detail?: string; message?: string } | null;
  };
};

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY?.trim();
  if (!key) throw new Error("HEYGEN_API_KEY is not configured");
  return key;
}

function getVoiceId(): string {
  const id = process.env.HEYGEN_VOICE_ID?.trim();
  if (!id) throw new Error("HEYGEN_VOICE_ID is not configured");
  return id;
}

export async function createAvatarVideo(params: {
  avatarId: string;
  script: string;
  voiceId?: string;
}): Promise<{ videoId: string }> {
  const apiKey = getApiKey();
  const voiceId = params.voiceId?.trim() || getVoiceId();

  const res = await fetchWithTimeout(
    `${HEYGEN_BASE}/v2/video/generate`,
    {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: params.avatarId,
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              input_text: params.script,
              voice_id: voiceId,
            },
          },
        ],
        dimension: { width: 720, height: 1280 },
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HeyGen generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as HeygenGenerateResponse;
  const videoId = json.data?.video_id;
  if (!videoId) {
    throw new Error(
      `HeyGen generate returned no video_id: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }

  logInfo("HEYGEN", "video_generation_requested", {
    videoId,
    avatarId: params.avatarId,
  });
  return { videoId };
}

export async function getAvatarVideoStatus(videoId: string): Promise<{
  status: HeygenStatus;
  videoUrl?: string;
  errorMessage?: string;
}> {
  const apiKey = getApiKey();

  const res = await fetchWithTimeout(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    {
      method: "GET",
      headers: { "X-Api-Key": apiKey },
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HeyGen status failed: HTTP ${res.status} — ${text.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as HeygenStatusResponse;
  const data = json.data;
  if (!data?.status) throw new Error("HeyGen status returned empty data");

  return {
    status: data.status,
    videoUrl: data.video_url,
    errorMessage: data.error?.detail ?? data.error?.message,
  };
}

export async function downloadAvatarVideo(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Avatar video download failed: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}
