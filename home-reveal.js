/* Homepage hero: plays the walk-in once, dissolves to Ammon walking up to the sofa and sitting down,
   then rests on a sharp still of the final frame. Muted, plays once, with a pause control. */
(() => {
  const hero = document.querySelector('.reveal-hero');
  if (!hero || !hero.classList.contains('reveal-motion-mode')) return;
  const walk = hero.querySelector('.reveal-video');
  const sofa = hero.querySelector('.reveal-sofa');
  const pause = hero.querySelector('.reveal-pause');
  const label = pause && pause.querySelector('.reveal-pause-label');
  if (!walk || !sofa || !hero.dataset.video || !hero.dataset.sofa) return;

  let current = walk;
  let done = false;
  let sofaWait = 0;
  for (const v of [walk, sofa]) { v.muted = true; v.defaultMuted = true; v.playsInline = true; }

  // Rest on the final still. Used at the natural end and whenever playback cannot continue.
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(slowNetwork);
    clearTimeout(sofaWait);
    hero.classList.add('is-done');
    if (pause) pause.hidden = true;
    setTimeout(() => {
      for (const v of [walk, sofa]) { v.pause(); v.removeAttribute('src'); v.load(); }
    }, 500);
  };

  // On a slow connection, do not hold people on the closed door: go straight to Ammon on the sofa.
  const slowNetwork = setTimeout(() => { if (!hero.classList.contains('is-playing')) finish(); }, 2500);

  const play = (v) => {
    const attempt = v.play();
    // iOS Low Power Mode and some browsers block muted autoplay.
    if (attempt && attempt.catch) attempt.catch(finish);
  };

  walk.addEventListener('playing', () => {
    if (done) return;
    hero.classList.add('is-playing');
    if (pause) pause.hidden = false;
    // Start fetching the sofa clip only once the walk-in is running, so it never slows the first frame.
    if (!sofa.getAttribute('src')) { sofa.preload = 'auto'; sofa.src = hero.dataset.sofa; sofa.load(); }
  }, { once: true });

  walk.addEventListener('ended', () => {
    if (done) return;
    hero.classList.add('is-room');
    current = sofa;
    // If the sofa clip is still downloading, wait on the room, but not for long.
    sofaWait = setTimeout(() => { if (!hero.classList.contains('is-sofa')) finish(); }, 4000);
    play(sofa);
  });
  sofa.addEventListener('playing', () => { if (!done) hero.classList.add('is-sofa'); }, { once: true });
  sofa.addEventListener('ended', finish);
  for (const v of [walk, sofa]) v.addEventListener('error', finish);

  if (pause) pause.addEventListener('click', () => {
    const paused = pause.getAttribute('aria-pressed') === 'true';
    if (paused) play(current); else current.pause();
    pause.setAttribute('aria-pressed', String(!paused));
    if (label) label.textContent = paused ? 'Pause video' : 'Play video';
  });

  walk.src = hero.dataset.video;
  play(walk);
})();
