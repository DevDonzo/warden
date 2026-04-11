import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CinematicProps } from "../types";

type FinaleSceneProps = Pick<
  CinematicProps,
  "loopSteps" | "ctaTitle" | "ctaSubheadline" | "palette"
>;

export const FinaleScene: React.FC<FinaleSceneProps> = ({
  loopSteps,
  ctaTitle,
  ctaSubheadline,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame + 8,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.85 },
  });

  const scale = interpolate(entrance, [0, 1], [0.9, 1]);
  const opacity = interpolate(entrance, [0, 1], [0.24, 1]);
  const lineWidth = interpolate(frame, [0, 52], [220, 1280], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: lineWidth,
            height: 7,
            borderRadius: 9999,
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.accentSecondary})`,
            boxShadow: `0 0 52px ${palette.accent}aa`,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginTop: 10,
            flexWrap: "wrap",
            maxWidth: 1650,
          }}
        >
          {loopSteps.map((step, index) => {
            const reveal = interpolate(frame, [index * 7, index * 7 + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={step}
                style={{
                  borderRadius: 9999,
                  border: `1px solid ${palette.textSecondary}66`,
                  padding: "10px 20px",
                  color: palette.textPrimary,
                  fontWeight: 650,
                  fontSize: 28,
                  opacity: reveal,
                  transform: `translateY(${interpolate(reveal, [0, 1], [12, 0])}px)`,
                }}
              >
                {step}
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: 0.4,
            color: palette.textPrimary,
            textShadow: "0 18px 60px rgba(0,0,0,0.45)",
            marginTop: 14,
          }}
        >
          {ctaTitle}
        </div>
        <div
          style={{
            color: palette.textSecondary,
            fontSize: 42,
            lineHeight: 1.3,
            fontWeight: 500,
            textAlign: "center",
            maxWidth: 1380,
          }}
        >
          {ctaSubheadline}
        </div>
      </div>
    </div>
  );
};
