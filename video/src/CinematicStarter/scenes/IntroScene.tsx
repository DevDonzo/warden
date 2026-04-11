import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CinematicPalette } from "../types";

type IntroSceneProps = {
  headline: string;
  subheadline: string;
  palette: CinematicPalette;
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  headline,
  subheadline,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 17, stiffness: 120, mass: 0.8 },
  });
  const badgeIn = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.9 },
  });

  const headlineY = interpolate(enter, [0, 1], [46, 0]);
  const headlineOpacity = interpolate(enter, [0, 1], [0, 1]);
  const subtitleOpacity = interpolate(frame, [18, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [18, 40], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowOpacity = interpolate(frame, [0, 35, 72], [0.25, 0.55, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: palette.textPrimary,
      }}
    >
      <div
        style={{
          marginBottom: 34,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: palette.accent,
          border: `1px solid ${palette.accent}55`,
          borderRadius: 9999,
          padding: "10px 24px",
          background: "rgba(5, 14, 28, 0.55)",
          boxShadow: `0 0 36px ${palette.accent}22`,
          opacity: badgeIn,
          transform: `translateY(${interpolate(badgeIn, [0, 1], [18, 0])}px)`,
        }}
      >
        Autonomous Security Agent
      </div>
      <div
        style={{
          fontSize: 126,
          lineHeight: 1.05,
          fontWeight: 800,
          letterSpacing: 0.2,
          transform: `translateY(${headlineY}px)`,
          opacity: headlineOpacity,
          textShadow: "0 18px 64px rgba(0,0,0,0.55)",
          paddingInline: 160,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          marginTop: 30,
          fontSize: 43,
          fontWeight: 500,
          color: palette.textSecondary,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
          maxWidth: 1380,
          lineHeight: 1.3,
        }}
      >
        {subheadline}
      </div>
      <div
        style={{
          width: 780,
          height: 7,
          borderRadius: 9999,
          marginTop: 38,
          background: `linear-gradient(90deg, ${palette.accentSecondary}00 0%, ${palette.accentSecondary} 50%, ${palette.accentSecondary}00 100%)`,
          opacity: glowOpacity,
          boxShadow: `0 0 48px ${palette.accentSecondary}88`,
        }}
      />
    </div>
  );
};
