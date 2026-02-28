/**
 * pixelator.js — vanilla ES6 rewrite
 *
 * Adds an interactive UI to the Close-Pixelate canvas library.
 * No external dependencies — works with any modern browser.
 *
 * Original concept by Ben Keen @vancouverben
 * Modernized: jQuery/jQuery UI/Modernizr removed; native <dialog>,
 * HTML5 drag-and-drop, FileReader, Clipboard API, requestAnimationFrame.
 */

'use strict';

// ── Logo canvas animation ────────────────────────────────────────────────────

const logoNS = {
  ctx:        null,
  count:      0,
  circleSize: 2.6,

  init() {
    this.ctx = document.getElementById('logo').getContext('2d');
    this.ctx.translate(50, 50);
    this.draw();
  },

  draw() {
    const { ctx } = this;
    ctx.rotate(Math.PI * 2 / 50);
    ctx.fillStyle = `rgb(0,${Math.ceil(this.count * 2)},${Math.ceil(this.count * 5)})`;
    ctx.beginPath();
    ctx.arc(this.count / 2, this.count / 3, this.circleSize, 0, Math.PI * 2);
    ctx.fill();
    this.count      += 0.2;
    this.circleSize -= 0.0055;
    if (this.circleSize >= 0.01) requestAnimationFrame(() => this.draw());
  }
};

// ── Swirly animation (About dialog) ─────────────────────────────────────────

const swirlyNS = {
  ctx:        null,
  count:      0,
  circleSize: 4,
  interval:   null,

  init() {
    const canvas = document.getElementById('about-canvas');
    if (!canvas) return;
    this.ctx        = canvas.getContext('2d');
    this.count      = 0;
    this.circleSize = 4;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.setTransform(1, 0, 0, 1, 310, 135);
    clearInterval(this.interval);
    this.interval = setInterval(() => this.draw(), 5);
  },

  draw() {
    const { ctx } = this;
    ctx.rotate(Math.PI * 2 / 80);
    ctx.fillStyle = `rgb(0,${Math.ceil(this.count * 1.02)},${Math.ceil(this.count * 1.6)})`;
    ctx.beginPath();
    ctx.arc(this.count / 2, this.count / 3, this.circleSize, 0, Math.PI * 2);
    ctx.fill();
    this.count      += 0.2;
    this.circleSize -= 0.003;
    if (this.circleSize <= 0.01) clearInterval(this.interval);
  }
};

// ── Preset layer configurations ───────────────────────────────────────────────

const PRESETS = {
  1: [
    { shape: 'diamond', resolution: 98,  size: 200, offset: 0,   alpha: 1     },
    { shape: 'circle',  resolution: 20,  size: 19,  offset: 0,   alpha: 1     }
  ],
  2: [
    { shape: 'diamond', resolution: 14,  size: 27,  offset: 15,  alpha: 0.991 },
    { shape: 'circle',  resolution: 50,  size: 48,  offset: 0,   alpha: 0.651 },
    { shape: 'circle',  resolution: 50,  size: 23,  offset: 8,   alpha: 0.5   },
    { shape: 'circle',  resolution: 50,  size: 11,  offset: 8,   alpha: 0.441 }
  ],
  3: [
    { shape: 'diamond', resolution: 200, size: 10,  offset: 5,   alpha: 0.8   },
    { shape: 'diamond', resolution: 70,  size: 80,  offset: 15,  alpha: 0.1   },
    { shape: 'diamond', resolution: 112, size: 40,  offset: 15,  alpha: 0.3   },
    { shape: 'diamond', resolution: 50,  size: 20,  offset: 10,  alpha: 0.3   },
    { shape: 'diamond', resolution: 32,  size: 103, offset: 0,   alpha: 0.041 }
  ],
  4: [
    { shape: 'circle',  resolution: 32,  size: 180, offset: 0,   alpha: 0.241 },
    { shape: 'diamond', resolution: 8,   size: 10,  offset: 0,   alpha: 0.391 },
    { shape: 'circle',  resolution: 52,  size: 30,  offset: 0,   alpha: 0.261 },
    { shape: 'circle',  resolution: 40,  size: 15,  offset: 0,   alpha: 0.471 }
  ],
  5: [
    { shape: 'square',  resolution: 32,  size: 4,   offset: 0,   alpha: 1     },
    { shape: 'square',  resolution: 32,  size: 30,  offset: 0,   alpha: 0.5   },
    { shape: 'diamond', resolution: 32,  size: 90,  offset: 0,   alpha: 0.1   }
  ],
  6: [
    { shape: 'circle',  resolution: 8,   size: 50,  offset: 0,   alpha: 0.741 },
    { shape: 'diamond', resolution: 10,  size: 13,  offset: 13,  alpha: 0.611 },
    { shape: 'circle',  resolution: 62,  size: 73,  offset: 0,   alpha: 0.301 }
  ],
  7: [
    { shape: 'square',  resolution: 86,  size: 83,  offset: 0,   alpha: 0.001 },
    { shape: 'diamond', resolution: 200, size: 200, offset: 0,   alpha: 0.161 },
    { shape: 'circle',  resolution: 8,   size: 6,   offset: 8,   alpha: 1     }
  ],
  8: [
    { shape: 'diamond', resolution: 32,  size: 28,  offset: 0,   alpha: 0.501 },
    { shape: 'diamond', resolution: 194, size: 194, offset: 100, alpha: 0.551 },
    { shape: 'diamond', resolution: 32,  size: 14,  offset: 0,   alpha: 0.5   },
    { shape: 'circle',  resolution: 32,  size: 20,  offset: 16,  alpha: 0.821 },
    { shape: 'circle',  resolution: 32,  size: 7,   offset: 0,   alpha: 1     }
  ]
};

