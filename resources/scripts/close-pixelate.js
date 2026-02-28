/* Close Pixelate — modernized
 * Original by David DeSandro & John Schulz
 * https://github.com/desandro/close-pixelate
 * Licensed under MIT
 */

'use strict';

const ClosePixelate = (() => {
  let imgData = null;
  const PI2   = Math.PI * 2;
  const PI1_4 = Math.PI / 4;

  /**
   * Render pixelated shapes onto a canvas context.
   * The first call captures pixel data from the current canvas contents;
   * subsequent calls reuse it. Call clearImageData() when the source image changes.
   */
  function renderClosePixels(ctx, renderOptions, w, h) {
    if (!imgData) {
      imgData = ctx.getImageData(0, 0, w, h).data;
    }
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < renderOptions.length; i++) {
      const opts         = renderOptions[i];
      const res          = opts.resolution;
      const size         = opts.size   || res;
      const alpha        = opts.alpha  || 1;
      const offset       = opts.offset || 0;
      const cols         = Math.ceil(w / res) + 1;
      const rows         = Math.ceil(h / res) + 1;
      const halfSize     = size / 2;
      const diamondSize  = size / Math.SQRT2;
      const halfDiamond  = diamondSize / 2;

      for (let row = 0; row < rows; row++) {
        const y      = (row - 0.5) * res + offset;
        const pixelY = Math.max(Math.min(Math.round(y), h - 1), 0);

        for (let col = 0; col < cols; col++) {
          const x      = (col - 0.5) * res + offset;
          const pixelX = Math.max(Math.min(Math.round(x), w - 1), 0);
          const idx    = (pixelX + pixelY * w) * 4;
          const r      = imgData[idx];
          const g      = imgData[idx + 1];
          const b      = imgData[idx + 2];
          const a      = alpha * (imgData[idx + 3] / 255);

          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;

          switch (opts.shape) {
            case 'circle':
              ctx.beginPath();
              ctx.arc(x, y, halfSize, 0, PI2, true);
              ctx.fill();
              ctx.closePath();
              break;
            case 'diamond':
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(PI1_4);
              ctx.fillRect(-halfDiamond, -halfDiamond, diamondSize, diamondSize);
              ctx.restore();
              break;
            default: // square
              ctx.fillRect(x - halfSize, y - halfSize, size, size);
          }
        }
      }
    }
  }

  /** Clear cached pixel data — call whenever the source image changes. */
  function clearImageData() {
    imgData = null;
  }

  /**
   * Load an image source (URL string or File object) into a canvas element,
   * append it to `container`, and resolve with { canvas, ctx, width, height }.
   *
   * URL sources require the server to send CORS headers for cross-origin images.
   * File sources are read via FileReader and are always safe to use.
   */
  function loadImage(source, container) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const w      = img.naturalWidth;
        const h      = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.id     = 'image';
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        container.innerHTML = '';
        container.appendChild(canvas);
        resolve({ canvas, ctx, width: w, height: h });
      };

      img.onerror = () => reject(
        new Error(
          typeof source === 'string'
            ? 'Could not load image. If using a URL, the server must allow cross-origin requests (CORS).'
            : 'Could not read the selected file.'
        )
      );

      if (typeof source === 'string') {
        // Attempt cross-origin load so getImageData works
        img.crossOrigin = 'anonymous';
        img.src = source;
      } else {
        // File object — use FileReader to get a data URL (always same-origin)
        const reader = new FileReader();
        reader.onload  = e => { img.src = e.target.result; };
        reader.onerror = reject;
        reader.readAsDataURL(source);
      }
    });
  }

  return { renderClosePixels, clearImageData, loadImage };
})();
