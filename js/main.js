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

  // On duplique la série d'items 3x : [copie][ORIGINAUX][copie], dans le
  // même ordre partout (pour rebobiner sans saut visuel).
  originals.forEach((n) => track.appendChild(n.cloneNode(true)));
  [...originals].reverse().forEach((n) => track.insertBefore(n.cloneNode(true), track.firstChild));

  track.style.overflow = 'hidden';          // on masque le scroll natif à la souris/tactile...

  // ...mais on continue d'utiliser scrollLeft (et non un transform calculé à
  // la main) pour positionner la piste : le navigateur borne toujours cette
  // valeur à une plage valide, donc une erreur de calcul ne peut jamais
  // pousser le contenu hors champ indéfiniment — contrairement à un
  // translateX() manuel, qui n'a aucune limite de sécurité intégrée.
  const items = () => Array.from(track.children); // 3 × count éléments
  let index = count;                                // item de tête = bloc central
  let animating = false;

  const snapTo = (i, smooth) => {
    track.style.scrollBehavior = smooth ? 'smooth' : 'auto';
    track.scrollLeft = items()[i].offsetLeft;
  };

  // Init : on place la piste sur le bloc central. La largeur de chaque item
  // dépend de son image (plus d'aspect-ratio fixe) : tant qu'une image n'est
  // pas chargée, son offsetLeft n'est pas fiable, donc on recale une fois
  // toutes les images prêtes (les clones incluses).
  const reset = () => { index = count; snapTo(index, false); };
  requestAnimationFrame(reset);
  window.addEventListener('load', reset);

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
    snapTo(index, true);
  };

  // Une fois le scroll fluide terminé, si on a dépassé le bloc central dans
  // un sens, on rembobine l'index d'un bloc complet sans animation
  // (invisible) vers l'item équivalent → boucle infinie sans butée.
  const settle = () => {
    if (index >= 2 * count) index -= count;
    if (index < count)      index += count;
    snapTo(index, false);
    animating = false;
  };
  if ('onscrollend' in window) {
    track.addEventListener('scrollend', settle);
  } else {
    // Repli pour les navigateurs sans l'évènement scrollend natif.
    let settleTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 150);
    });
  }

  next?.addEventListener('click', () => move(1));
  prev?.addEventListener('click', () => move(-1));

  window.addEventListener('resize', () => snapTo(index, false));

  // Défilement automatique (bouton "suivant") toutes les 2s, en pause au
  // survol/tactile pour ne pas gêner la lecture.
  let autoplay = setInterval(() => move(1), 2000);
  const pause  = () => clearInterval(autoplay);
  const resume = () => { pause(); autoplay = setInterval(() => move(1), 2000); };
  carousel.addEventListener('mouseenter', pause);
  carousel.addEventListener('mouseleave', resume);
  carousel.addEventListener('touchstart', pause, { passive: true });
  carousel.addEventListener('touchend', resume);
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

// ---------- Particules (cubes/hexagones) de la sphère de fond ----------
// Le CSS ne peut créer que 2 pseudo-éléments par élément (::before/::after),
// insuffisant pour plusieurs particules : on les génère ici et on les
// confine/synchronise avec la sphère via le même masque et les mêmes
// animations (voir .bg-particles dans style.css).
(() => {
  const container = document.createElement('div');
  container.className = 'bg-particles';
  container.setAttribute('aria-hidden', 'true');

  const count = 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = `bg-particle ${i % 2 === 0 ? 'cube' : 'hex'}`;
    const duration = 3 + Math.random() * 3;
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${duration.toFixed(2)}s`;
    p.style.animationDelay = `${(-Math.random() * duration).toFixed(2)}s`;
    container.appendChild(p);
  }

  document.body.appendChild(container);
})();

// ---------- Parallaxe légère du fond selon la position de la souris ----------
// Pilote --parallax-x/-y (lues par les keyframes glow-shake dans style.css),
// avec un lissage (lerp) pour un mouvement fluide plutôt qu'un suivi 1:1.
(() => {
  if (!window.matchMedia('(pointer:fine)').matches) return; // pas de souris → rien à faire

  const root = document.documentElement;
  const strength = 40; // amplitude max en px
  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  window.addEventListener('mousemove', (e) => {
    targetX = ((e.clientX / window.innerWidth) * 2 - 1) * strength;
    targetY = ((e.clientY / window.innerHeight) * 2 - 1) * strength;
  });

  const tick = () => {
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;
    root.style.setProperty('--parallax-x', `${curX.toFixed(2)}px`);
    root.style.setProperty('--parallax-y', `${curY.toFixed(2)}px`);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
