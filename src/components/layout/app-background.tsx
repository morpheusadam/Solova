"use client";

import { useEffect } from "react";

import { backgroundCss } from "~/lib/wallpapers";
import { api } from "~/trpc/react";

/**
 * Applies the user's chosen app-wide background to <body>. Null/absent →
 * the default token gradient from globals.css takes over.
 */
export function AppBackground() {
  const { data: settings } = api.settings.get.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const css = backgroundCss(settings?.appBackground);
    const body = document.body;
    if (css) {
      body.style.background = css;
      body.style.backgroundAttachment = "fixed";
    } else {
      body.style.background = "";
      body.style.backgroundAttachment = "";
    }
    return () => {
      body.style.background = "";
      body.style.backgroundAttachment = "";
    };
  }, [settings?.appBackground]);

  return null;
}