// ── Main application ─────────────────────────────────────────────────────────

const pixelator = {
  canvas:      null,
  ctx:         null,
  canvasWidth:  0,
  canvasHeight: 0,
  numLayers:    0,
  currViewMode: 'pixelate',
  animationRAF: null,
  animating:    false,

  init() {
    // Canvas support check (replaces Modernizr)
    if (!document.createElement('canvas').getContext) {
      document.getElementById('dialog-no-canvas').showModal();
      return;
    }

    logoNS.init();
    this._populateSwirlySource();
    this._setupDialogs();
    this._assignEventHandlers();
    this._setupDragDrop();
    this._initRecovery();

    this.currViewMode = document.querySelector('#view-mode [aria-selected="true"]').dataset.mode;

    // Restore from shared URL if present
    const imageParam = this._getParam('image');
    if (imageParam) {
      this._decodeURL();
    } else {
      this.loadPreset(1);
      const urlParam = this._getParam('url');
      if (urlParam) {
        document.getElementById('image-url').value = urlParam;
        document.getElementById('ir2').checked = true;
        this.loadImage(urlParam);
      } else {
        this.loadImage();
      }
    }
  },

  // ── Dialogs ────────────────────────────────────────────────────────────────

  _setupDialogs() {
    // Close button
    document.querySelectorAll('.dialog-close').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('dialog').close());
    });
    // Click outside dialog to close
    document.querySelectorAll('dialog').forEach(dlg => {
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    });
  },

  _showError(msg) {
    document.getElementById('error-message').textContent = msg;
    document.getElementById('dialog-error').showModal();
  },

  // ── Event handlers ─────────────────────────────────────────────────────────

  _assignEventHandlers() {
    // Preset style buttons
    document.getElementById('preset-style-list').addEventListener('click', e => {
      const li = e.target.closest('li');
      if (li) this.loadPreset(parseInt(li.textContent, 10), true);
    });

    // Example image dropdown
    document.getElementById('preset-images').addEventListener('change', () => {
      document.getElementById('ir1').checked = true;
      this.loadImage();
    });

    // Image URL input — mark radio
    document.getElementById('image-url').addEventListener('input', () => {
      document.getElementById('ir2').checked = true;
    });

    // Load remote URL button
    document.getElementById('load-remote-btn').addEventListener('click', () => {
      const url = document.getElementById('image-url').value.trim();
      if (!url) return;
      document.getElementById('ir2').checked = true;
      this.loadImage(url);
    });
    // Also allow Enter key in URL field
    document.getElementById('image-url').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('load-remote-btn').click();
    });

    // File upload — validate MIME type and size before processing
    document.getElementById('file-upload').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];
      const MAX_BYTES      = 50 * 1024 * 1024; // 50 MB
      if (!ALLOWED_TYPES.includes(file.type)) {
        this._showError(`Unsupported file type "${file.type}". Please choose a PNG, JPEG, GIF, WebP, or BMP image.`);
        e.target.value = '';
        return;
      }
      if (file.size > MAX_BYTES) {
        this._showError('File is too large (max 50 MB). Please choose a smaller image.');
        e.target.value = '';
        return;
      }
      document.getElementById('ir3').checked = true;
      this._loadFile(file);
    });

    // Layer controls — handle input (sliders) and change (select/checkbox) together
    const settingsEl = document.getElementById('settings');
    const settingsHandler = e => {
      // Update slider value display
      if (e.target.type === 'range') {
        const span = e.target.nextElementSibling;
        if (span?.classList.contains('range-val')) span.textContent = e.target.value;
      }
      this.repixelate();
    };
    settingsEl.addEventListener('input',  settingsHandler);
    settingsEl.addEventListener('change', settingsHandler);

    // Delete layer button (delegated)
    document.getElementById('setting-groups').addEventListener('click', e => {
      const btn = e.target.closest('.delete-setting');
      if (!btn) return;
      btn.closest('.setting-group').remove();
      this._resortLayers();
      this.repixelate();
    });

    // Add layer
    document.getElementById('add-layer-link').addEventListener('click', e => {
      e.preventDefault();
      this.addLayer();
      this.repixelate();
    });

    // View mode tabs
    document.getElementById('view-mode').addEventListener('click', e => {
      const li = e.target.closest('li[data-mode]');
      if (li) this._changeViewMode(li.dataset.mode);
    });

    // Header action buttons
    document.getElementById('link-to-image').addEventListener('click', () => this._generateLink());
    document.getElementById('generate-js').addEventListener('click',   () => this._generateJS());
    document.getElementById('save-image').addEventListener('click',    () => this._saveImage());

    // About dialog
    document.getElementById('about-link').addEventListener('click', e => {
      e.preventDefault();
      const dlg = document.getElementById('dialog-about');
      dlg.showModal();
      swirlyNS.init();
    });

    // Toggle swirly source / canvas in about dialog
    document.getElementById('toggle-about-source').addEventListener('click', () => {
      const src    = document.getElementById('swirly-source');
      const canvas = document.getElementById('about-canvas');
      const btn    = document.getElementById('toggle-about-source');
      const hidden = src.classList.contains('hidden');
      src.classList.toggle('hidden', !hidden);
      canvas.classList.toggle('hidden', hidden);
      btn.textContent = hidden ? 'Back to Swirly' : 'View Swirly Source';
    });

    // Copy URL button
    document.getElementById('copy-url-btn').addEventListener('click', () => {
      const input = document.getElementById('share-url');
      input.select();
      navigator.clipboard?.writeText(input.value).then(() => {
        const btn  = document.getElementById('copy-url-btn');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }).catch(() => {
        // Fallback: execCommand (already selected above)
        document.execCommand('copy');
      });
    });
  },

  // ── Drag-and-drop layer reorder ────────────────────────────────────────────

  _setupDragDrop() {
    const container = document.getElementById('setting-groups');
    let dragSrc = null;

    container.addEventListener('dragstart', e => {
      // Only start drag from the layer header (the grab handle)
      if (!e.target.closest('.layer-header')) { e.preventDefault(); return; }
      dragSrc = e.target.closest('.setting-group');
      dragSrc.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ''); // required for Firefox
    });

    container.addEventListener('dragend', () => {
      container.querySelectorAll('.setting-group').forEach(g =>
        g.classList.remove('dragging', 'drag-over')
      );
    });

    container.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.setting-group');
      if (target && target !== dragSrc) {
        container.querySelectorAll('.setting-group').forEach(g => g.classList.remove('drag-over'));
        target.classList.add('drag-over');
      }
    });

    container.addEventListener('drop', e => {
      e.preventDefault();
      const target = e.target.closest('.setting-group');
      if (!target || target === dragSrc) return;
      const all    = [...container.querySelectorAll('.setting-group')];
      const srcIdx = all.indexOf(dragSrc);
      const tgtIdx = all.indexOf(target);
      if (srcIdx < tgtIdx) target.after(dragSrc);
      else                  target.before(dragSrc);
      this._resortLayers();
      this.repixelate();
    });
  },

  // ── View modes ─────────────────────────────────────────────────────────────

  _changeViewMode(newMode) {
    if (newMode === this.currViewMode) return;
    if (this.animating) this._stopAnimation();

    // Update tab UI
    document.querySelectorAll('#view-mode li').forEach(li => li.removeAttribute('aria-selected'));
    document.querySelector(`#view-mode [data-mode="${newMode}"]`).setAttribute('aria-selected', 'true');
    this.currViewMode = newMode;

    // Show/hide recovery panel
    document.getElementById('recovery-panel').classList.toggle('hidden', newMode !== 'recover');

    if (newMode === 'recover') {
      // Keep the current canvas visible as the source for recovery
      return;
    }

    if (newMode === 'animate') {
      this._startAnimation();
    } else {
      // Both original and pixelate modes reload the image
      if (newMode === 'original') this.canvas = null;
      this._reloadCurrentImage();
    }
  },

  _reloadCurrentImage() {
    const source = document.querySelector('input[name="ir"]:checked').value;
    if (source === 'image_url') {
      const url = document.getElementById('image-url').value.trim();
      if (url) this.loadImage(url);
    } else if (source === 'upload') {
      // Can't re-read file after page load; current canvas is preserved
    } else {
      this.loadImage();
    }
  },

  // ── Image loading ──────────────────────────────────────────────────────────

  loadImage(customUrl) {
    const url       = customUrl || ('example_images/' + document.getElementById('preset-images').value);
    const container = document.getElementById('image-container');

    ClosePixelate.clearImageData();
    this.canvas = null;

    if (this.currViewMode === 'original') {
      // Just show the <img> tag without pixelating
      container.innerHTML = '';
      const img = document.createElement('img');
      img.alt = '';
      img.crossOrigin = 'anonymous';
      img.src = url;
      container.appendChild(img);
      return;
    }

    ClosePixelate.loadImage(url, container)
      .then(({ canvas, ctx, width, height }) => {
        this.canvas      = canvas;
        this.ctx         = ctx;
        this.canvasWidth  = width;
        this.canvasHeight = height;
        this.repixelate();
      })
      .catch(err => this._showError(err.message));
  },

  _loadFile(file) {
    const container = document.getElementById('image-container');
    ClosePixelate.clearImageData();
    this.canvas = null;

    ClosePixelate.loadImage(file, container)
      .then(({ canvas, ctx, width, height }) => {
        this.canvas       = canvas;
        this.ctx          = ctx;
        this.canvasWidth  = width;
        this.canvasHeight = height;
        this.repixelate();
      })
      .catch(err => this._showError(err.message));
  },

  // ── Pixelation ─────────────────────────────────────────────────────────────

  repixelate() {
    if (this.currViewMode === 'original' || !this.canvas) return;
    ClosePixelate.renderClosePixels(this.ctx, this._getSettings(), this.canvasWidth, this.canvasHeight);
  },

  _getSettings() {
    const settings = [];
    document.querySelectorAll('#setting-groups .setting-group').forEach(group => {
      if (!group.querySelector('.enabled').checked) return;
      settings.push({
        shape:      group.querySelector('.shape').value,
        resolution: parseInt(group.querySelector('.resolution').value, 10),
        offset:     parseInt(group.querySelector('.offset').value,     10),
        size:       parseInt(group.querySelector('.size').value,        10),
        alpha:      parseFloat(group.querySelector('.alpha').value)
      });
    });
    return settings;
  },

  // ── Layer management ───────────────────────────────────────────────────────

  addLayer(defaults = {}) {
    const data = Object.assign(
      { shape: 'circle', resolution: 32, offset: 0, size: 30, alpha: 0.5 },
      defaults
    );

    const tmpl     = document.getElementById('layer-template');
    const fragment = tmpl.content.cloneNode(true);
    const layerNum = ++this.numLayers;
    const uid      = `enable-layer-${layerNum}`;

    const cbx = fragment.querySelector('.enabled');
    cbx.id    = uid;

    const lbl = fragment.querySelector('.enabled-label');
    lbl.setAttribute('for', uid);
    lbl.textContent = `Enable Layer ${layerNum}`;

    fragment.querySelector('.shape').value      = data.shape;
    fragment.querySelector('.resolution').value = data.resolution;
    fragment.querySelector('.offset').value     = data.offset;
    fragment.querySelector('.size').value       = data.size;
    fragment.querySelector('.alpha').value      = data.alpha;

    // Populate value displays
    fragment.querySelectorAll('.control-row').forEach(row => {
      const range = row.querySelector('input[type="range"]');
      const span  = row.querySelector('.range-val');
      if (range && span) span.textContent = range.value;
    });

    document.getElementById('setting-groups').appendChild(fragment);
    this._resortLayers();
  },

  _resortLayers() {
    let n = 1;
    document.querySelectorAll('.setting-group').forEach(group => {
      group.querySelector('.enabled-label').textContent = `Enable Layer ${n++}`;
    });
  },

  loadPreset(num, repixelate = false) {
    document.getElementById('setting-groups').innerHTML = '';
    this.numLayers = 0;
    (PRESETS[num] || PRESETS[1]).forEach(s => this.addLayer(s));

    // Highlight selected preset button
    document.querySelectorAll('#preset-style-list li').forEach(li => li.classList.remove('selected'));
    const li = document.querySelector(`#preset-style-list li:nth-child(${num})`);
    if (li) li.classList.add('selected');

    if (repixelate && this.canvas) {
      ClosePixelate.renderClosePixels(this.ctx, this._getSettings(), this.canvasWidth, this.canvasHeight);
    }
  },

  // ── Share / Export ─────────────────────────────────────────────────────────

  _saveImage() {
    if (!this.canvas) return;
    const a      = document.createElement('a');
    a.href       = this.canvas.toDataURL('image/png');
    a.download   = 'pixelated.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  _generateLink() {
    const settings = this._getSettings();
    const layers   = settings.map(s =>
      `shape:${s.shape},size:${s.size},resolution:${s.resolution},alpha:${s.alpha},offset:${s.offset}`
    ).join('|');

    const imageType = document.querySelector('input[name="ir"]:checked').value;
    const image     = imageType === 'examples'
      ? document.getElementById('preset-images').value
      : document.getElementById('image-url').value;

    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('image_type', imageType);
    url.searchParams.set('image',      image);
    if (layers) url.searchParams.set('layers', layers);

    document.getElementById('share-url').value = url.toString();
    document.getElementById('dialog-link').showModal();
    document.getElementById('share-url').select();
  },

  _decodeURL() {
    const VALID_IMAGE_TYPES = ['examples', 'image_url'];
    const VALID_SHAPES      = ['circle', 'square', 'diamond'];

    const imageType = this._getParam('image_type');
    const image     = this._getParam('image');
    const layersStr = this._getParam('layers');

    // Reject unknown image_type values
    if (!VALID_IMAGE_TYPES.includes(imageType)) {
      this.loadPreset(1);
      this.loadImage();
      return;
    }

    if (imageType === 'examples') {
      document.getElementById('ir1').checked = true;
      document.getElementById('preset-images').value = image;
    } else {
      // Block dangerous URL schemes (javascript:, data:, vbscript:, etc.)
      const scheme = image.split(':')[0].toLowerCase();
      if (['javascript', 'data', 'vbscript', 'file'].includes(scheme)) {
        this.loadPreset(1);
        this.loadImage();
        return;
      }
      document.getElementById('ir2').checked = true;
      document.getElementById('image-url').value = image;
    }

    if (layersStr) {
      document.getElementById('setting-groups').innerHTML = '';
      this.numLayers = 0;
      layersStr.split('|').forEach(layerStr => {
        const setting = {};
        layerStr.split(',').forEach(pair => {
          const colonIdx = pair.indexOf(':');
          if (colonIdx === -1) return;
          const k = pair.slice(0, colonIdx);
          const v = pair.slice(colonIdx + 1);
          // Explicit key whitelist — ignore anything else (blocks __proto__, constructor, etc.)
          if      (k === 'shape'      && VALID_SHAPES.includes(v)) setting.shape      = v;
          else if (k === 'size')       setting.size       = Math.max(2,   Math.min(200,  parseInt(v,   10) || 30));
          else if (k === 'resolution') setting.resolution = Math.max(8,   Math.min(200,  parseInt(v,   10) || 32));
          else if (k === 'offset')     setting.offset     = Math.max(0,   Math.min(100,  parseInt(v,   10) || 0));
          else if (k === 'alpha')      setting.alpha      = Math.max(0.001, Math.min(1,  parseFloat(v) || 0.5));
        });
        this.addLayer(setting);
      });
    } else {
      this.loadPreset(1);
    }

    if (imageType === 'examples') this.loadImage();
    else                          this.loadImage(image);
  },

  _generateJS() {
    const settings = this._getSettings();
    const rows     = settings.map(s =>
      `  { shape: '${s.shape}', resolution: ${s.resolution}, size: ${s.size}, offset: ${s.offset}, alpha: ${s.alpha} }`
    );
    document.getElementById('js-output').value = `[\n${rows.join(',\n')}\n]`;
    document.getElementById('dialog-generate-js').showModal();
  },

  // ── Animation ──────────────────────────────────────────────────────────────

  _startAnimation() {
    this._stopAnimation();
    const sliders   = [...document.querySelectorAll('input.animatable')];
    const animData  = sliders.map(el => ({
      el,
      speed:     Math.floor(Math.random() * 30) + 20, // 20–50 frames between steps
      direction: Math.random() > 0.5 ? 1 : -1,
      value:     parseFloat(el.value),
      min:       parseFloat(el.min),
      max:       parseFloat(el.max),
      step:      parseFloat(el.step) || 1
    }));

    const animBtn = document.querySelector('#view-mode [data-mode="animate"]');
    if (animBtn) animBtn.textContent = 'Stop Animation';

    let frame = 0;
    this.animating = true;

    const tick = () => {
      if (!this.animating) return;
      frame++;

      animData.forEach(d => {
        if (frame % d.speed !== 0) return;
        d.value += d.direction * d.step;
        if (d.value >= d.max) { d.value = d.max; d.direction = -1; }
        if (d.value <= d.min) { d.value = d.min; d.direction =  1; }
        d.el.value = d.value;
        // Update display span
        const span = d.el.nextElementSibling;
        if (span?.classList.contains('range-val')) span.textContent = d.value.toFixed(d.step < 1 ? 2 : 0);
      });

      this.repixelate();
      this.animationRAF = requestAnimationFrame(tick);
    };

    this.animationRAF = requestAnimationFrame(tick);
  },

  _stopAnimation() {
    this.animating = false;
    if (this.animationRAF) {
      cancelAnimationFrame(this.animationRAF);
      this.animationRAF = null;
    }
    const btn = document.querySelector('#view-mode [data-mode="animate"]');
    if (btn) btn.textContent = 'Start Animation';
  },

  // ── Image Recovery (Experimental) ──────────────────────────────────────────

  _initRecovery() {
    document.getElementById('recover-btn-a').addEventListener('click', () => this._recoverMethodA());
    document.getElementById('recover-btn-b').addEventListener('click', () => this._recoverMethodB());
    document.getElementById('recover-btn-c').addEventListener('click', () => this._recoverMethodC());
    document.getElementById('save-recovery-btn').addEventListener('click', () => this._saveRecoveredImage());
  },

  _getSourcePixels() {
    const canvas = document.getElementById('image');
    if (!canvas) return null;
    const ctx  = canvas.getContext('2d');
    return { canvas, ctx, w: canvas.width, h: canvas.height,
             data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
  },

  _setRecoveryStatus(msg, isError = false) {
    const el = document.getElementById('recovery-status');
    el.textContent = msg;
    el.style.color = isError ? 'var(--color-danger)' : '';
  },

  _showRecoveryResult(srcCanvas) {
    const output = document.getElementById('recovery-output');
    output.classList.remove('hidden');
    const dst = document.getElementById('recovery-canvas');
    dst.width  = srcCanvas.width;
    dst.height = srcCanvas.height;
    dst.getContext('2d').drawImage(srcCanvas, 0, 0);
  },

  _saveRecoveredImage() {
    const canvas = document.getElementById('recovery-canvas');
    if (!canvas.width) return;
    const a    = document.createElement('a');
    a.href     = canvas.toDataURL('image/png');
    a.download = 'recovered.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // ── Method A: Reverse Close-Pixelate layers ─────────────────────────────────

  _recoverMethodA() {
    const src = this._getSourcePixels();
    if (!src) { this._showError('Load and pixelate an image first (use the Pixelated Image tab).'); return; }

    const settings = this._getSettings();
    if (!settings.length) { this._showError('No active layers to reverse.'); return; }

    const { data: pixels, w, h } = src;

    // Collect all grid-centre sample points from every active layer.
    // Key = py*w+px (the original image coordinate sampled by Close-Pixelate).
    const samples = new Map();
    for (const layer of settings) {
      const { resolution: res, offset, alpha } = layer;
      const cols = Math.ceil(w / res) + 1;
      const rows = Math.ceil(h / res) + 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x  = (col - 0.5) * res + offset;
          const y  = (row - 0.5) * res + offset;
          const px = Math.max(0, Math.min(w - 1, Math.round(x)));
          const py = Math.max(0, Math.min(h - 1, Math.round(y)));
          const key = py * w + px;
          if (samples.has(key)) continue;
          const idx = (px + py * w) * 4;
          // Read from pixelated canvas; approximate alpha un-compositing for single layers
          const scale = alpha < 1 ? 1 / alpha : 1;
          samples.set(key, {
            r: Math.min(255, Math.round(pixels[idx]     * scale)),
            g: Math.min(255, Math.round(pixels[idx + 1] * scale)),
            b: Math.min(255, Math.round(pixels[idx + 2] * scale)),
          });
        }
      }
    }

    // Bilinear interpolation using the primary (first) layer's grid as the framework.
    const { resolution: res, offset: off } = settings[0];

    const getGridSample = (col, row) => {
      const gx = Math.max(0, Math.min(w - 1, Math.round((col - 0.5) * res + off)));
      const gy = Math.max(0, Math.min(h - 1, Math.round((row - 0.5) * res + off)));
      return samples.get(gy * w + gx) || null;
    };

    const out = new Uint8ClampedArray(w * h * 4);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const idx = (px + py * w) * 4;
        const key = py * w + px;

        if (samples.has(key)) {
          const s = samples.get(key);
          out[idx] = s.r; out[idx + 1] = s.g; out[idx + 2] = s.b; out[idx + 3] = 255;
          continue;
        }

        const fcol = (px - off) / res + 0.5;
        const frow = (py - off) / res + 0.5;
        const c0 = Math.floor(fcol), c1 = c0 + 1;
        const r0 = Math.floor(frow), r1 = r0 + 1;
        const tx = fcol - c0, ty = frow - r0;

        const c00 = getGridSample(c0, r0), c10 = getGridSample(c1, r0);
        const c01 = getGridSample(c0, r1), c11 = getGridSample(c1, r1);
        const fb  = c00 || c10 || c01 || c11 || { r: 128, g: 128, b: 128 };
        const a00 = c00 || fb, a10 = c10 || fb, a01 = c01 || fb, a11 = c11 || fb;

        out[idx]     = Math.round(a00.r*(1-tx)*(1-ty) + a10.r*tx*(1-ty) + a01.r*(1-tx)*ty + a11.r*tx*ty);
        out[idx + 1] = Math.round(a00.g*(1-tx)*(1-ty) + a10.g*tx*(1-ty) + a01.g*(1-tx)*ty + a11.g*tx*ty);
        out[idx + 2] = Math.round(a00.b*(1-tx)*(1-ty) + a10.b*tx*(1-ty) + a01.b*(1-tx)*ty + a11.b*tx*ty);
        out[idx + 3] = 255;
      }
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w; outCanvas.height = h;
    outCanvas.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
    this._showRecoveryResult(outCanvas);

    const pct = ((samples.size / (w * h)) * 100).toFixed(1);
    this._setRecoveryStatus(
      `Done. ${samples.size.toLocaleString()} pixels recovered exactly (${pct}% of image); rest interpolated.`
    );
  },

  // ── Method B: Blind grid detection ──────────────────────────────────────────

  _recoverMethodB() {
    const src = this._getSourcePixels();
    if (!src) { this._showError('Load an image first.'); return; }

    const { data: pixels, w, h } = src;

    const hintEl   = document.getElementById('grid-hint');
    const gridSize = hintEl.value === 'auto'
      ? this._detectGridSize(pixels, w, h)
      : parseInt(hintEl.value, 10);

    this._setRecoveryStatus(`Grid: ${gridSize} px. Reconstructing…`);

    const bCols = Math.ceil(w / gridSize);
    const bRows = Math.ceil(h / gridSize);

    // Sample the centre pixel of each block as its representative colour.
    const blockColors = new Array(bRows * bCols);
    for (let br = 0; br < bRows; br++) {
      for (let bc = 0; bc < bCols; bc++) {
        const cx  = Math.min(w - 1, Math.round(bc * gridSize + gridSize / 2));
        const cy  = Math.min(h - 1, Math.round(br * gridSize + gridSize / 2));
        const idx = (cx + cy * w) * 4;
        blockColors[br * bCols + bc] = { r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] };
      }
    }

    const getBlock = (bc, br) => {
      const c = Math.max(0, Math.min(bCols - 1, bc));
      const r = Math.max(0, Math.min(bRows - 1, br));
      return blockColors[r * bCols + c];
    };

    // Bilinear interpolation between block centres.
    const out = new Uint8ClampedArray(w * h * 4);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const fcol = px / gridSize - 0.5;
        const frow = py / gridSize - 0.5;
        const bc0  = Math.floor(fcol), bc1 = bc0 + 1;
        const br0  = Math.floor(frow), br1 = br0 + 1;
        const tx   = fcol - bc0, ty = frow - br0;

        const c00 = getBlock(bc0, br0), c10 = getBlock(bc1, br0);
        const c01 = getBlock(bc0, br1), c11 = getBlock(bc1, br1);
        const idx = (px + py * w) * 4;
        out[idx]     = Math.round(c00.r*(1-tx)*(1-ty) + c10.r*tx*(1-ty) + c01.r*(1-tx)*ty + c11.r*tx*ty);
        out[idx + 1] = Math.round(c00.g*(1-tx)*(1-ty) + c10.g*tx*(1-ty) + c01.g*(1-tx)*ty + c11.g*tx*ty);
        out[idx + 2] = Math.round(c00.b*(1-tx)*(1-ty) + c10.b*tx*(1-ty) + c01.b*(1-tx)*ty + c11.b*tx*ty);
        out[idx + 3] = 255;
      }
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w; outCanvas.height = h;
    const outCtx = outCanvas.getContext('2d');
    outCtx.putImageData(new ImageData(out, w, h), 0, 0);

    // Unsharp mask on the interpolated result to recover perceived sharpness.
    this._applyUnsharpMask(outCtx, w, h, 0.6);

    this._showRecoveryResult(outCanvas);
    this._setRecoveryStatus(`Done. Detected grid size: ${gridSize} px.`);
  },

  _detectGridSize(pixels, w, h) {
    // Build a column-difference signal averaged over a sample of rows.
    const sampleRows = Math.min(h, 40);
    const rowStep    = Math.max(1, Math.floor(h / sampleRows));
    const hDiff      = new Float64Array(w);
    for (let y = rowStep; y < h; y += rowStep) {
      for (let x = 1; x < w; x++) {
        const i1 = (x - 1 + y * w) * 4;
        const i2 = (x     + y * w) * 4;
        hDiff[x] += Math.abs(pixels[i1]     - pixels[i2])
                 +  Math.abs(pixels[i1 + 1] - pixels[i2 + 1])
                 +  Math.abs(pixels[i1 + 2] - pixels[i2 + 2]);
      }
    }

    // Score each candidate grid size: mean diff at boundaries vs. interior.
    const maxGrid = Math.min(128, Math.floor(Math.min(w, h) / 3));
    let bestSize = 8, bestScore = -Infinity;
    for (let s = 2; s <= maxGrid; s++) {
      let sumB = 0, cntB = 0, sumI = 0, cntI = 0;
      for (let x = 1; x < w; x++) {
        if (x % s === 0) { sumB += hDiff[x]; cntB++; }
        else             { sumI += hDiff[x]; cntI++; }
      }
      const score = (cntB ? sumB / cntB : 0) - (cntI ? sumI / cntI : 0);
      if (score > bestScore) { bestScore = score; bestSize = s; }
    }
    return bestSize;
  },

  _applyUnsharpMask(ctx, w, h, amount) {
    const src     = ctx.getImageData(0, 0, w, h);
    const s       = src.data;
    const blurred = new Float32Array(s.length);

    // 3×3 box blur
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          blurred[(x + y * w) * 4 + c] = (
            s[((x-1) + (y-1) * w) * 4 + c] + s[(x + (y-1) * w) * 4 + c] + s[((x+1) + (y-1) * w) * 4 + c] +
            s[((x-1) +  y    * w) * 4 + c] + s[(x +  y    * w) * 4 + c] + s[((x+1) +  y    * w) * 4 + c] +
            s[((x-1) + (y+1) * w) * 4 + c] + s[(x + (y+1) * w) * 4 + c] + s[((x+1) + (y+1) * w) * 4 + c]
          ) / 9;
        }
      }
    }

    const dst = ctx.createImageData(w, h);
    const d   = dst.data;
    for (let i = 0; i < s.length; i += 4) {
      d[i]     = Math.max(0, Math.min(255, s[i]     + amount * (s[i]     - blurred[i])));
      d[i + 1] = Math.max(0, Math.min(255, s[i + 1] + amount * (s[i + 1] - blurred[i + 1])));
      d[i + 2] = Math.max(0, Math.min(255, s[i + 2] + amount * (s[i + 2] - blurred[i + 2])));
      d[i + 3] = s[i + 3];
    }
    ctx.putImageData(dst, 0, 0);
  },

  // ── Method C: TensorFlow.js convolutional enhancement ───────────────────────

  async _recoverMethodC() {
    const src = this._getSourcePixels();
    if (!src) { this._showError('Load an image first.'); return; }

    const btn = document.getElementById('recover-btn-c');
    btn.disabled = true;
    this._setRecoveryStatus('Loading TensorFlow.js…');

    if (!window.tf) {
      try {
        await new Promise((resolve, reject) => {
          const script  = document.createElement('script');
          script.src    = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load TensorFlow.js. Check your internet connection.'));
          document.head.appendChild(script);
        });
      } catch (err) {
        this._showError(err.message);
        this._setRecoveryStatus('Failed to load TensorFlow.js.', true);
        btn.disabled = false;
        return;
      }
    }

    this._setRecoveryStatus('Running convolutional enhancement…');

    try {
      const { canvas: srcCanvas, w, h } = src;

      // 5×5 Gaussian kernel (Pascal triangle approximation, σ≈1.0, sums to 1).
      const gaussBase = [1,4,6,4,1, 4,16,24,16,4, 6,24,36,24,6, 4,16,24,16,4, 1,4,6,4,1]
        .map(v => v / 256);
      // depthwiseConv2d filter shape: [kH, kW, inChannels, channelMultiplier]
      // Flatten as [k0_ch0, k0_ch1, k0_ch2, k1_ch0, ...] (last axis varies fastest)
      const gaussKernel = tf.tensor(gaussBase.flatMap(v => [v, v, v]), [5, 5, 3, 1]);

      const result = tf.tidy(() => {
        // [h, w, 3] float32 in [0, 1]
        const img   = tf.browser.fromPixels(srcCanvas).toFloat().div(255);
        const batch = img.expandDims(0); // [1, h, w, 3]

        // Pass 1: moderate Gaussian blur — softens hard block edges
        const blurred = tf.depthwiseConv2d(batch, gaussKernel, 1, 'same');

        // Pass 2: stronger blur (apply kernel again to already-blurred result)
        const blurred2 = tf.depthwiseConv2d(blurred, gaussKernel, 1, 'same');

        // Mix: blend two blurred passes + subtle pull toward original for colour fidelity
        // blurred captures structure, blurred2 is very smooth, original has block artefacts
        const enhanced = blurred.mul(0.6).add(blurred2.mul(0.25)).add(batch.mul(0.15));

        return enhanced.clipByValue(0, 1).squeeze(); // [h, w, 3]
      });

      const outCanvas = document.createElement('canvas');
      outCanvas.width = w; outCanvas.height = h;
      await tf.browser.toPixels(result, outCanvas);
      result.dispose();
      gaussKernel.dispose();

      this._showRecoveryResult(outCanvas);
      this._setRecoveryStatus('Done. Convolutional smoothing applied via TensorFlow.js.');
    } catch (err) {
      this._showError('TensorFlow.js error: ' + err.message);
      this._setRecoveryStatus('Enhancement failed.', true);
    }

    btn.disabled = false;
  },

  // ── Utilities ──────────────────────────────────────────────────────────────

  _getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  },

  _populateSwirlySource() {
    const ta = document.getElementById('swirly-source');
    if (!ta) return;
    ta.value = `<!DOCTYPE html>
<html>
<head>
  <title>A Swirly</title>
  <script>
  var ns = {
    ctx: null, interval: null, circle_size: 4, count: 0,
    init: function() {
      ns.ctx = document.getElementById('canvas').getContext('2d');
      ns.ctx.translate(225, 225);
      ns.interval = setInterval(function() { ns.draw(); }, 5);
    },
    draw: function() {
      ns.ctx.rotate(Math.PI * 2 / 80);
      ns.ctx.fillStyle = 'rgb(0,' + Math.ceil(ns.count * 1.02) + ',' + Math.ceil(ns.count * 1.6) + ')';
      ns.ctx.beginPath();
      ns.ctx.arc(ns.count / 2, ns.count / 3, ns.circle_size, 0, Math.PI * 2);
      ns.ctx.fill();
      ns.count += 0.2;
      ns.circle_size -= 0.002;
      if (ns.circle_size <= 0.01) clearInterval(ns.interval);
    }
  };
  <\/script>
</head>
<body onload="ns.init()">
  <canvas id="canvas" width="450" height="450"></canvas>
</body>
</html>`;
  }
};

document.addEventListener('DOMContentLoaded', () => pixelator.init());
