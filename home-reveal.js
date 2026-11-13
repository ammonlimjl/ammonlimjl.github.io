/* Homepage hero: plays the walk-in once, muted, then rests on a sharp still of the final frame. */
(() => {
  const hero = document.querySelector('.reveal-hero');
  if (!hero || !hero.classList.contains('reveal-motion-mode')) return;
  const video = hero.querySelector('.reveal-video');
  const src = hero.dataset.video;
  if (!video || !src) return;

  let settled = false;
  // Show the end still. If the video never got going, this doubles as a gentle fade from door to room.
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(slowNetwork);
    hero.classList.add('is-ended');
    // Release the decoder once the still has faded in over the last frame.
    setTimeout(() => { if (!hero.classList.contains('is-playing')) video.removeAttribute('src'); }, 600);
  };
  // On a slow connection, do not hold people on the closed door.
  const slowNetwork = setTimeout(() => { if (!hero.classList.contains('is-playing')) { video.pause(); finish(); } }, 2500);

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.addEventListener('playing', () => { if (!settled) hero.classList.add('is-playing'); }, { once: true });
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  video.src = src;
  const attempt = video.play();
  // iOS Low Power Mode and some browsers block muted autoplay.
  if (attempt && attempt.catch) attempt.catch(finish);
})();
