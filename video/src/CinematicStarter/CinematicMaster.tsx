import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { FeatureScene } from "./scenes/FeatureScene";
import { FinaleScene } from "./scenes/FinaleScene";
import { ModesScene } from "./scenes/ModesScene";
import { TerminalScene } from "./scenes/TerminalScene";
import { TIMING } from "./timing";
import { CinematicProps } from "./types";

export const CinematicMaster: React.FC<CinematicProps> = (props) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 22;
  const orbitalDriftX = Math.sin(frame / 34) * 84;
  const orbitalDriftY = Math.cos(frame / 46) * 70;
  const vignetteOpacity = interpolate(frame, [0, TIMING.outroEnd], [0.26, 0.48], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanlineOffset = (frame * 5) % 140;
  const grainOpacity = 0.04 + ((Math.sin(frame / 19) + 1) / 2) * 0.03;
  const sceneBoundaries = [TIMING.councilStart, TIMING.modesStart, TIMING.outroStart];
  const transitionGlow = sceneBoundaries.reduce((sum, boundary) => {
    const distance = Math.abs(frame - boundary);
    const intensity = Math.max(0, 1 - distance / 12);
    return sum + intensity;
  }, 0);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: `radial-gradient(circle at 14% 18%, ${props.palette.backgroundB} 0%, ${props.palette.backgroundA} 74%)`,
        fontFamily: "Avenir Next, Segoe UI, Helvetica, Arial, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(120deg, ${props.palette.accent}1c, transparent 45%, ${props.palette.accentSecondary}18)`,
          transform: `translateX(${drift}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          width: 760,
          height: 760,
          borderRadius: 9999,
          filter: "blur(80px)",
          background: `${props.palette.accentSecondary}18`,
          transform: `translate(${640 + orbitalDriftX}px, ${190 + orbitalDriftY}px)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 140px)",
          transform: `translateY(${scanlineOffset}px)`,
          opacity: 0.12,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)",
          mixBlendMode: "soft-light",
          opacity: grainOpacity,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${props.palette.accentSecondary}55 0%, transparent 60%)`,
          opacity: transitionGlow * 0.16,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      <Sequence
        from={TIMING.terminalStart}
        durationInFrames={TIMING.terminalEnd - TIMING.terminalStart}
      >
        <TerminalScene
          terminalCommand={props.terminalCommand}
          terminalOutput={props.terminalOutput}
          palette={props.palette}
        />
      </Sequence>

      <Sequence
        from={TIMING.councilStart}
        durationInFrames={TIMING.councilEnd - TIMING.councilStart}
      >
        <FeatureScene agentCards={props.agentCards} palette={props.palette} />
      </Sequence>

      <Sequence
        from={TIMING.modesStart}
        durationInFrames={TIMING.modesEnd - TIMING.modesStart}
      >
        <ModesScene scanModes={props.scanModes} palette={props.palette} />
      </Sequence>

      <Sequence
        from={TIMING.outroStart}
        durationInFrames={TIMING.outroEnd - TIMING.outroStart}
      >
        <FinaleScene
          loopSteps={props.loopSteps}
          ctaTitle={props.ctaTitle}
          ctaSubheadline={props.ctaSubheadline}
          palette={props.palette}
        />
      </Sequence>

      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 240px rgba(0, 0, 0, ${vignetteOpacity})`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
