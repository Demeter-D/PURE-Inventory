import { useEffect, useLayoutEffect, useState } from "react";
import { measureTextWidth } from "../lib/measureText.js";

const FONT = "500 13.5px 'IBM Plex Sans', sans-serif";

export default function AutoWidthInput({
  value,
  placeholder,
  minWidth = 150,
  maxWidth = 240,
  padding = 26,
  style,
  ...rest
}) {
  const [width, setWidth] = useState(minWidth);
  const [fontsReady, setFontsReady] = useState(
    typeof document === "undefined" || !document.fonts || document.fonts.status === "loaded"
  );

  useEffect(() => {
    if (fontsReady || typeof document === "undefined" || !document.fonts) return;
    document.fonts.ready.then(() => setFontsReady(true));
  }, [fontsReady]);

  useLayoutEffect(() => {
    const text = value || placeholder || "";
    const measured = measureTextWidth(text, FONT) + padding;
    setWidth(Math.min(maxWidth, Math.max(minWidth, Math.ceil(measured))));
    // Re-measure once the real web font is loaded — canvas measurement can
    // silently fall back to a narrower substitute font before then.
  }, [value, placeholder, minWidth, maxWidth, padding, fontsReady]);

  return <input {...rest} value={value} placeholder={placeholder} style={{ ...style, width }} />;
}
