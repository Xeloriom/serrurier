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
  { name: "Dépannage d'urgence", image: 'assets/locksmith-work.webp' },
  { name: 'Serrures & portes blindées', image: 'assets/security-door.webp' },
  { name: 'Réparation de serrure', image: 'assets/door-installation.webp' },
  { name: 'Volets roulants', image: 'assets/rolling-shutter.webp' },
  { name: 'Vitrerie', image: 'assets/glazing.webp' },
];

const pad = (n) => String(n).padStart(2, '0');

/* -------------------------------------------------------------------- */
/*  Lenis — smooth scroll                                                */
/* -------------------------------------------------------------------- */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefersNativeScroll = window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;
let lenis = null;

if (window.Lenis && !prefersReducedMotion && !prefersNativeScroll) {
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
        document.body.classList.toggle('mobile-menu-open', open);
        if (lenis) open ? lenis.stop() : lenis.start();
      });
    },

    selectChapter(i) {
      this.activeChapter = i;
    },

    go(selector) {
      this.menuOpen = false;
      document.body.classList.remove('mobile-menu-open');
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

  const initializeMap = () => {
    if (!window.L) throw new Error('Leaflet est chargé, mais son API est indisponible.');
    container.replaceChildren();

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
  };

  const loadLeaflet = () => {
    if (window.L) return Promise.resolve();
    if (window.leafletLoading) return window.leafletLoading;

    const loadStylesheet = new Promise((resolve, reject) => {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      stylesheet.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      stylesheet.crossOrigin = 'anonymous';
      stylesheet.onload = resolve;
      stylesheet.onerror = () => reject(new Error('Impossible de charger les styles de la carte.'));
      document.head.append(stylesheet);
    });

    const loadScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Impossible de charger Leaflet.'));
      document.head.append(script);
    });
    window.leafletLoading = Promise.all([loadStylesheet, loadScript]).then(() => {
      if (!window.L) throw new Error('Leaflet n’a pas exposé son API.');
    });
    return window.leafletLoading;
  };

  const startMap = () => {
    loadLeaflet().then(initializeMap).catch((error) => {
      console.error('La carte de la zone d’intervention est indisponible.', error);
      container.classList.add('map-unavailable');
    });
  };

  if (!('IntersectionObserver' in window)) {
    startMap();
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      startMap();
    },
    { rootMargin: '240px' },
  );
  observer.observe(container);
}

