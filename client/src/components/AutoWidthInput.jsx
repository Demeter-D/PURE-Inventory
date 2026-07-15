import { useLayoutEffect, useState } from "react";
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

  useLayoutEffect(() => {
    const text = value || placeholder || "";
    const measured = measureTextWidth(text, FONT) + padding;
    setWidth(Math.min(maxWidth, Math.max(minWidth, Math.ceil(measured))));
  }, [value, placeholder, minWidth, maxWidth, padding]);

  return <input {...rest} value={value} placeholder={placeholder} style={{ ...style, width }} />;
}
