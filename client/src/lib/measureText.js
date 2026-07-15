let canvas;

export function measureTextWidth(text, font) {
  if (!canvas) canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  return ctx.measureText(text).width;
}
