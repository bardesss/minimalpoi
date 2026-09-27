/** Apple platforms (iOS, iPadOS — which reports "Macintosh" — and macOS) open
 * maps.apple.com universal links in Apple Maps. */
export function isApplePlatform(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(ua);
}

/** Turn-by-turn directions to a coordinate in the platform's maps app. Both
 * are universal links: they open the native app when installed, else the web. */
export function directionsUrl(lat: number, lng: number, apple: boolean = isApplePlatform()): string {
  const dest = `${lat},${lng}`;
  return apple
    ? `https://maps.apple.com/?daddr=${dest}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}
