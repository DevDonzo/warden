import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CinematicProps } from "../types";

type FeatureSceneProps = Pick<CinematicProps, "agentCards" | "palette">;

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  agentCards,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sectionLabelOpacity = interpolate(frame, [0, 20], [0.45, 1], {
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
        alignItems: "stretch",
        justifyContent: "center",
        gap: 34,
        paddingInline: 72,
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: palette.textPrimary,
          opacity: sectionLabelOpacity,
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 2.1,
            textTransform: "uppercase",
            color: palette.accent,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          The Council
        </div>
        <div
          style={{
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          Three Agents. One Secure Pipeline.
        </div>
      </div>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {agentCards.slice(0, 3).map((agent, index) => {
        const delay = index * 12;
        const localFrame = frame - delay;
        const rise = spring({
          frame: localFrame,
          fps,
          config: { damping: 17, stiffness: 140, mass: 0.85 },
        });

        const y = interpolate(rise, [0, 1], [58, 0]);
        const opacity = interpolate(rise, [0, 1], [0.28, 1]);
        const glow = 0.18 + ((Math.sin(frame / 15 + index * 0.9) + 1) / 2) * 0.24;

        return (
          <div
            key={agent.name}
            style={{
              width: 576,
              minHeight: 430,
              borderRadius: 28,
              padding: 38,
              background: palette.panelBackground,
              border: `1px solid rgba(148, 163, 184, ${glow})`,
              boxShadow: "0 22px 90px rgba(2, 8, 20, 0.62)",
              transform: `translateY(${y}px)`,
              opacity,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 22,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 9999,
                background:
                  index === 1
                    ? palette.accentSecondary
                    : palette.accent,
                boxShadow: `0 0 40px ${
                  index === 1 ? palette.accentSecondary : palette.accent
                }`,
              }}
            />
            <div
              style={{
                color: palette.textPrimary,
                fontSize: 52,
                lineHeight: 1.1,
                fontWeight: 700,
              }}
            >
              {agent.name}
            </div>
            <div
              style={{
                color: palette.accent,
                fontSize: 29,
                lineHeight: 1.2,
                fontWeight: 650,
              }}
            >
              {agent.role}
            </div>
            <div
              style={{
                color: palette.textSecondary,
                fontSize: 30,
                lineHeight: 1.35,
                fontWeight: 480,
              }}
            >
              {agent.detail}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
};
