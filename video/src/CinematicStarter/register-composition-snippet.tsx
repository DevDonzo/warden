import { Composition } from "remotion";
import { CinematicMaster } from "./CinematicMaster";
import { DURATION_IN_FRAMES, FPS } from "./timing";
import { defaultCinematicProps } from "./types";

/*
Paste this <Composition> inside your RemotionRoot component:

<Composition
  id="WardenLinkedInCinematic"
  component={CinematicMaster}
  durationInFrames={DURATION_IN_FRAMES}
  fps={FPS}
  width={1920}
  height={1080}
  defaultProps={defaultCinematicProps}
/>
*/

export const _registerSnippetReference = {
  Composition,
  CinematicMaster,
  DURATION_IN_FRAMES,
  FPS,
  defaultCinematicProps,
};
