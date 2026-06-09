export const worldAssetContract = {
  tile: {
    width: 64,
    height: 64
  },
  character: {
    sourceFrameWidth: 128,
    sourceFrameHeight: 128,
    runtimeDrawWidth: 64,
    runtimeDrawHeight: 96,
    anchorX: 64,
    anchorY: 112,
    minTopMargin: 8,
    minSideMargin: 10,
    maxAnchorDrift: 2,
    minVerticalStride: 3,
    collisionWidth: 34,
    collisionHeight: 28
  },
  directions: ["down", "left", "right", "up"],
  framesPerDirection: 4
};
