"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WordAudioStatus =
  | "idle"
  | "loading"
  | "playing"
  | "ready"
  | "needs-interaction"
  | "error";

const LOAD_TIMEOUT_MS = 7_000;

function getAudioSources(word: string) {
  const encodedWord = encodeURIComponent(word.trim());

  return [
    `https://dict.youdao.com/dictvoice?audio=${encodedWord}&type=2`,
    `https://dict.youdao.com/dictvoice?audio=${encodedWord}&type=1`,
  ];
}

function isAutoplayBlocked(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

export function useWordAudio(word: string) {
  const [status, setStatus] = useState<WordAudioStatus>("idle");
  const [message, setMessage] = useState("进入单词时会自动播放发音");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const playbackStartedRef = useRef(false);
  const failedSourcesRef = useRef(new Set<string>());

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopCurrent = useCallback(() => {
    requestRef.current += 1;
    clearTimeoutRef();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, [clearTimeoutRef]);

  const play = useCallback(
    (fromUserGesture = true) => {
      stopCurrent();
      playbackStartedRef.current = false;
      const requestId = requestRef.current;
      const sources = getAudioSources(word).filter(
        (source) => !failedSourcesRef.current.has(source),
      );

      const isCurrent = () => requestRef.current === requestId;

      const speakWithBrowser = () => {
        if (!isCurrent()) return;

        if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
          setStatus("error");
          setMessage("当前浏览器没有可用的英语发音，请换用 Safari 或 Chrome");
          return;
        }

        const synthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(word);
        const voices = synthesis.getVoices();
        const preferredVoice = voices.find(
          (voice) => voice.lang.toLowerCase() === "en-us",
        ) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));

        utterance.lang = preferredVoice?.lang || "en-US";
        utterance.voice = preferredVoice ?? null;
        utterance.rate = 0.82;
        utterance.pitch = 1;
        utterance.onstart = () => {
          if (!isCurrent()) return;
          playbackStartedRef.current = true;
          clearTimeoutRef();
          setStatus("playing");
          setMessage("正在播放浏览器发音");
        };
        utterance.onend = () => {
          if (!isCurrent()) return;
          setStatus("ready");
          setMessage("没听清可以再点一次");
        };
        utterance.onerror = (event) => {
          if (!isCurrent() || event.error === "canceled" || event.error === "interrupted") {
            return;
          }
          clearTimeoutRef();

          if (event.error === "not-allowed") {
            setStatus("needs-interaction");
            setMessage("浏览器拦截了自动播放，点一下喇叭即可听音");
            return;
          }

          setStatus("error");
          setMessage("发音播放失败，请检查手机媒体音量后重试");
        };

        // Safari may garbage-collect an utterance unless it remains strongly referenced.
        utteranceRef.current = utterance;
        setStatus("loading");
        setMessage("正在准备浏览器发音…");
        synthesis.cancel();
        synthesis.resume();
        synthesis.speak(utterance);

        timeoutRef.current = setTimeout(() => {
          if (!isCurrent() || playbackStartedRef.current) return;
          if (fromUserGesture) {
            setStatus("error");
            setMessage("系统发音没有响应，请检查静音模式后再试一次");
          } else {
            setStatus("needs-interaction");
            setMessage("没有自动播放？点一下喇叭即可听音");
          }
        }, 1_500);
      };

      const tryRemoteAudio = (sourceIndex: number) => {
        if (!isCurrent()) return;
        const source = sources[sourceIndex];
        if (!source) {
          speakWithBrowser();
          return;
        }

        const audio = new Audio(source);
        audio.preload = "auto";
        audioRef.current = audio;
        setStatus("loading");
        setMessage("正在加载真人词典发音…");
        let sourceFailed = false;

        const tryNextSource = () => {
          if (!isCurrent() || sourceFailed) return;
          sourceFailed = true;
          clearTimeoutRef();
          failedSourcesRef.current.add(source);
          audio.pause();
          audioRef.current = null;
          tryRemoteAudio(sourceIndex + 1);
        };

        audio.onplaying = () => {
          if (!isCurrent()) return;
          playbackStartedRef.current = true;
          clearTimeoutRef();
          setStatus("playing");
          setMessage("正在播放真人词典发音");
        };
        audio.onended = () => {
          if (!isCurrent()) return;
          setStatus("ready");
          setMessage("没听清可以再点一次");
        };
        audio.onerror = tryNextSource;
        timeoutRef.current = setTimeout(tryNextSource, LOAD_TIMEOUT_MS);

        void audio.play().catch((error: unknown) => {
          if (!isCurrent()) return;
          clearTimeoutRef();

          if (!fromUserGesture && isAutoplayBlocked(error)) {
            sourceFailed = true;
            setStatus("needs-interaction");
            setMessage("浏览器拦截了自动播放，点一下喇叭即可听音");
            return;
          }

          tryNextSource();
        });
      };

      tryRemoteAudio(0);
    },
    [clearTimeoutRef, stopCurrent, word],
  );

  useEffect(() => {
    failedSourcesRef.current = new Set();
    const autoPlayTimer = window.setTimeout(() => play(false), 120);

    return () => {
      window.clearTimeout(autoPlayTimer);
      stopCurrent();
    };
  }, [play, stopCurrent, word]);

  return {
    play: () => play(true),
    status,
    message,
    isLoading: status === "loading",
    isPlaying: status === "playing",
  };
}
