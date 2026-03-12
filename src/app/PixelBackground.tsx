"use client";

import { useState, useEffect } from "react";

type SceneState = "calm" | "stressed" | "chaos" | "hell";

const ALL_STATES: SceneState[] = ["calm", "stressed", "chaos", "hell"];

interface Stats {
  uptime: number;
  morale: number;
  cloud_cost: number;
  reputation: number;
}

function getState(stats: Stats): SceneState {
  const avg = (stats.uptime + stats.morale + (100 - stats.cloud_cost) + stats.reputation) / 4;
  if (avg < 30) return "hell";
  if (avg < 50) return "chaos";
  if (avg < 70) return "stressed";
  return "calm";
}

const IMAGES: Record<SceneState, [string, string]> = {
  calm: ["/office-calm-1.png", "/office-calm-2.png"],
  stressed: ["/office-stressed-1.png", "/office-stressed-2.png"],
  chaos: ["/office-chaos-1.png", "/office-chaos-2.png"],
  hell: ["/office-hell-1.png", "/office-hell-2.png"],
};

// Preload all images on mount so frame swaps never flash
function usePreloadImages() {
  useEffect(() => {
    for (const state of ALL_STATES) {
      for (const src of IMAGES[state]) {
        const img = new Image();
        img.src = src;
      }
    }
  }, []);
}

export default function PixelBackground({ stats }: { stats: Stats }) {
  const state = getState(stats);
  const [frame, setFrame] = useState(0);

  usePreloadImages();

  // Alternate frames instantly every 1.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      {ALL_STATES.map((s) => (
        <img
          key={s}
          src={IMAGES[s][frame]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
          style={{
            opacity: s === state ? 1 : 0,
            filter: "blur(2px)",
          }}
          draggable={false}
        />
      ))}
    </div>
  );
}
