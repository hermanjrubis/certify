/**
 * Template Upload Handler
 * Handles drag-and-drop and file input for PNG/JPEG certificate templates.
 * Enforces 20MB limit and extracts natural dimensions.
 */

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export class TemplateUpload {
  /**
   * @param {HTMLElement} dropZoneEl 
   * @param {HTMLInputElement} fileInputEl 
   * @param {object} callbacks 
   * @param {Function} callbacks.onTemplateLoaded - ({ dataUrl, width, height, imageElement, fileName }) => void
   * @param {Function} callbacks.onError - (message: string) => void
   */
  constructor(dropZoneEl, fileInputEl, callbacks = {}) {
    this.dropZone = dropZoneEl;
    this.fileInput = fileInputEl;
    this.callbacks = callbacks;
    this.dragCounter = 0;

    this.bindEvents();
  }

  bindEvents() {
    // Prevent default browser file-open behavior on drag and drop anywhere on the window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.processFile(file);
        }
        // Reset input value so re-selecting the exact same file fires the event
        this.fileInput.value = '';
      });
    }

    if (this.dropZone) {
      // Click on dropzone triggers file picker
      this.dropZone.addEventListener('click', (e) => {
        if (this.fileInput && e.target !== this.fileInput) {
          this.fileInput.click();
        }
      });

      // Keyboard support for accessibility
      this.dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.fileInput) this.fileInput.click();
        }
      });

      // Drag and drop events using counter to prevent flicker from child elements
      this.dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter++;
        this.dropZone.classList.add('drag-over');
      });

      this.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        this.dropZone.classList.add('drag-over');
      });

      this.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter--;
        if (this.dragCounter <= 0) {
          this.dragCounter = 0;
          this.dropZone.classList.remove('drag-over');
        }
      });

      this.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter = 0;
        this.dropZone.classList.remove('drag-over');

        const dt = e.dataTransfer;
        const file = dt && dt.files && dt.files[0];
        if (file) {
          this.processFile(file);
        }
      });
    }
  }

  processFile(file) {
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const fileName = (file.name || '').toLowerCase();
    const hasValidExt = /\.(png|jpe?g|webp)$/i.test(fileName);
    const hasValidMime = file.type && validMimes.includes(file.type.toLowerCase());

    // Validate type (MIME check or extension fallback for Windows Explorer drags)
    if (!hasValidMime && !hasValidExt) {
      this.emitError('Please upload a PNG or JPEG image file.');
      return;
    }

    // Validate size (20MB cap)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      this.emitError(`This image is ${sizeMB}MB, which exceeds the 20MB limit. Please upload a smaller image.`);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      this.emitError('Failed to read the image file. Please try again.');
    };

    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      const img = new Image();

      img.onerror = () => {
        this.emitError('Unable to decode image format. Please check the file and try again.');
      };

      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          this.emitError('The uploaded image has invalid dimensions.');
          return;
        }

        if (typeof this.callbacks.onTemplateLoaded === 'function') {
          this.callbacks.onTemplateLoaded({
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            imageElement: img,
            fileName: file.name
          });
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  }

  emitError(message) {
    if (typeof this.callbacks.onError === 'function') {
      this.callbacks.onError(message);
    } else {
      alert(message);
    }
  }
}
