/* Homepage hero: Ammon walks in and sits on the sofa, once and muted, then the hero rests on a
   sharp still of the final frame. A pause control shows while it plays. */
(() => {
  const hero = document.querySelector('.reveal-hero');
  if (!hero || !hero.classList.contains('reveal-motion-mode')) return;
  const video = hero.querySelector('.reveal-video');
  const pause = hero.querySelector('.reveal-pause');
  const label = pause && pause.querySelector('.reveal-pause-label');
  if (!video || !hero.dataset.video) return;

  let done = false;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;

  // Rest on the final still. Used at the natural end and whenever playback cannot continue.
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(slowNetwork);
    hero.classList.add('is-done');
    if (pause) pause.hidden = true;
    setTimeout(() => { video.pause(); video.removeAttribute('src'); video.load(); }, 500);
  };
  // On a slow connection, skip straight to Ammon on the sofa instead of holding an empty sofa.
  const slowNetwork = setTimeout(() => { if (!hero.classList.contains('is-playing')) finish(); }, 2500);

  const play = () => {
    const attempt = video.play();
    // iOS Low Power Mode and some browsers block muted autoplay.
    if (attempt && attempt.catch) attempt.catch(finish);
  };

  video.addEventListener('playing', () => {
    if (done) return;
    hero.classList.add('is-playing');
    if (pause) pause.hidden = false;
  }, { once: true });
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);

  if (pause) pause.addEventListener('click', () => {
    const paused = pause.getAttribute('aria-pressed') === 'true';
    if (paused) play(); else video.pause();
    pause.setAttribute('aria-pressed', String(!paused));
    if (label) label.textContent = paused ? 'Pause video' : 'Play video';
  });

  video.src = hero.dataset.video;
  play();
})();
