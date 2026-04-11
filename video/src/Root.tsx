import { Composition } from "remotion";
import { CinematicMaster } from "./CinematicStarter/CinematicMaster";
import { DURATION_IN_FRAMES, FPS } from "./CinematicStarter/timing";
import { defaultCinematicProps } from "./CinematicStarter/types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WardenLinkedInCinematic"
      component={CinematicMaster}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={defaultCinematicProps}
    />
  );
};
