"use client";

import * as React from "react";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";
import { Button } from "@/core/ui/components/button";

type Props = {
  onScan: (code: string) => void;
};

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: {
      formats?: string[];
    }) => BarcodeDetectorLike;
  }
}

/**
 * Prefer native BarcodeDetector; fall back to @zxing/browser on video.
 * Manual part-number input is always available.
 */
export function BarcodeScanner({ onScan }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [active, setActive] = React.useState(false);
  const [manual, setManual] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [engine, setEngine] = React.useState<"native" | "zxing" | null>(null);
  const stopRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);

  async function start() {
    setError(null);
    stopRef.current?.();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (typeof window !== "undefined" && window.BarcodeDetector) {
        setEngine("native");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();
        setActive(true);

        let cancelled = false;
        stopRef.current = () => {
          cancelled = true;
          stream.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
          setActive(false);
        };

        const detector = new window.BarcodeDetector({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39"],
        });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              onScan(codes[0].rawValue.trim());
              stopRef.current?.();
              return;
            }
          } catch {
            // keep scanning
          }
          requestAnimationFrame(() => {
            void tick();
          });
        };
        void tick();
        return;
      }

      setEngine("zxing");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      setActive(true);
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        video,
        (result, _err, ctrl) => {
          if (result) {
            onScan(result.getText().trim());
            ctrl.stop();
            setActive(false);
          }
        },
      );
      stopRef.current = () => {
        controls.stop();
        setActive(false);
      };
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kamera kunde inte startas — använd manuell inmatning",
      );
      setActive(false);
    }
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Streckkod / QR</p>
        {engine ? (
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            {engine}
          </span>
        ) : null}
      </div>
      <video
        ref={videoRef}
        className="aspect-video w-full rounded-md bg-black object-cover"
        muted
        playsInline
      />
      <div className="flex gap-2">
        {!active ? (
          <Button type="button" className="flex-1" onClick={() => void start()}>
            Starta kamera
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={stop}
          >
            Stoppa
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="manual-scan">Manuellt artikelnummer</Label>
        <div className="flex gap-2">
          <Input
            id="manual-scan"
            className="font-mono"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Ange eller klistra in"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (manual.trim()) onScan(manual.trim());
            }}
          >
            Använd
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
