/* ==================================================================== */
/*  Serrurier Dépannage Rapide — Alpine.js + Lenis                       */
/* ==================================================================== */

/* ---- Infos client (à compléter) ---------------------------------- */
const SITE = {
  phone: '+33778952440',
  phoneDisplay: '07 78 95 24 40',
  analyticsDomain: 'xn--serrurierdpannagerapide-kcc.fr',
};

let analyticsAllowed = false;

function trackAnalytics(eventName) {
  if (analyticsAllowed && window.plausible) window.plausible(eventName);
}

const CHAPTERS = [
  { name: "Dépannage d'urgence", image: 'assets/locksmith-work.jpg' },
  { name: 'Serrures & portes blindées', image: 'assets/security-door.webp' },
  { name: 'Réparation de serrure', image: 'assets/door-installation.jpg' },
  { name: 'Volets roulants', image: 'assets/rolling-shutter.webp' },
  { name: 'Vitrerie', image: 'assets/glazing.webp' },
];

const pad = (n) => String(n).padStart(2, '0');

/* -------------------------------------------------------------------- */
/*  Lenis — smooth scroll                                                */
/* -------------------------------------------------------------------- */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis = null;

if (window.Lenis && !prefersReducedMotion) {
  lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 0.68 });
  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

function scrollToTarget(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, {
      duration: 1.6,
      easing: (progress) => (progress < 0.5
        ? 4 * progress ** 3
        : 1 - (-2 * progress + 2) ** 3 / 2),
    });
  }
  else el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

/* -------------------------------------------------------------------- */
/*  Entrées échelonnées (équivalent staggerChildren / delayChildren)     */
/* -------------------------------------------------------------------- */

function setupStagger() {
  // Conteneurs : data-stagger data-delay="0.6" data-step="0.15"
  document.querySelectorAll('[data-stagger]').forEach((container) => {
    const base = parseFloat(container.dataset.delay || '0');
    const step = parseFloat(container.dataset.step || '0.1');
    container.querySelectorAll(':scope > [data-st]').forEach((el, i) => {
      el.style.setProperty('--d', `${(base + i * step).toFixed(2)}s`);
    });
  });

  // Révélations au scroll avec échelonnement
  document.querySelectorAll('[data-reveal-stagger]').forEach((container) => {
    const base = parseFloat(container.dataset.delay || '0');
    const step = parseFloat(container.dataset.step || '0.1');
    container.querySelectorAll(':scope > .reveal').forEach((el, i) => {
      el.style.setProperty('--d', `${(base + i * step).toFixed(2)}s`);
    });
  });
}

/* -------------------------------------------------------------------- */
/*  IntersectionObserver — scroll reveals                               */
/* -------------------------------------------------------------------- */

function setupReveals() {
  const targets = document.querySelectorAll('[data-reveal-stagger], .reveal:not([data-reveal-stagger] > .reveal)');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((target) => {
      target.classList.add('is-in');
      target.querySelectorAll(':scope > .reveal').forEach((child) => child.classList.add('is-in'));
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        // un conteneur échelonné révèle ses enfants
        if (target.hasAttribute('data-reveal-stagger')) {
          target.querySelectorAll(':scope > .reveal').forEach((el) => el.classList.add('is-in'));
        } else {
          target.classList.add('is-in');
        }
        io.unobserve(target);
      });
    },
    { rootMargin: '0px 0px -100px 0px', threshold: 0.05 },
  );

  targets.forEach((el) => io.observe(el));
}

/* -------------------------------------------------------------------- */
/*  Flip vertical (compteur "01 / 05" et label "Chapter 0X")              */
/* -------------------------------------------------------------------- */

function flipText(el, text) {
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
  const out = el.animate(
    [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-14px)', opacity: 0 },
    ],
    { duration: 200, easing: 'ease-out', fill: 'forwards' },
  );
  out.onfinish = () => {
    el.textContent = text;
    el.animate(
      [
        { transform: 'translateY(14px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' },
    );
  };
}

/* -------------------------------------------------------------------- */
/*  Chapter photo — preload before swapping to avoid broken flashes      */
/* -------------------------------------------------------------------- */

