import { SOCIAL_ICONS } from "lib/social-icons";
import type { SocialButton } from "lib/settings/schemas";
import { cn } from "lib/utils";

export function SocialIcon({ button, className }: { button: Pick<SocialButton, "icon" | "customViewBox" | "customPaths" | "iconColor">; className?: string }) {
  const preset = button.icon !== "custom" ? SOCIAL_ICONS[button.icon] : undefined;
  const viewBox = preset ? preset.viewBox : button.customViewBox || "0 0 24 24";
  const paths = preset ? preset.paths : button.customPaths;
  if (!paths.length) return null;
  return (
    <svg viewBox={viewBox} className={cn("size-6", className)} fill={button.iconColor} aria-hidden focusable="false">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** Square 3D buttons (icon + background colour + link) configured in Admin > Storefront > Footer buttons. */
export function SocialButtons({ buttons, size = 56 }: { buttons: SocialButton[]; size?: number }) {
  const visible = buttons.filter((b) => b.enabled);
  if (!visible.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 md:justify-start">
      {visible.map((b) => (
        <a
          key={b.id}
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={b.label}
          title={b.label}
          className="relative top-0 grid place-items-center rounded-xl transition-all duration-150 hover:-top-0.5 active:top-1"
          style={{
            width: size,
            height: size,
            background: b.bgColor,
            boxShadow: `0 5px 0 color-mix(in srgb, ${b.bgColor} 65%, black), 0 12px 20px color-mix(in srgb, ${b.bgColor} 30%, transparent)`,
          }}
        >
          <SocialIcon button={b} />
        </a>
      ))}
    </div>
  );
}
