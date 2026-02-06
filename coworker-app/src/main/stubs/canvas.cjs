// Stub for canvas module - pdf.js-extract bundles pdf.js which requires canvas
// for image rendering, but we only use text extraction so this is never called.
module.exports = {
  createCanvas: () => {
    throw new Error("canvas is not available - image rendering not supported");
  },
};
