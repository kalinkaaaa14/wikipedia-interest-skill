export type DespikeResult = {
  /** Daily values with spike days replaced by the local median. */
  robustValues: number[];
  spikeIndexes: number[];
};
