/* ALTAR VISION — main.js
   Carrousels (boucle infinie translatée) + lecteur audio de la page Lore. */

// ---------- Carrousels (boucle infinie) ----------
document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.carousel-track');
  const prev  = carousel.querySelector('.carousel-nav.prev');
  const next  = carousel.querySelector('.carousel-nav.next');
  if (!track) return;

  const originals = Array.from(track.children);
  const count = originals.length;
  if (!count) return;

  // On duplique la série d'items 3x : [copie][ORIGINAUX][copie].
  // On se positionne sur le bloc du milieu et on translate ; dès qu'on
  // dépasse un bloc, on rembobine la position de la largeur d'un bloc,
  // sans transition, donc invisible → boucle infinie sans butée ni saut.
  originals.forEach((n) => track.appendChild(n.cloneNode(true)));
  [...originals].reverse().forEach((n) => track.insertBefore(n.cloneNode(true), track.firstChild));

  track.style.overflow = 'hidden';          // on gère le défilement nous-mêmes
  track.style.scrollBehavior = 'auto';

  let offset = 0;                            // position courante (px) depuis le début de la piste
  let animating = false;

  const stepWidth = () => {
    const item = track.querySelector('.carousel-item');
    const gap = parseFloat(getComputedStyle(track).gap) || 18;
    return item.getBoundingClientRect().width + gap;
  };
  const blockWidth = () => stepWidth() * count;

  // Position de base = début du bloc central.
  const baseScroll = () => blockWidth();

  const apply = (smooth) => {
    track.style.transition = smooth ? 'transform .38s ease' : 'none';
    track.style.transform = `translateX(${-offset}px)`;
  };

  // Init : on place la piste sur le bloc central via transform.
  const reset = () => { offset = baseScroll(); apply(false); };
  requestAnimationFrame(reset);

  const move = (dir) => {
    if (animating) return;
    animating = true;
    offset += dir * stepWidth();
    apply(true);
  };

  // À la fin de l'animation, si on a dépassé un bloc complet dans un sens,
  // on ré-emballe la position sans transition (invisible). Le bloc central
  // commence à bw (= baseScroll()), donc les bornes de rebouclage sont
  // [0, 2*bw] autour de cette position de base, pas [-bw, bw] autour de 0.
  track.addEventListener('transitionend', () => {
    const bw = blockWidth();
    if (offset >= 2 * bw) offset -= bw;
    if (offset <= 0)      offset += bw;
    apply(false);
    animating = false;
  });

  next?.addEventListener('click', () => move(1));
  prev?.addEventListener('click', () => move(-1));

  window.addEventListener('resize', () => { offset = baseScroll(); apply(false); });
});

// ---------- Lecteur audio (page Lore) ----------
document.querySelectorAll('[data-audio-player]').forEach((player) => {
  const audio = player.querySelector('audio');
  const btn   = player.querySelector('.audio-play');
  const bar   = player.querySelector('.audio-bar');
  const fill  = player.querySelector('.audio-bar-fill');
  const time  = player.querySelector('.audio-time');
  if (!audio || !btn) return;

  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const render = () => {
    const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 94;
    if (fill) fill.style.width = `${(audio.currentTime / dur) * 100}%`;
    if (time) time.textContent = `${fmt(audio.currentTime)} / ${fmt(dur)}`;
  };

  btn.addEventListener('click', () => {
    if (audio.paused) { audio.play(); btn.textContent = '❚❚'; }
    else { audio.pause(); btn.textContent = '▶'; }
  });

  audio.addEventListener('timeupdate', render);
  audio.addEventListener('loadedmetadata', render);
  audio.addEventListener('ended', () => { btn.textContent = '▶'; render(); });

  bar?.addEventListener('click', (e) => {
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 94;
    audio.currentTime = ratio * dur;
    render();
  });

  render();
});

// ---------- Curseur personnalisé sur le formulaire Klaviyo (waitlist) ----------
// Klaviyo injecte son widget dans un Shadow DOM : le CSS de la page ne peut pas
// l'atteindre. On injecte donc la règle de curseur directement à l'intérieur de
// chaque shadow root trouvé, dès qu'il apparaît.
(() => {
  const container = document.querySelector('.klaviyo-form-U7bA4R');
  if (!container) return;

  const cursorRule = "*{cursor:url('assets/img/altar-cursor-40.png') 20 20, auto !important;}";

  const injectIntoShadowRoots = (root) => {
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot && !el.shadowRoot.querySelector('style[data-altar-cursor]')) {
        const style = document.createElement('style');
        style.setAttribute('data-altar-cursor', '');
        style.textContent = cursorRule;
        el.shadowRoot.appendChild(style);
        injectIntoShadowRoots(el.shadowRoot);
      }
    });
  };

  injectIntoShadowRoots(container);
  new MutationObserver(() => injectIntoShadowRoots(container))
    .observe(container, { childList: true, subtree: true });
})();
