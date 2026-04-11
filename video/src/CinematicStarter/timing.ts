export const FPS = 30;

export const TIMING = {
  terminalStart: 0,
  terminalEnd: 132,
  councilStart: 132,
  councilEnd: 258,
  modesStart: 258,
  modesEnd: 372,
  outroStart: 372,
  outroEnd: 510,
} as const;

export const DURATION_IN_FRAMES = TIMING.outroEnd;
