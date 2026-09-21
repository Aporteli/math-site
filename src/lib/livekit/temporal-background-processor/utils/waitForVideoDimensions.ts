/**
 * Resolves once the video element has non-zero dimensions,
 * or after a 5s timeout (with a warning).
 */
export function waitForVideoDimensions(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const isReady = () => video.videoWidth > 0 && video.videoHeight > 0;
    if (isReady()) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('loadedmetadata', onReady);
      resolve();
    };
    const onReady = () => {
      if (isReady()) finish();
    };

    const intervalId = setInterval(onReady, 50);
    const timeoutId = setTimeout(() => {
      if (!isReady()) {
        console.warn('[TemporalBG] video dimensions never became available');
      }
      finish();
    }, 5000);

    video.addEventListener('loadeddata', onReady);
    video.addEventListener('loadedmetadata', onReady);
  });
}
