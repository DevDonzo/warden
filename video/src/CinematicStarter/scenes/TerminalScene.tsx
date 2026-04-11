import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CinematicProps } from "../types";

type TerminalSceneProps = Pick<
  CinematicProps,
  "terminalCommand" | "terminalOutput" | "palette"
>;

const CMD_COLOR = "#99b8ff";

const getLineColor = (line: string, palette: CinematicProps["palette"]) => {
  if (line.startsWith("[Watchman]")) {
    return "#a8bdff";
  }
  if (line.startsWith("[Engineer]")) {
    return "#c3d2ff";
  }
  if (line.startsWith("[Diplomat]")) {
    return "#d8e3ff";
  }
  if (line.startsWith("PR created:")) {
    return "#9eb6ff";
  }
  if (line.startsWith("✅")) {
    return "#e8eefc";
  }
  return palette.textSecondary;
};

export const TerminalScene: React.FC<TerminalSceneProps> = ({
  terminalCommand,
  terminalOutput,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 190, stiffness: 170, mass: 1.05 },
  });
  const enterY = interpolate(enter, [0, 1], [240, 0]);
  const enterOpacity = interpolate(enter, [0, 1], [0.3, 1]);

  const rotateY = interpolate(frame, [0, durationInFrames], [14, -10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rotateX = interpolate(frame, [0, durationInFrames], [8, -2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, durationInFrames], [0.94, 1.01], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const charsPerSecond = 20;
  const framesPerChar = fps / charsPerSecond;
  const typingEndFrame = Math.ceil(terminalCommand.length * framesPerChar);
  const typedCount = Math.floor(
    interpolate(frame, [0, typingEndFrame], [0, terminalCommand.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const typedCommand = terminalCommand.slice(0, typedCount);

  const outputStartFrame = typingEndFrame + 8;
  const framesPerOutputLine = 6;
  const visibleLineCount = Math.floor(
    interpolate(
      frame,
      [outputStartFrame, outputStartFrame + terminalOutput.length * framesPerOutputLine],
      [0, terminalOutput.length],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );

  const cursorBlink = Math.floor(frame / 14) % 2 === 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1800,
      }}
    >
      <div
        style={{
          width: 1650,
          height: 820,
          borderRadius: 24,
          background: "rgba(246, 248, 251, 0.98)",
          boxShadow: "0 50px 120px rgba(0, 0, 0, 0.42)",
          overflow: "hidden",
          transform: `translateY(${enterY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          opacity: enterOpacity,
          border: "1px solid rgba(255,255,255,0.75)",
        }}
      >
        <div
          style={{
            height: 58,
            background: "linear-gradient(180deg, #fefefe 0%, #eceff4 100%)",
            borderBottom: "1px solid #d6dde9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 13, height: 13, borderRadius: 9999, background: "#ff5f57" }} />
            <div style={{ width: 13, height: 13, borderRadius: 9999, background: "#febc2e" }} />
            <div style={{ width: 13, height: 13, borderRadius: 9999, background: "#28c840" }} />
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 630,
              color: "#5e6979",
              letterSpacing: 0.2,
            }}
          >
            Terminal
          </div>
          <div style={{ width: 56 }} />
        </div>
        <div
          style={{
            width: "100%",
            height: 762,
            background: "linear-gradient(180deg, #0b1322 0%, #0c172d 100%)",
            padding: "26px 34px",
            fontFamily: "SF Mono, Menlo, Monaco, Consolas, monospace",
            fontSize: 29,
            lineHeight: 1.4,
            color: palette.textPrimary,
          }}
        >
          <div style={{ color: "#9ec8ff", marginBottom: 6 }}>
            dev@warden-demo ~ %
          </div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: CMD_COLOR, fontWeight: 700 }}>$</span>
            <span style={{ marginLeft: 14, color: "#f4f7ff", fontWeight: 560 }}>{typedCommand}</span>
            <span
              style={{
                marginLeft: 5,
                width: 15,
                height: 34,
                borderRadius: 2,
                background: "#f4f7ff",
                opacity: cursorBlink ? 1 : 0.18,
              }}
            />
          </div>

          {terminalOutput.slice(0, visibleLineCount).map((line, index) => {
            const lineFrame = frame - (outputStartFrame + index * framesPerOutputLine);
            const lineOpacity = interpolate(lineFrame, [0, 4], [0.2, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={`${line}-${index}`}
                style={{
                  color: getLineColor(line, palette),
                  opacity: lineOpacity,
                  transform: `translateY(${interpolate(lineFrame, [0, 5], [8, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}px)`,
                  whiteSpace: "pre-wrap",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
