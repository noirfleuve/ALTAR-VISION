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

  // Le scroll natif reste actif (overflow-x:auto en CSS) : on pilote la
  // piste via scrollLeft/scrollTo plutôt qu'un transform calculé à la main —
  // le navigateur borne toujours cette valeur à une plage valide, donc une
  // erreur de calcul ne peut jamais pousser le contenu hors champ. Ça permet
  // aussi de laisser l'utilisateur glisser du doigt horizontalement (le
  // scroll vertical de la page reste libre grâce à touch-action:pan-x en CSS).
  const items = () => Array.from(track.children); // 3 × count éléments
  let index = count;                                // item de tête = bloc central
  let animating = false;
  let safetyTimer;

  // Retrouve l'item le plus proche de la position réelle de la piste — utile
  // après un glissement au doigt, qui ne passe pas par move() et ne met donc
  // pas à jour "index" tant qu'on ne le recale pas ainsi.
  const closestIndex = () => {
    let best = index, bestDist = Infinity;
    items().forEach((el, i) => {
      const d = Math.abs(el.offsetLeft - track.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  // scrollTo({behavior}) force explicitement l'instantané ou le fluide,
  // sans dépendre du scroll-behavior CSS ambiant (plus fiable que de piloter
  // track.style.scrollBehavior à la main, notamment sur mobile).
  const snapTo = (i, smooth) => {
    track.scrollTo({ left: items()[i].offsetLeft, behavior: smooth ? 'smooth' : 'instant' });
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
    index = closestIndex() + dir; // se recale d'abord sur un éventuel glissement au doigt
    snapTo(index, true);
    // Filet de sécurité : si ni scrollend ni scroll ne se déclenchent (arrive
    // sur certains navigateurs mobiles), on force le settle plutôt que de
    // rester bloqué sur animating=true, ce qui rendrait les boutons inertes.
    clearTimeout(safetyTimer);
    safetyTimer = setTimeout(settle, 900);
  };

  // Une fois le scroll terminé (bouton, autoplay ou glissement au doigt), on
  // se resynchronise sur la position réelle, puis si on a dépassé le bloc
  // central dans un sens, on rembobine l'index d'un bloc complet sans
  // animation (invisible) vers l'item équivalent → boucle infinie sans butée.
  const settle = () => {
    clearTimeout(safetyTimer);
    index = closestIndex();
    if (index >= 2 * count) index -= count;
    if (index < count)      index += count;
    snapTo(index, false);
    animating = false;
  };
  // Tant qu'un doigt touche la piste, le repli (scroll debounce) ci-dessous
  // ne doit jamais recaler dessus : le scroll continue en inertie après le
  // relâchement, donc lever le doigt ne veut pas dire que le scroll est fini.
  // On laisse scrollend (ou le debounce, une fois le doigt levé) détecter la
  // vraie fin du mouvement plutôt que de forcer un recalage à touchend.
  let touching = false;
  let dragging = false;
  const interacting = () => touching || dragging;
  track.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  track.addEventListener('touchend', () => { touching = false; }, { passive: true });
  track.addEventListener('touchcancel', () => { touching = false; }, { passive: true });

  if ('onscrollend' in window) {
    // scrollend n'est émis qu'une fois le scroll (et son inertie) réellement
    // terminé, y compris après un geste tactile : pas besoin de vérifier "touching" ici.
    // On le garde tout de même pour le glisser-souris (pas d'inertie là, mais
    // un scrollend parasite en plein milieu d'un drag doit être ignoré).
    track.addEventListener('scrollend', () => { if (!dragging) settle(); });
  } else {
    // Repli pour les navigateurs sans l'évènement scrollend natif.
    let settleTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => { if (!interacting()) settle(); }, 150);
    });
  }

  // Glisser-déposer à la souris (desktop) : le contenu suit le curseur,
  // exactement comme un swipe tactile. Contrairement au tactile, il n'y a
  // pas d'inertie ici, donc on peut recaler immédiatement au relâchement.
  let dragStartX = 0, dragStartScroll = 0;
  track.addEventListener('mousedown', (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartScroll = track.scrollLeft;
    pause();
    e.preventDefault(); // évite la sélection de texte et le drag natif des images
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    track.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resume();
    settle();
  });

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
