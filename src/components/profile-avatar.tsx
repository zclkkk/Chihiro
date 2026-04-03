"use client";

import Image from "next/image";
import { useState } from "react";

type ProfileAvatarProps = {
  author: string;
  src?: string;
};

function getInitial(author: string) {
  const text = author.trim();

  if (!text) {
    return "?";
  }

  return text[0].toUpperCase();
}

export function ProfileAvatar({ author, src }: ProfileAvatarProps) {
  const [showFallback, setShowFallback] = useState(!src);

  if (showFallback || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-white text-6xl font-semibold text-zinc-500 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-300">
        <span aria-hidden="true">{getInitial(author)}</span>
        <span className="sr-only">{author} avatar placeholder</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`${author} avatar`}
      fill
      priority
      sizes="(min-width: 1024px) 30rem, (min-width: 640px) 24rem, 20rem"
      className="object-cover"
      onError={() => setShowFallback(true)}
    />
  );
}
