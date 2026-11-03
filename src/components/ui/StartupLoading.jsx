import styles from './StartupLoading.module.css';

export function StartupLoading() {
  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.content}>
        {/* Keep the supplied SVG intact, including its embedded artwork. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src="/icons/srvonclick-loading.svg" width="612" height="485" alt="שירות בקליק" />
        <div className={styles.copy}>
          <h1>טוענים את המערכת</h1>
          <p>עוד רגע, מתחילים</p>
        </div>
        <div className={styles.track} aria-hidden="true">
          <span className={styles.bar} />
        </div>
      </div>
    </div>
  );
}
