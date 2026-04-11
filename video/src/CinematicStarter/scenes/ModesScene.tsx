import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CinematicProps } from "../types";

type ModesSceneProps = Pick<CinematicProps, "scanModes" | "palette">;

export const ModesScene: React.FC<ModesSceneProps> = ({ scanModes, palette }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOpacity = interpolate(frame, [0, 18], [0.5, 1], {
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
        paddingInline: 110,
        gap: 30,
      }}
    >
      <div
        style={{
          textAlign: "center",
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            color: palette.accent,
            textTransform: "uppercase",
            fontSize: 24,
            letterSpacing: 1.8,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Coverage
        </div>
        <div
          style={{
            color: palette.textPrimary,
            fontSize: 66,
            lineHeight: 1.1,
            fontWeight: 800,
          }}
        >
          App Dependencies + Infrastructure
        </div>
      </div>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "stretch",
          gap: 24,
        }}
      >
        {scanModes.slice(0, 2).map((mode, index) => {
          const side = index === 0 ? -1 : 1;
          const entrance = spring({
            frame: frame + 8 - index * 8,
            fps,
            config: { damping: 18, stiffness: 130, mass: 0.9 },
          });
          const x = interpolate(entrance, [0, 1], [side * 160, 0]);
          const opacity = interpolate(entrance, [0, 1], [0.35, 1]);
          const borderColor = index === 0 ? palette.accent : palette.accentSecondary;

          return (
            <div
              key={mode.mode}
              style={{
                width: 810,
                minHeight: 430,
                borderRadius: 30,
                padding: 42,
                background: palette.panelBackground,
                border: `1px solid ${borderColor}88`,
                boxShadow: `0 20px 70px ${borderColor}22`,
                transform: `translateX(${x}px)`,
                opacity,
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <div
                style={{
                  color: borderColor,
                  fontSize: 62,
                  lineHeight: 1,
                  fontWeight: 850,
                  letterSpacing: 1.4,
                }}
              >
                {mode.mode}
              </div>
              <div
                style={{
                  color: palette.textPrimary,
                  fontSize: 36,
                  fontWeight: 700,
                  lineHeight: 1.25,
                }}
              >
                {mode.tools}
              </div>
              <div
                style={{
                  color: palette.textSecondary,
                  fontSize: 34,
                  lineHeight: 1.3,
                  fontWeight: 500,
                }}
              >
                {mode.outcome}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
