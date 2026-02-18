"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { authService } from "@/services";

function LinkCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const linked = searchParams.get("linked");
    const error = searchParams.get("error");

    const sendAndClose = (data: Record<string, unknown>) => {
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(
            { type: "oauth_link_result", ...data },
            window.location.origin
          );
        } catch {
          // opener might be cross-origin or closed
        }
        // Small delay to ensure message is received before closing
        setTimeout(() => window.close(), 100);
      } else {
        // Fallback: opened directly (not via window.open) — redirect to profile
        const path = data.success
          ? "/profile?tab=authentication"
          : `/profile?tab=authentication&error=${encodeURIComponent(String(data.error ?? "เกิดข้อผิดพลาด"))}`;
        window.location.href = path;
      }
    };

    if (error) {
      sendAndClose({ success: false, error: decodeURIComponent(error) });
      return;
    }

    if (!accessToken || !refreshToken || !linked) {
      sendAndClose({ success: false, error: "ข้อมูลการเชื่อมต่อไม่ครบถ้วน" });
      return;
    }

    // Save updated tokens so the main tab has fresh ones
    authService.setTokens(accessToken, refreshToken);

    const providerName =
      linked === "google" ? "Google" : linked === "github" ? "GitHub" : linked;

    sendAndClose({ success: true, provider: linked, providerName });
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Spinner size="lg" color="primary" />
      <p className="text-sm text-slate-500">กำลังดำเนินการ...</p>
      <p className="text-xs text-slate-400">หน้าต่างนี้จะปิดโดยอัตโนมัติ</p>
    </div>
  );
}

export default function AuthLinkCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Suspense fallback={<Spinner size="lg" color="primary" />}>
        <LinkCallbackContent />
      </Suspense>
    </div>
  );
}
