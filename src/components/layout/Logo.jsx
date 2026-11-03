export function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG brand asset
    <img className="system-logo" src="/icons/srvonclick-loading.svg" width="42" height="42" alt="" aria-hidden="true" style={{ objectFit: 'contain', flexShrink: 0 }} />
  );
}