function createChapterPhoto(img, chapters) {
  let sequence = 0;

  const show = (index) => {
    const id = ++sequence;
    const chapter = chapters[index];
    const nextImage = new Image();
    nextImage.src = chapter.image;

    nextImage.decode().then(() => {
      if (id !== sequence) return;
      img.src = chapter.image;
      img.alt = chapter.name;
      img.classList.add('is-loaded');
    }).catch((error) => {
      if (id !== sequence) return;
      console.error(`Impossible de charger l'image « ${chapter.name} ».`, error);
    });
  };

  return { show };
}

/* -------------------------------------------------------------------- */
/*  Alpine — état de la page                                             */
/* -------------------------------------------------------------------- */

document.addEventListener('alpine:init', () => {
  Alpine.data('museum', () => ({
    chapters: CHAPTERS,
    activeChapter: 0,
    menuOpen: false,
    chapterPhoto: null,

    init() {
      this.chapterPhoto = createChapterPhoto(document.getElementById('chapter-photo'), CHAPTERS);
      this.chapterPhoto.show(this.activeChapter);

      // Compteur + label animés à chaque changement
      this.$watch('activeChapter', (i) => {
        this.chapterPhoto.show(i);
        flipText(document.getElementById('chapter-counter'), pad(i + 1));
        flipText(document.getElementById('chapter-label'), `Prestation ${pad(i + 1)}`);
      });

      // Verrouille le scroll quand le menu mobile est ouvert
      this.$watch('menuOpen', (open) => {
        if (!lenis) return;
        open ? lenis.stop() : lenis.start();
      });
    },

    selectChapter(i) {
      this.activeChapter = i;
    },

    go(selector) {
      this.menuOpen = false;
      this.$nextTick(() => {
        if (lenis) lenis.start();
        scrollToTarget(selector);
      });
    },

    pad,
  }));
});

/* -------------------------------------------------------------------- */
/*  Démarrage                                                            */
/* -------------------------------------------------------------------- */

function bindPhone() {
  document.querySelectorAll('[data-phone]').forEach((el) => {
    if (SITE.phone) {
      el.setAttribute('href', `tel:${SITE.phone}`);
      el.dataset.analyticsEvent ||= 'Phone Call';
    }
    else el.setAttribute('href', '#contact');
  });
  if (!SITE.phone) {
    document.querySelectorAll('[data-phone-action]').forEach((el) => {
      el.textContent = el.dataset.phoneFallback || 'Demander un devis';
    });
  }
  if (SITE.phoneDisplay) {
    document.querySelectorAll('[data-phone-text]').forEach((el) => (el.textContent = SITE.phoneDisplay));
  }
}

function setupMobileContactCta() {
  const cta = document.querySelector('.mobile-contact-cta');
  const contact = document.getElementById('contact');
  if (!cta || !contact || !('IntersectionObserver' in window)) return;

  new IntersectionObserver(
    ([entry]) => {
      const hidden = entry.isIntersecting;
      cta.classList.toggle('is-hidden', hidden);
      cta.setAttribute('aria-hidden', String(hidden));
      cta.tabIndex = hidden ? -1 : 0;
    },
    { threshold: 0.1 },
  ).observe(contact);
}

function setupInterventionMap() {
  const container = document.getElementById('intervention-map');
  if (!container) return;
  if (!window.L) {
    console.error('Leaflet n’a pas pu être chargé : la carte de la zone d’intervention est indisponible.');
    const fallback = document.createElement('a');
    fallback.href = 'https://www.openstreetmap.org/#map=9/45.75/5.00';
    fallback.textContent = 'Consulter la zone autour de Lyon sur OpenStreetMap';
    fallback.className = 'text-sm underline underline-offset-4';
    container.replaceChildren(fallback);
    return;
  }

  const locations = [
    { name: 'Lyon', coordinates: [45.764, 4.8357] },
    { name: 'Meyzieu', coordinates: [45.7667, 5.0] },
    { name: 'Genas', coordinates: [45.7314, 5.0] },
    { name: 'Jonage', coordinates: [45.7986, 5.045] },
    { name: 'Crémieu', coordinates: [45.7253, 5.2494] },
    { name: 'Bourgoin-Jallieu', coordinates: [45.586, 5.273] },
    { name: 'Tignieu-Jameyzieu', coordinates: [45.735, 5.185] },
    { name: 'Pont-de-Chéruy', coordinates: [45.749, 5.17] },
  ];
  const map = window.L.map(container, { scrollWheelZoom: false }).fitBounds(
    locations.map(({ coordinates }) => coordinates),
    { padding: [24, 24] },
  );

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  locations.forEach(({ name, coordinates }) => {
    window.L.marker(coordinates).addTo(map).bindPopup(name);
  });
}

