"use client";

import { useState } from "react";
import Image from "next/image";

export function PlaceImage({
  src,
  alt,
  position = "center",
  sizes,
  eager = false,
}: {
  src: string;
  alt: string;
  position?: string;
  sizes: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState("");
  if (failed === src) return <span className="absolute inset-0 grid place-items-center bg-surface-2 p-4 text-muted">{alt || "Destination photograph unavailable"}</span>;
  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setFailed(src)}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      className="object-cover"
      style={{ objectPosition: position }}
    />
  );
}
