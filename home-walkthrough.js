/* Homepage walkthrough. Native scrolling seeks a paused video; no autoplay or loop. */
(() => {
  const body=document.querySelector('.editorial-homepage');
  const scene=document.querySelector('#home-journey');
  const originalHero=document.querySelector('#home.editorial-home');
  if(!body||!scene||!originalHero)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const roomForMotion=matchMedia('(min-height: 600px)');
  body.classList.add('journey-at-top','cinematic-concept','cinematic-video-concept');
  const stage=scene.querySelector('.journey-stage');
  const image=scene.querySelector('.journey-cinematic-image');
  const video=scene.querySelector('.journey-cinematic-video');
  const beats=[...scene.querySelectorAll('.journey-beat')];
  const finale=scene.querySelector('.journey-finale');
  const bar=scene.querySelector('.journey-progress span');
  const touchCue=scene.querySelector('.journey-cue-touch');
  const desktopCue=scene.querySelector('.journey-cue-desktop');
  const chapter=scene.querySelector('.journey-chapter span');
  const motionControls=scene.querySelector('.journey-motion-controls');
  const motionToggle=scene.querySelector('.journey-motion-toggle');
  const motionNote=scene.querySelector('.journey-motion-note');
  const enableChoice=originalHero.querySelector('.hero-walkthrough-choice');
  const enableToggle=originalHero.querySelector('.hero-enable-walkthrough');
  let motionChoice=null;
  let enabled=false,pending=0,last=-1;
  let openingStarted=performance.now(),openingFinished=false;
  let videoProgress=0,sourceAttached=false,videoFailed=false,seekInFlight=false,lastSeekTarget=null;
  const videoURL='/assets/walkthrough-mobile-v1.mp4';
  const frameTolerance=1/60;
  video.muted=true;video.defaultMuted=true;video.playsInline=true;
  stage.dataset.videoState='poster';
  stage.dataset.videoTarget='0';
  stage.dataset.videoTime='0';
  const clamp=n=>Math.min(1,Math.max(0,n));
  const smooth=n=>{const t=clamp(n);return t*t*(3-2*t)};
  const cards=beats.map(beat=>beat.querySelector('.journey-intro-card,.journey-proof-card'));
  const allLayers=[];
  function layer(element,kind,delay){
    element.classList.add('journey-layer');
    if(kind==='title')element.classList.add('journey-title-layer');
    const item={element,kind,delay};
    allLayers.push(item);
    return item;
  }
  const cardLayers=cards.map((card,i)=>i===0?[
    layer(card.querySelector('img'),'portrait',.12),
    layer(card.querySelector('h2'),'title',.28),
    layer(card.querySelector('.journey-description'),'body',.47),
    layer(card.querySelector('.journey-detail'),'detail',.64),
  ]:[
    layer(card.querySelector('h2'),'title',.28),
    layer(card.querySelector('.journey-description'),'body',.47),
    ...(card.querySelector('.journey-detail')?[layer(card.querySelector('.journey-detail'),'detail',.64)]:[]),
  ]);
  const introHeadingLayers=[
    layer(scene.querySelector('.journey-intro-heading .journey-kicker'),'label',0),
    layer(scene.querySelector('.journey-main-heading'),'title',.10),
  ];
  const chapterHeadingLayers=beats.map((beat,i)=>i===0?introHeadingLayers:[
    layer(beat.querySelector('.journey-scene-heading h2'),'title',0),
  ]);
  const finaleLayers=[
    layer(finale.querySelector('.journey-kicker'),'label',.14),
    layer(finale.querySelector('h2'),'title',.28),
    layer(finale.querySelector('.journey-description'),'body',.47),
  ];
  // The surface and each text block have their own timeline. Only these local
  // layers move, so a card no longer slides in as one solid unit.
  function drawSurface(card,entry,exit){
    const reveal=smooth(entry/.54);
    const leave=smooth((exit-.28)/.72);
    const opacity=reveal*(1-leave);
    card.style.setProperty('--surface-reveal',reveal.toFixed(4));
    card.style.setProperty('--surface-exit',leave.toFixed(4));
    card.style.setProperty('--surface-opacity',opacity.toFixed(4));
    return opacity;
  }
  function drawLayer(item,entry,exit){
    const {element,kind,delay}=item;
    const arrive=smooth((entry-delay)/.36);
    const leave=smooth((exit-(kind==='title'?0:.10))/.66);
    const opacity=arrive*(1-leave);
    const distance=kind==='title'?22:kind==='body'?14:kind==='detail'?10:6;
    const x=(kind==='label'?-10:kind==='portrait'?-8:0)*(1-arrive);
    const y=distance*(1-arrive)-(kind==='title'?8:10)*leave;
    element.style.setProperty('--layer-opacity',opacity.toFixed(4));
    element.style.setProperty('--layer-x',`${x.toFixed(2)}px`);
    element.style.setProperty('--layer-y',`${y.toFixed(2)}px`);
    element.style.setProperty('--layer-scale',kind==='portrait'?String(.965+.035*arrive):'1');
    element.style.setProperty('--layer-clip',kind==='title'?`${(100*(1-arrive)).toFixed(2)}%`:'0%');
    return opacity;
  }
  function drawCard(card,layers,entry,exit){
    let visible=drawSurface(card,entry,exit);
    for(const item of layers)visible=Math.max(visible,drawLayer(item,entry,exit));
    return visible;
  }
  // Keep only the latest scroll target while the browser decodes a requested frame.
  // This works in both directions without building up a queue of obsolete seeks.
  function targetTime(){
    return clamp(videoProgress)*Math.max(0,video.duration-1/30);
  }
  function showDecodedFrame(){
    if(!enabled||!sourceAttached||videoFailed||video.readyState<2)return;
    body.classList.add('journey-video-ready');
    stage.dataset.videoState='ready';
    stage.dataset.videoTime=video.currentTime.toFixed(3);
  }
  function seekLatestFrame(){
    if(!enabled||!sourceAttached||videoFailed||!Number.isFinite(video.duration)||video.duration<=0)return;
    const target=targetTime();
    stage.dataset.videoTarget=target.toFixed(3);
    if(seekInFlight||video.seeking)return;
    // Some browsers round currentTime. A completed identical request must not
    // trigger an endless seek loop merely because the reported time is rounded.
    const alreadyRequested=lastSeekTarget!==null&&Math.abs(lastSeekTarget-target)<=frameTolerance;
    if((Math.abs(video.currentTime-target)<=frameTolerance||alreadyRequested)&&video.readyState>=2){
      showDecodedFrame();return;
    }
    seekInFlight=true;
    try{
      // A tiny first seek requests a decoded image even with preload="metadata".
      lastSeekTarget=video.readyState<2&&target===0?.001:target;
      video.currentTime=lastSeekTarget;
    }catch(error){
      seekInFlight=false;
      failVideo();
    }
  }
  function loadVideo(){
    if(sourceAttached||videoFailed||!enabled)return;
    sourceAttached=true;lastSeekTarget=null;stage.dataset.videoState='loading';
    video.src=videoURL;video.load();
  }
  function unloadVideo(){
    sourceAttached=false;seekInFlight=false;lastSeekTarget=null;
    video.pause();video.removeAttribute('src');video.load();
    body.classList.remove('journey-video-ready');
    stage.dataset.videoState='poster';stage.dataset.videoTime='0';
    delete stage.dataset.videoDuration;
  }
  function failVideo(){
    if(!sourceAttached)return;
    videoFailed=true;seekInFlight=false;
    video.pause();body.classList.remove('journey-video-ready');
    stage.dataset.videoState='fallback';
  }
  video.addEventListener('loadedmetadata',()=>{
    if(!enabled||!sourceAttached)return;
    stage.dataset.videoDuration=Number.isFinite(video.duration)?video.duration.toFixed(3):'unknown';
    if(!Number.isFinite(video.duration)||video.duration<=0){failVideo();return}
    seekLatestFrame();
  });
  video.addEventListener('loadeddata',()=>{showDecodedFrame();seekLatestFrame()});
  video.addEventListener('canplay',()=>{showDecodedFrame();seekLatestFrame()});
  video.addEventListener('seeked',()=>{
    seekInFlight=false;
    showDecodedFrame();seekLatestFrame();
  });
  video.addEventListener('error',failVideo);
  video.addEventListener('stalled',()=>{
    if(enabled&&sourceAttached&&!videoFailed&&!body.classList.contains('journey-video-ready'))stage.dataset.videoState='buffering';
  });
  // The video must remain paused: only scroll position controls its currentTime.
  video.addEventListener('play',()=>video.pause());
  function draw(now=performance.now()){
    pending=0;if(!enabled)return;
    const bounds=scene.getBoundingClientRect();
    const navHeight=document.querySelector('body > nav')?.offsetHeight||70;
    const travel=Math.max(1,scene.offsetHeight-stage.offsetHeight);
    const p=clamp((navHeight-bounds.top)/travel);
    body.classList.toggle('in-journey',bounds.top<=navHeight+2&&bounds.bottom>=innerHeight-2);
    const opening=clamp((now-openingStarted)/1450);
    const openingChanged=!openingFinished;
    openingFinished=opening>=1;
    if(Math.abs(p-last)<.0003&&!openingChanged)return;
    videoProgress=p;
    seekLatestFrame();
    const spans=[[0,.15],[.21,.36],[.42,.57],[.63,.78]];
    beats.forEach((beat,i)=>{
      const [start,end]=spans[i];
      const entry=i===0?opening:clamp((p-(start-.025))/.065);
      const exit=clamp((p-end)/.04);
      let visible=drawCard(cards[i],cardLayers[i],entry,exit);
      // Scene titles lead the glass panels, with a longer hold through the chapter.
      const headingEntry=i===0?opening:clamp((p-(start-.04))/.055);
      const headingExit=clamp((p-(end+.008))/.032);
      for(const item of chapterHeadingLayers[i])visible=Math.max(visible,drawLayer(item,headingEntry,headingExit));
      beat.style.opacity='1';
      beat.style.transform='none';
      beat.style.visibility=visible>.002?'visible':'hidden';
      beat.inert=entry<.65||exit>.30;
    });
    const finaleEntry=clamp((p-.825)/.10);
    const finaleVisible=drawCard(finale,finaleLayers,finaleEntry,0);
    finale.style.opacity='1';finale.style.visibility=finaleVisible>.002?'visible':'hidden';
    finale.style.transform='none';finale.inert=finaleEntry<.65;
    bar.style.transform=`scaleX(${p})`;
    chapter.textContent=String(Math.min(5,Math.floor((p+.035)/.21)+1)).padStart(2,'0');
    touchCue.textContent=p>.94?'Swipe up to continue':'Swipe up to explore';
    desktopCue.textContent=p>.94?'Scroll to continue':'Scroll to explore';
    if(p>.015)body.classList.add('journey-has-scrolled');
    stage.dataset.progress=p.toFixed(3);last=p;
    if(!openingFinished)queue();
  }
  function queue(){if(enabled&&!pending)pending=requestAnimationFrame(draw)}
  function configure(){
    enabled=roomForMotion.matches&&(motionChoice===null?!preference.matches:motionChoice);
    originalHero.hidden=enabled;
    scene.hidden=!enabled;
    enableChoice.hidden=!roomForMotion.matches;
    motionControls.hidden=!roomForMotion.matches;
    motionToggle.textContent=enabled?'Use still version':'Enable walkthrough';
    motionToggle.setAttribute('aria-pressed',String(enabled));
    motionNote.textContent=enabled?'Walkthrough enabled for this page':preference.matches?'Reduced motion is on':'Still version selected';
    stage.dataset.motionPreference=preference.matches?'reduce':'no-preference';
    stage.dataset.motionReason=enabled?'enabled':!roomForMotion.matches?'short-viewport':motionChoice===false?'user-paused':'reduced-motion';
    body.classList.toggle('journey-motion-on',enabled);last=-1;
    window.dispatchEvent(new Event('journey-mode-change'));
    if(!enabled){
      cancelAnimationFrame(pending);pending=0;body.classList.remove('in-journey');
      for(const el of [...beats,...cards,finale,bar,image,...allLayers.map(item=>item.element)]){el.removeAttribute('style');el.inert=false}
      if(sourceAttached)unloadVideo();
    }else{body.classList.remove('journey-has-scrolled');openingStarted=performance.now();openingFinished=false;loadVideo();queue()}
  }
  image.decode().then(()=>body.classList.add('journey-ready')).catch(()=>body.classList.add('journey-ready'));
  new ResizeObserver(()=>{last=-1;queue()}).observe(stage);
  window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});
  function toggleMotion(){
    motionChoice=!enabled;
    configure();
    // The visitor opts into this tour only. Do not change or store device settings.
    const root=document.documentElement;
    const previousScroll=root.style.scrollBehavior;
    root.style.scrollBehavior='auto';
    const navHeight=document.querySelector('body > nav')?.offsetHeight||70;
    const activeHero=enabled?scene:originalHero;
    window.scrollTo(0,Math.max(0,activeHero.getBoundingClientRect().top+scrollY-navHeight));
    (enabled?motionToggle:enableToggle).focus({preventScroll:true});
    requestAnimationFrame(()=>{root.style.scrollBehavior=previousScroll});
  }
  motionToggle.addEventListener('click',toggleMotion);
  enableToggle.addEventListener('click',toggleMotion);
  preference.addEventListener('change',()=>{motionChoice=null;configure()});
  roomForMotion.addEventListener('change',configure);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(pending);pending=0;video.pause()});
  window.addEventListener('pageshow',()=>{last=-1;queue()});configure();
})();