function setupQuoteForm() {
  const form = document.getElementById('quote-form');
  const status = document.getElementById('quote-form-status');
  if (!(form instanceof HTMLFormElement) || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!window.Zod) {
      console.error('Zod n’a pas pu être chargé : la validation du formulaire est indisponible.');
      status.textContent = 'Le formulaire est momentanément indisponible. Vous pouvez nous appeler directement.';
      return;
    }

    const schema = window.Zod.z.object({
      name: window.Zod.z.string().trim().min(2, 'Indiquez votre nom (au moins 2 caractères).').max(80, 'Le nom ne peut pas dépasser 80 caractères.'),
      city: window.Zod.z.string().trim().min(2, 'Indiquez votre commune.').max(100, 'La commune ne peut pas dépasser 100 caractères.'),
      message: window.Zod.z.string().trim().min(10, 'Décrivez le problème en 10 caractères minimum.').max(1000, 'Le message ne peut pas dépasser 1 000 caractères.'),
    });
    const values = Object.fromEntries(new FormData(form).entries());
    const result = schema.safeParse(values);

    if (!result.success) {
      status.textContent = result.error.issues[0].message;
      return;
    }

    const text = [
      'Bonjour, je souhaite un renseignement ou un devis.',
      `Nom : ${result.data.name}`,
      `Commune : ${result.data.city}`,
      `Besoin : ${result.data.message}`,
    ].join('\n');
    trackAnalytics('WhatsApp Quote Request');
    window.location.assign(`https://wa.me/${SITE.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
  });
}

function setupAnalyticsConsent() {
  const notice = document.getElementById('analytics-consent');
  const accept = document.getElementById('analytics-accept');
  const decline = document.getElementById('analytics-decline');
  const settings = document.getElementById('analytics-settings');
  if (!notice || !accept || !decline || !settings) return;

  const loadAnalytics = () => {
    if (window.plausible) return;

    window.plausible = function (...args) {
      (window.plausible.q = window.plausible.q || []).push(args);
    };
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = SITE.analyticsDomain;
    script.src = 'https://plausible.io/js/script.js';
    script.onerror = () => console.error('Impossible de charger Plausible : les statistiques ne sont pas disponibles.');
    document.head.appendChild(script);
  };

  let choice = null;
  try {
    choice = localStorage.getItem('analytics-consent');
  } catch (error) {
    console.warn('Le choix de mesure d’audience ne peut pas être mémorisé dans ce navigateur.', error);
  }

  if (choice === 'accepted') {
    analyticsAllowed = true;
    loadAnalytics();
  }
  if (choice === 'accepted' || choice === 'declined') notice.hidden = true;

  const saveChoice = (value) => {
    analyticsAllowed = value === 'accepted';
    try {
      localStorage.setItem('analytics-consent', value);
    } catch (error) {
      console.warn('Le choix de mesure d’audience ne peut pas être mémorisé dans ce navigateur.', error);
    }
    notice.hidden = true;
    if (value === 'accepted') loadAnalytics();
  };

  accept.addEventListener('click', () => saveChoice('accepted'));
  decline.addEventListener('click', () => saveChoice('declined'));
  settings.addEventListener('click', () => {
    notice.hidden = false;
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('[data-analytics-event]');
    if (link) trackAnalytics(link.dataset.analyticsEvent);
  });
}

function setupHeroStoryImages() {
  const visual = document.querySelector('.hero-visual');
  const layers = visual ? Array.from(visual.querySelectorAll('.hero-photo')) : [];
  const steps = document.querySelectorAll('[data-hero-image]');
  if (layers.length < 2 || !steps.length || !('IntersectionObserver' in window)) return;

  let activeLayer = 0;
  let activeChapter = 0;
  let requestedChapter = 0;
  let requestId = 0;
  let liquidFrame = 0;
  const displacement = document.getElementById('hero-liquid-displacement');

  const resetLiquidEffect = () => {
    if (liquidFrame) cancelAnimationFrame(liquidFrame);
    liquidFrame = 0;
    layers.forEach((layer) => layer.classList.remove('is-liquid'));
    displacement?.setAttribute('scale', '0');
  };

  const animateLiquidEffect = (image) => {
    if (prefersReducedMotion || !displacement) return;
    resetLiquidEffect();
    const duration = 850;
    const startedAt = performance.now();
    displacement.setAttribute('scale', '54');
    image.classList.add('is-liquid');

    const animate = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const ripple = Math.abs(Math.cos(progress * Math.PI * 3));
      const scale = progress === 1 ? 0 : 54 * Math.exp(-4.2 * progress) * (0.68 + ripple * 0.32);
      displacement.setAttribute('scale', scale.toFixed(1));
      if (progress < 1) {
        liquidFrame = requestAnimationFrame(animate);
      } else {
        image.classList.remove('is-liquid');
        liquidFrame = 0;
      }
    };

    liquidFrame = requestAnimationFrame(animate);
  };

  const showChapter = (index) => {
    if (index === requestedChapter || !CHAPTERS[index]) return;
    requestedChapter = index;
    const request = ++requestId;
    const nextLayer = 1 - activeLayer;
    const chapter = CHAPTERS[index];
    const preload = new Image();
    preload.src = chapter.image;

    preload.decode().then(() => {
      if (request !== requestId) return;
      const image = layers[nextLayer];
      image.src = chapter.image;
      image.alt = chapter.name;
      image.removeAttribute('aria-hidden');
      layers[activeLayer].alt = '';
      layers[activeLayer].setAttribute('aria-hidden', 'true');
      image.dataset.chapter = String(index);
      animateLiquidEffect(image);
      requestAnimationFrame(() => {
        if (request !== requestId) return;
        image.classList.add('is-active');
        layers[activeLayer].classList.remove('is-active');
        activeLayer = nextLayer;
        activeChapter = index;
        updateStatus(index);
      });
    }).catch((error) => {
      if (request === requestId) {
        requestedChapter = activeChapter;
        console.error(`Impossible de charger l'image « ${chapter.name} ».`, error);
      }
    });
  };

  const updateStatus = (index) => {
    const current = document.getElementById('hero-image-current');
    const name = document.getElementById('hero-image-name');
    if (current) current.textContent = pad(index + 1);
    if (name) name.textContent = CHAPTERS[index].name;
    visual.querySelectorAll('.hero-image-progress > span').forEach((segment, i) => {
      segment.classList.toggle('is-active', i === index);
    });
  };

  updateStatus(0);

  const observer = new IntersectionObserver(
    (entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          const center = window.innerHeight / 2;
          return Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - center)
            - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - center);
        })[0];
      if (current) showChapter(Number(current.target.dataset.heroImage));
    },
    { rootMargin: '-38% 0px -38% 0px', threshold: 0 },
  );

  steps.forEach((step) => observer.observe(step));
}

function setupHeroParallax() {
  const visual = document.querySelector('.hero-visual');
  const img = visual?.querySelector('.hero-photo');
  if (!visual || !img || prefersReducedMotion) return;

  let frame = 0;
  const update = () => {
    const bounds = visual.getBoundingClientRect();
    const progress = (bounds.top + bounds.height / 2 - window.innerHeight / 2)
      / (window.innerHeight / 2 + bounds.height / 2);
    const offset = Math.max(-1, Math.min(1, progress)) * -38;
    visual.style.setProperty('--hero-parallax-y', `${offset.toFixed(1)}px`);
    frame = 0;
  };
  const scheduleUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  scheduleUpdate();
}

setupStagger();
document.addEventListener('DOMContentLoaded', () => {
  setupReveals();
  bindPhone();
  setupMobileContactCta();
  setupInterventionMap();
  setupQuoteForm();
  setupAnalyticsConsent();
  setupHeroStoryImages();
  setupHeroParallax();
});