function setupQuoteForm() {
  const form = document.getElementById('quote-form');
  const status = document.getElementById('quote-form-status');
  if (!(form instanceof HTMLFormElement) || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const city = String(values.get('city') || '').trim();
    const message = String(values.get('message') || '').trim();

    if (name.length < 2 || name.length > 80) {
      status.textContent = 'Indiquez votre nom (2 à 80 caractères).';
      form.elements.namedItem('name')?.focus();
      return;
    }
    if (city.length < 2 || city.length > 100) {
      status.textContent = 'Indiquez votre commune (2 à 100 caractères).';
      form.elements.namedItem('city')?.focus();
      return;
    }
    if (message.length < 10 || message.length > 1000) {
      status.textContent = 'Décrivez le problème (10 à 1 000 caractères).';
      form.elements.namedItem('message')?.focus();
      return;
    }

    const text = [
      'Bonjour, je souhaite un renseignement ou un devis.',
      `Nom : ${name}`,
      `Commune : ${city}`,
      `Besoin : ${message}`,
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

function setupFaqAssistant() {
  const widget = document.querySelector('.faq-assistant');
  const panel = document.getElementById('faq-assistant-panel');
  const toggle = widget?.querySelector('.faq-assistant-toggle');
  const closeButton = widget?.querySelector('.faq-assistant-close');
  const form = document.getElementById('faq-assistant-form');
  const input = document.getElementById('faq-assistant-input');
  const messages = document.getElementById('faq-assistant-messages');
  if (
    !widget
    || !(panel instanceof HTMLElement)
    || !(toggle instanceof HTMLButtonElement)
    || !(closeButton instanceof HTMLButtonElement)
    || !(form instanceof HTMLFormElement)
    || !(input instanceof HTMLInputElement)
    || !(messages instanceof HTMLElement)
  ) return;

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
    else toggle.focus();
  };

  const addMessage = (text, sender) => {
    const message = document.createElement('p');
    message.className = `faq-assistant-message faq-assistant-message--${sender}`;
    message.textContent = text;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  };

  const getAnswer = (question) => {
    const normalized = question.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (/prix|tarif|combien|cout|devis/.test(normalized)) {
      return 'Le site ne publie pas de tarif : le prix dépend de la situation. Appelez pour expliquer le problème et demander les modalités d’un devis avant toute intervention.';
    }
    if (/claqu|bloqu|verrouill|porte fermee|enferme|serrure (?:coincee|ne tourne plus)|cle[s]? (?:perdue|perdues|cassee|cassees|oubliee|oubliees)|(?:perdu|perdue|perdus|perdues|casse|cassee|casses|cassees) .*cle|ne s ouvre plus/.test(normalized)) {
      return 'Évitez de forcer la porte ou la serrure, cela pourrait aggraver les dégâts. Décrivez si la porte est claquée ou verrouillée et précisez votre commune au serrurier.';
    }
    if (/disponib|maintenant|horaires?|nuit|week.?end|urgence|24.?h|ouvert(?:e|s)? (?:maintenant|aujourd|ce soir)/.test(normalized)) {
      return 'Le service est annoncé 24h/24 et 7j/7. La disponibilité et le délai dépendent de votre localisation et du dépannage : appelez directement pour les confirmer.';
    }
    if (/commune|ville|zone|interven|adresse|secteur|deplac|venez|desserv|autour de|villeurbanne|vaulx|venissieux|caluire|bron|decines/.test(normalized)) {
      return 'Le site cite Lyon, Meyzieu, Genas, Jonage, Crémieu, Bourgoin-Jallieu, Tignieu-Jameyzieu, Pont-de-Chéruy et les communes voisines. Cette liste ne garantit pas la prise en charge : appelez pour confirmer votre adresse.';
    }
    if (/service|prestation|serrur|volet|vitr|blind|installation|repar|ouvertures? de porte|ouvrir (?:une|ma) porte/.test(normalized)) {
      return 'Les prestations présentées sont le dépannage d’urgence, l’ouverture et la réparation de serrure, les portes blindées, les volets roulants et la vitrerie.';
    }
    if (/contact|appeler|telephone|whatsapp|parler/.test(normalized)) {
      return 'Vous pouvez appeler le serrurier ou lui écrire sur WhatsApp avec les boutons ci-dessous. Pour une urgence, l’appel est le moyen le plus direct.';
    }
    return 'Je n’ai pas trouvé de réponse fiable dans les informations du site. Pour éviter de vous induire en erreur, appelez le serrurier ou écrivez-lui sur WhatsApp.';
  };

  const submitQuestion = (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    addMessage(trimmed, 'user');
    addMessage(getAnswer(trimmed), 'bot');
    trackAnalytics('FAQ Assistant Question');
    input.value = '';
    input.focus();
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuestion(input.value);
  });
  messages.querySelectorAll('[data-assistant-question]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button instanceof HTMLButtonElement) submitQuestion(button.dataset.assistantQuestion || '');
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
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
  const chapterCache = new Map(
    [[0, Promise.resolve(CHAPTERS[0].image)]],
  );

  const loadChapter = (index) => {
    if (!chapterCache.has(index)) {
      const chapter = CHAPTERS[index];
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = chapter.image;
      chapterCache.set(index, preload.decode().then(() => chapter.image));
    }
    return chapterCache.get(index);
  };

  const warmNextChapter = (index) => {
    const nextIndex = index + 1;
    if (nextIndex >= CHAPTERS.length) return;
    loadChapter(nextIndex).catch((error) => {
      console.error(`Impossible de précharger l'image « ${CHAPTERS[nextIndex].name} ».`, error);
    });
  };

  const showChapter = async (index) => {
    if (index === requestedChapter || !CHAPTERS[index]) return;
    requestedChapter = index;
    const request = ++requestId;
    const nextLayer = 1 - activeLayer;
    const chapter = CHAPTERS[index];

    try {
      await loadChapter(index);
      if (request !== requestId) return;
      const image = layers[nextLayer];
      image.src = chapter.image;
      image.alt = chapter.name;
      image.removeAttribute('aria-hidden');
      layers[activeLayer].alt = '';
      layers[activeLayer].setAttribute('aria-hidden', 'true');
      image.dataset.chapter = String(index);
      await image.decode();
      if (request !== requestId) return;
      requestAnimationFrame(() => {
        if (request !== requestId) return;
        image.classList.add('is-active');
        layers[activeLayer].classList.remove('is-active');
        activeLayer = nextLayer;
        activeChapter = index;
        updateStatus(index);
      });
      warmNextChapter(index);
    } catch (error) {
      if (request !== requestId) return;
      requestedChapter = activeChapter;
      console.error(`Impossible de charger l'image « ${chapter.name} ».`, error);
    }
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
    () => {
      const currentStep = Array.from(steps).find((step) => {
        const bounds = step.getBoundingClientRect();
        return bounds.top <= window.innerHeight * 0.55 && bounds.bottom >= window.innerHeight * 0.45;
      });
      if (currentStep) showChapter(Number(currentStep.dataset.heroImage));
    },
    { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
  );

  steps.forEach((step) => observer.observe(step));
  warmNextChapter(0);
}

function setupHeroParallax() {
  const visual = document.querySelector('.hero-visual');
  const img = visual?.querySelector('.hero-photo');
  if (!visual || !img || prefersReducedMotion) return;

  let frame = 0;
  let isVisible = false;
  const update = () => {
    if (!isVisible) {
      frame = 0;
      return;
    }
    if (window.matchMedia('(max-width: 1099px)').matches) {
      visual.style.setProperty('--hero-parallax-y', '0px');
      frame = 0;
      return;
    }
    const bounds = visual.getBoundingClientRect();
    const progress = (bounds.top + bounds.height / 2 - window.innerHeight / 2)
      / (window.innerHeight / 2 + bounds.height / 2);
    const offset = Math.max(-1, Math.min(1, progress)) * -18;
    visual.style.setProperty('--hero-parallax-y', `${offset.toFixed(1)}px`);
    frame = 0;
  };
  const scheduleUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  if (!('IntersectionObserver' in window)) {
    isVisible = true;
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) scheduleUpdate();
    },
    { rootMargin: '100px' },
  );
  observer.observe(visual);
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
}

function setupScrollProgress() {
  const progress = document.querySelector('.scroll-progress');
  if (!progress) return;

  let frame = 0;
  const update = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const value = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    progress.style.setProperty('--scroll-progress', String(Math.min(value, 1)));
    frame = 0;
  };
  window.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  }, { passive: true });
  update();
}

setupStagger();
document.addEventListener('DOMContentLoaded', () => {
  setupReveals();
  bindPhone();
  setupMobileContactCta();
  setupInterventionMap();
  setupQuoteForm();
  setupAnalyticsConsent();
  setupFaqAssistant();
  setupHeroStoryImages();
  setupHeroParallax();
  setupScrollProgress();
});
