"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** false: render nothing instead of a placeholder (used for hover photos). */
  placeholder?: boolean;
};

/** Product photo that falls back to a patterned placeholder until the real image is added. */
export default function ProductImage({
  src, alt, sizes = "(max-width: 900px) 50vw, 25vw", priority, className, placeholder = true,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    if (!placeholder) return null;
    return (
      <div className={`ph ${className ?? ""}`} role="img" aria-label={alt}>
        <span>{alt.charAt(0)}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={{ objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
