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

  // Les images gardent leurs propres proportions (largeurs variables selon
  // l'image), donc on ne peut pas se baser sur une largeur de pas fixe : on
  // utilise l'index de l'item ciblé et sa position réelle (offsetLeft),
  // qui reflète la mise en page flex indépendamment du transform appliqué.
  let index = count;                        // item de tête = début du bloc central
  let animating = false;

  const items = () => Array.from(track.children);

  const apply = (smooth) => {
    const target = items()[index];
    track.style.transition = smooth ? 'transform .38s ease' : 'none';
    track.style.transform = `translateX(${-target.offsetLeft}px)`;
  };

  // Init : on place la piste sur le bloc central. La largeur de chaque item
  // dépend de son image (plus d'aspect-ratio fixe) : tant qu'une image n'est
  // pas chargée, son offsetLeft n'est pas fiable, donc on recale une fois
  // toutes les images prêtes (les clones incluses).
  const reset = () => { index = count; apply(false); };
  requestAnimationFrame(reset);

  const imgs = Array.from(track.querySelectorAll('img'));
  let pending = imgs.length;
  imgs.forEach((img) => {
    const done = () => { if (--pending === 0) reset(); };
    if (img.complete) done();
    else img.addEventListener('load', done, { once: true });
  });

  const move = (dir) => {
    if (animating) return;
    animating = true;
    index += dir;
    apply(true);
  };

  // À la fin de l'animation, si on a dépassé le bloc central dans un sens,
  // on rembobine l'index d'un bloc complet sans transition (invisible),
  // vers l'item équivalent du bloc central → boucle infinie sans butée.
  track.addEventListener('transitionend', () => {
    if (index >= 2 * count) index -= count;
    if (index < count)      index += count;
    apply(false);
    animating = false;
  });

  next?.addEventListener('click', () => move(1));
  prev?.addEventListener('click', () => move(-1));

  window.addEventListener('resize', () => apply(false));
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
