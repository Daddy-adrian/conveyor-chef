// dragDrop.js - Pointer Events based drag-and-drop system for conveyor items

import audioManager from './audioManager.js';
import gameEngine from './gameEngine.js';

class DragDropManager {
  constructor() {
    this.activeItem = null;
    this.startX = 0;
    this.startY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
    this.currentDropZone = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
  }

  init() {
    // Delegate pointerdown on the conveyor container
    const container = document.getElementById('conveyor-items');
    if (container) {
      container.addEventListener('pointerdown', this._onPointerDown);
    }
  }

  _onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click only

    const card = e.target.closest('.item-card');
    if (!card) return;

    e.preventDefault();

    this.activeItem = card;
    const itemId = card.id;
    const label = card.dataset.nounLabel || '';

    // Mark as dragging in gameEngine so conveyor movement loop skips it
    gameEngine.setItemDragging(itemId, true);

    // Speak noun immediately on drag start
    audioManager.speakWord(label);

    // Add glowing class to the item card and label bubble
    card.classList.add('is-dragging', 'label-glow');

    // Capture initial pointer coordinates and element's screen position
    const rect = card.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    // Move to body level during drag so it renders above all drop zones without clipping
    card.style.position = 'fixed';
    card.style.left = `${this.initialLeft}px`;
    card.style.top = `${this.initialTop}px`;
    card.style.transform = 'scale(1.15) rotate(3deg)';
    card.style.zIndex = '9999';

    // Capture pointer events
    if (card.setPointerCapture) {
      try {
        card.setPointerCapture(e.pointerId);
      } catch (err) {
        // Fallback gracefully if capture fails
      }
    }

    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerCancel);
  }

  _onPointerMove(e) {
    if (!this.activeItem) return;

    e.preventDefault();

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    const currentX = this.initialLeft + deltaX;
    const currentY = this.initialTop + deltaY;

    this.activeItem.style.left = `${currentX}px`;
    this.activeItem.style.top = `${currentY}px`;

    // Detect if pointer is hovering over any drop zone
    this._checkDropZoneHover(e.clientX, e.clientY);
  }

  _checkDropZoneHover(x, y) {
    // Hide active item temporarily to hit-test underlying elements
    this.activeItem.style.visibility = 'hidden';
    const elemBelow = document.elementFromPoint(x, y);
    this.activeItem.style.visibility = 'visible';

    let dropZone = elemBelow ? elemBelow.closest('.drop-zone') : null;

    // Fallback: If pointer is near or bounding box intersects a drop zone
    if (!dropZone) {
      dropZone = this._findIntersectingDropZone(x, y);
    }

    if (this.currentDropZone !== dropZone) {
      if (this.currentDropZone) {
        this.currentDropZone.classList.remove('drag-over', 'open-door', 'drag-over-valid', 'drag-over-invalid');
      }
      this.currentDropZone = dropZone;

      if (this.currentDropZone) {
        // Immediately add .open-door so doors/flaps swing open to invite item in
        this.currentDropZone.classList.add('drag-over', 'open-door');
      }
    }
  }

  _findIntersectingDropZone(x, y) {
    // Priority order for hit testing: nested or layered zones first
    const priorityZoneIds = [
      'zone-plate',
      'zone-cabinet_behind',
      'zone-cabinet_in',
      'zone-shelf',
      'zone-box',
      'zone-table_under',
      'zone-table_on',
      'zone-fridge',
      'zone-sink'
    ];

    const margin = 10;
    for (const id of priorityZoneIds) {
      const zone = document.getElementById(id);
      if (!zone) continue;
      const rect = zone.getBoundingClientRect();
      if (
        x >= rect.left - margin &&
        x <= rect.right + margin &&
        y >= rect.top - margin &&
        y <= rect.bottom + margin
      ) {
        return zone;
      }
    }

    const zones = document.querySelectorAll('.drop-zone');
    for (const zone of zones) {
      const rect = zone.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return zone;
      }
    }
    return null;
  }

  _onPointerUp(e) {
    if (!this.activeItem) return;

    const card = this.activeItem;
    const itemId = card.id;
    const label = card.dataset.nounLabel || '';

    // Clear pointer listeners
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);

    // Identify drop zone under pointer or card center
    card.style.visibility = 'hidden';
    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
    card.style.visibility = 'visible';

    let dropZone = elemBelow ? elemBelow.closest('.drop-zone') : null;
    if (!dropZone) {
      dropZone = this._findIntersectingDropZone(e.clientX, e.clientY);
    }

    const targetZoneToClose = this.currentDropZone || dropZone;

    let handled = false;
    if (dropZone) {
      const zoneId = dropZone.dataset.zoneId;
      // Pass { item, zoneId } to gameEngine
      if (typeof gameEngine.handleDrop === 'function') {
        handled = gameEngine.handleDrop({ item: { id: itemId, label }, zoneId });
      } else if (typeof gameEngine.handleItemDrop === 'function') {
        handled = gameEngine.handleItemDrop(itemId, zoneId);
      }
    }

    if (handled) {
      // Play soft drop/thud sound
      audioManager.playThud();

      // Keep open briefly so user sees placement, then door snaps shut
      if (targetZoneToClose) {
        setTimeout(() => {
          targetZoneToClose.classList.remove('open-door', 'drag-over');
        }, 550);
      }
    } else {
      if (targetZoneToClose) {
        targetZoneToClose.classList.remove('open-door', 'drag-over');
      }

      // If dropped on an incorrect zone, wobble and boop
      if (dropZone) {
        dropZone.classList.add('zone-wrong');
        audioManager.playBoop();
        setTimeout(() => dropZone.classList.remove('zone-wrong'), 500);
      }

      // Return card back to conveyor belt
      this._returnToConveyor(card, itemId);
    }

    this.currentDropZone = null;
    this.activeItem = null;
  }

  _onPointerCancel(e) {
    if (this.activeItem) {
      this._returnToConveyor(this.activeItem, this.activeItem.id);
      this.activeItem = null;
    }
    if (this.currentDropZone) {
      this.currentDropZone.classList.remove('drag-over', 'open-door', 'drag-over-valid', 'drag-over-invalid');
      this.currentDropZone = null;
    }
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
  }

  _returnToConveyor(card, itemId) {
    card.classList.remove('is-dragging', 'label-glow');

    // Reset styles back to relative conveyor placement
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    card.style.zIndex = '';

    const container = document.getElementById('conveyor-items');
    if (container && card.parentNode !== container) {
      container.appendChild(card);
    }

    // Resume conveyor motion in gameEngine
    gameEngine.setItemDragging(itemId, false);
  }
}

export const dragDropManager = new DragDropManager();
export default dragDropManager;
