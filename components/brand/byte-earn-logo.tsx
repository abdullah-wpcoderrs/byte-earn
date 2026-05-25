import type { SVGProps } from "react";
import { cn } from "@/components/ui/utils";

type ByteEarnLogoProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

export function ByteEarnLogo({ className, ...props }: ByteEarnLogoProps) {
  return (
    <svg className={cn("size-10", className)} viewBox="0 0 64 64" role="img" aria-label="byte-earn" {...props}>
      <defs>
        <linearGradient id="byte-earn-logo-tile" x1="8" x2="56" y1="6" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10243f" />
          <stop offset="1" stopColor="#07101d" />
        </linearGradient>
        <linearGradient id="byte-earn-logo-mark" x1="15" x2="49" y1="14" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#36a3ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#byte-earn-logo-tile)" />
      <rect x="4" y="4" width="56" height="56" rx="12" fill="none" stroke="#67e8f9" strokeOpacity=".22" strokeWidth="2" />
      <path
        fill="url(#byte-earn-logo-mark)"
        d="M20 14h8v12.1c2.1-1.6 4.7-2.4 7.8-2.4 7.9 0 13.4 5.8 13.4 13.1 0 7.7-5.8 13.2-14 13.2H20V14Zm8 18.8v10.4h7.1c3.5 0 5.9-2.1 5.9-5.3 0-3.1-2.3-5.1-5.8-5.1H28Z"
      />
      <path fill="#b8f7ff" d="M43.5 11.5 46 17l5.5 2.5L46 22l-2.5 5.5L41 22l-5.5-2.5L41 17l2.5-5.5Z" />
      <circle cx="19" cy="18" r="3" fill="#b8f7ff" />
    </svg>
  );
}
