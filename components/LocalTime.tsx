'use client';

import { useEffect, useState } from 'react';

// A date in the viewer's own time zone and format. The server can't know those, so it renders UTC first.
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(`${iso.slice(0, 16).replace('T', ' ')} UTC`);
  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }));
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
