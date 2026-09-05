import Image from "next/image";

interface LogoMarkProps {
  /** Size of the logo icon in pixels */
  size?: number;
  /** Show the live/active status dot */
  showDot?: boolean;
  className?: string;
}

/**
 * The PayPilot logo icon — the glowing "P" emblem.
 * Drop-in replacement for the old placeholder gradient square.
 */
export function LogoMark({ size = 32, showDot = false, className = "" }: LogoMarkProps) {
  return (
    <div
      className={`relative shrink-0 rounded-2xl overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Dark bg matching the logo background */}
      <div className="absolute inset-0 rounded-2xl bg-[#0D0B1E]" />
      <Image
        src="/logo.svg"
        alt="PayPilot logo"
        width={size}
        height={size}
        className="relative z-10 w-full h-full object-contain"
        priority
      />
      {showDot && (
        <span
          className="absolute -bottom-0.5 -right-0.5 z-20 h-2.5 w-2.5 rounded-full bg-jade-400 border-2 border-base-0"
          style={{ boxShadow: "0 0 6px rgba(34,192,138,0.8)" }}
        />
      )}
    </div>
  );
}

interface LogoLockupProps {
  /** Icon size */
  iconSize?: number;
  showDot?: boolean;
  /** Show "PayPilot" text + tagline alongside the icon */
  showText?: boolean;
  tagline?: string;
}

/**
 * Full logo lockup — icon + wordmark + tagline.
 * Used in sidebar, topbar mobile, login, landing.
 */
export function LogoLockup({
  iconSize = 32,
  showDot = true,
  showText = true,
  tagline = "Revenue Engine",
}: LogoLockupProps) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={iconSize} showDot={showDot} />
      {showText && (
        <div>
          <div
            className="font-bold tracking-tight text-ink-0 leading-none"
            style={{ fontSize: Math.max(iconSize * 0.44, 13) }}
          >
            PAYPILOT
          </div>
          <div
            className="font-mono text-violet-400 tracking-widest uppercase leading-none mt-0.5"
            style={{ fontSize: Math.max(iconSize * 0.28, 9) }}
          >
            {tagline}
          </div>
        </div>
      )}
    </div>
  );
}
