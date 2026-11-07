// gameEngine.js - Spawning, conveyor item motion, mission logic, scoring, and WebRTC Multiplayer Sync

import { nouns, generateMission } from './config.js';
import audioManager from './audioManager.js';
import uiManager from './uiManager.js';
import networkManager from './networkManager.js';

class GameEngine {
  constructor() {
    this.conveyorItemsContainer = document.getElementById('conveyor-items');
    this.conveyorBelt = document.getElementById('conveyor-belt');

    this.items = []; // Array of active items: { id, noun, el, x, isDragging }
    this.itemIdCounter = 0;

    this.beltSpeed = 1.0;
    this.baseSpeedPixelsPerSec = 75; // Base conveyor speed in pixels per second
    this.isPaused = false;

    this.currentMission = null;
    this.currentMissionProgress = 0;
    this.score = 0;

    this.spawnTimer = null;
    this.spawnIntervalMs = 2400; // Time between spawns

    this.lastFrameTime = performance.now();
    this.animationFrameId = null;

    // Multiplayer State
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomCode = null;

    this._bindEvents();
    this._setupNetworkListeners();
  }

  _bindEvents() {
    uiManager.setPauseToggleCallback((paused, fromNetwork = false) => {
      this.isPaused = paused;
      if (!this.isPaused) {
        this.lastFrameTime = performance.now();
      }
      if (!fromNetwork && this.isMultiplayer) {
        networkManager.send('SET_PAUSED', { isPaused: paused });
      }
    });

    uiManager.setSpeedChangeCallback((speed, fromNetwork = false) => {
      this.beltSpeed = speed;
      this._resetSpawnTimer();
      if (!fromNetwork && this.isMultiplayer) {
        networkManager.send('SET_SPEED', { speed });
      }
    });

    // Listen for network connection state changes (e.g. peer disconnects)
    networkManager.onConnectionChange((state, details) => {
      uiManager.updateNetworkBadge(state, details);
      if (state === 'disconnected' && this.isMultiplayer) {
        console.warn('[GameEngine] Partner disconnected. Switching to authoritative solo mode.');
        this.isMultiplayer = false;
        this.isHost = true;
        this._startSpawnTimer();
      }
    });
  }

  /**
   * Sets up incoming WebRTC DataChannel message handlers
   * @private
   */
  _setupNetworkListeners() {
    // 1. Client receives authoritative mission from Host
    networkManager.onMessage('SYNC_MISSION', (data) => {
      console.log('[GameEngine] Received SYNC_MISSION from Host:', data.mission);
      this.currentMission = data.mission;
      this.currentMissionProgress = data.progress || 0;
      uiManager.renderMission(this.currentMission, this.currentMissionProgress);
      this._clearConveyorDOMAndItems();

      // Read new mission out loud with karaoke word highlight
      setTimeout(() => {
        uiManager.speakCurrentMission();
      }, 150);
    });

    // 2. Client receives spawned item on conveyor from Host
    networkManager.onMessage('SPAWN_ITEM', (data) => {
      if (this.isHost) return; // Only Client accepts remote spawn commands
      this._handleRemoteSpawnItem(data.instanceId, data.nounId);
    });

    // 3. Either peer receives notification that an item was placed into a kitchen station
    networkManager.onMessage('ITEM_DROPPED', (data) => {
      console.log('[GameEngine] Received ITEM_DROPPED from partner:', data);
      this._handleRemoteItemDropped(data.instanceId, data.nounId, data.zoneId);
    });

    // 4. Client receives confirmation that target quantity was completed
    networkManager.onMessage('ORDER_COMPLETE', (data) => {
      console.log('[GameEngine] Received ORDER_COMPLETE from Host');
      this._handleRemoteMissionComplete(data.score, data.xp);
    });

    // 5. Spacebar / Pause toggle synchronization
    networkManager.onMessage('SET_PAUSED', (data) => {
      uiManager.togglePause(data.isPaused, true);
    });

    // 6. Conveyor Belt speed synchronization
    networkManager.onMessage('SET_SPEED', (data) => {
      uiManager.setSpeed(data.speed, true);
    });
  }

  /**
   * Initializes local solo game
   */
  startSolo() {
    this.isMultiplayer = false;
    this.isHost = true;
    this.roomCode = null;
    networkManager.disconnect();
    uiManager.updateNetworkBadge('solo');
    this.init();
  }

  /**
   * Starts game as the authoritative multiplayer Host
   * @param {string} roomCode
   */
  startAsHost(roomCode) {
    this.isMultiplayer = true;
    this.isHost = true;
    this.roomCode = roomCode;
    uiManager.updateNetworkBadge('connected', { code: roomCode, isHost: true });

    // Host initializes game and generates first mission
    this.init();

    // Broadcast initial mission to client
    if (this.currentMission) {
      networkManager.send('SYNC_MISSION', {
        mission: this.currentMission,
        progress: this.currentMissionProgress
      });
    }
  }

  /**
   * Starts game as the connected multiplayer Sous-Chef (Client)
   * @param {string} roomCode
   */
  startAsClient(roomCode) {
    this.isMultiplayer = true;
    this.isHost = false;
    this.roomCode = roomCode;
    uiManager.updateNetworkBadge('connected', { code: roomCode, isHost: false });

    // Client does NOT run local spawn interval; awaits items and missions from Host
    this._clearConveyorDOMAndItems();
    this.lastFrameTime = performance.now();
    if (!this.animationFrameId) {
      this._gameLoop();
    }
  }

  /**
   * Initializes the game loop and spawns
   */
  init() {
    this.nextMission();
    this._startSpawnTimer();
    this.lastFrameTime = performance.now();
    if (!this.animationFrameId) {
      this._gameLoop();
    }
  }

  /**
   * Clears conveyor belt items and DOM elements
   * @private
   */
  _clearConveyorDOMAndItems() {
    this.items = [];
    if (this.conveyorItemsContainer) {
      this.conveyorItemsContainer.innerHTML = '';
    }
  }

  /**
   * Generates and starts a new mission (Host or Solo)
   */
  nextMission() {
    // In multiplayer, only Host creates missions
    if (this.isMultiplayer && !this.isHost) {
      return;
    }

    this.currentMission = generateMission();
    this.currentMissionProgress = 0;
    uiManager.renderMission(this.currentMission, this.currentMissionProgress);

    // If multiplayer host, broadcast mission to client
    if (this.isMultiplayer && this.isHost) {
      networkManager.send('SYNC_MISSION', {
        mission: this.currentMission,
        progress: 0
      });
    }

    // Speak mission out loud with karaoke highlight
    setTimeout(() => {
      uiManager.speakCurrentMission();
    }, 150);
  }

  _startSpawnTimer() {
    this._resetSpawnTimer();
  }

  _resetSpawnTimer() {
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = null;
    }
    // If client in multiplayer or belt stopped, do not spawn on timer
    if ((this.isMultiplayer && !this.isHost) || this.beltSpeed <= 0) {
      return;
    }

    // Faster belt spawns slightly more frequently
    const adjustedInterval = Math.max(900, Math.round(this.spawnIntervalMs / this.beltSpeed));
    this.spawnTimer = setInterval(() => {
      if (!this.isPaused && this.beltSpeed > 0) {
        this.spawnItem();
      }
    }, adjustedInterval);
  }

  /**
   * Spawns a draggable item card on the conveyor belt
   */
  spawnItem() {
    if (!this.conveyorItemsContainer) return;

    // In multiplayer, ONLY Host spawns items
    if (this.isMultiplayer && !this.isHost) return;

    // Pick a random noun, giving higher probability to the target noun
    let chosenNoun;
    if (this.currentMission && Math.random() < 0.42) {
      chosenNoun = this.currentMission.noun;
    } else {
      chosenNoun = nouns[Math.floor(Math.random() * nouns.length)];
    }

    const instanceId = `item_${Date.now()}_${++this.itemIdCounter}`;
    this._createConveyorItemDOM(instanceId, chosenNoun, -80);

    // Broadcast spawn to Client in multiplayer
    if (this.isMultiplayer && this.isHost) {
      networkManager.send('SPAWN_ITEM', {
        instanceId,
        nounId: chosenNoun.id
      });
    }
  }

  /**
   * Helper to instantiate an item card DOM element on the conveyor belt
   * @private
   */
  _createConveyorItemDOM(instanceId, noun, initialX = -80) {
    if (!this.conveyorItemsContainer || !noun) return;

    const itemEl = document.createElement('div');
    itemEl.className = 'item-card';
    itemEl.id = instanceId;
    itemEl.dataset.nounId = noun.id;
    itemEl.dataset.nounLabel = noun.label;

    itemEl.innerHTML = `
      <span class="item-icon" aria-hidden="true">${noun.icon}</span>
      <span class="item-label">${noun.label}</span>
    `;

    // Click/touch immediately pronounces the single noun
    itemEl.addEventListener('pointerdown', () => {
      audioManager.speakWord(noun.label);
    });

    itemEl.style.transform = `translateX(${initialX}px)`;
    this.conveyorItemsContainer.appendChild(itemEl);

    const itemObj = {
      id: instanceId,
      noun,
      el: itemEl,
      x: initialX,
      isDragging: false
    };

    this.items.push(itemObj);
    return itemObj;
  }

  /**
   * Handles remote item spawn received from Host
   * @private
   */
  _handleRemoteSpawnItem(instanceId, nounId) {
    const foundNoun = nouns.find((n) => n.id === nounId);
    if (!foundNoun) return;
    this._createConveyorItemDOM(instanceId, foundNoun, -80);
  }

  /**
   * Handles remote drop action executed on partner's laptop
   * @private
   */
  _handleRemoteItemDropped(instanceId, nounId, zoneId) {
    // 1. Locate and remove item from local conveyor belt
    const itemIndex = this.items.findIndex((it) => it.id === instanceId);
    if (itemIndex !== -1) {
      const item = this.items[itemIndex];
      if (item.el && item.el.parentNode) {
        item.el.parentNode.removeChild(item.el);
      }
      this.items.splice(itemIndex, 1);
    } else {
      const fallbackEl = document.getElementById(instanceId);
      if (fallbackEl && fallbackEl.parentNode) {
        fallbackEl.parentNode.removeChild(fallbackEl);
      }
    }

    // 2. Play soft drop/thud sound
    audioManager.playThud();

    // 3. Trigger drop zone opening/closing animation
    const zoneEl = document.getElementById(`zone-${zoneId}`);
    if (zoneEl) {
      zoneEl.classList.add('open-door');
      setTimeout(() => zoneEl.classList.remove('open-door'), 550);
    }

    // 4. Add mini placed item into destination zone
    const noun = nouns.find((n) => n.id === nounId) || (this.currentMission ? this.currentMission.noun : null);
    if (noun) {
      this._addMiniItemToZone(zoneId, noun);
    }

    // 5. Increment placed count and update progress UI
    this.currentMissionProgress += 1;
    this.score += 20;
    uiManager.updateScore(this.score);
    if (this.currentMission) {
      uiManager.updateMissionProgress(this.currentMissionProgress, this.currentMission.count);
    }

    // 6. If this machine is Host, check for mission completion!
    if (this.isHost && this.currentMission && this.currentMissionProgress >= this.currentMission.count) {
      this._handleMissionComplete();
    }
  }

  /**
   * Main game animation loop
   */
  _gameLoop() {
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (!this.isPaused && deltaTime > 0) {
      this._updateConveyor(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(() => this._gameLoop());
  }

  /**
   * Moves spawned items along the conveyor belt from left to right
   */
  _updateConveyor(deltaTime) {
    if (!this.conveyorBelt) return;
    const beltWidth = this.conveyorBelt.clientWidth;
    const speed = this.baseSpeedPixelsPerSec * this.beltSpeed;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.isDragging) continue;

      item.x += speed * deltaTime;
      item.el.style.transform = `translateX(${item.x}px)`;

      // If item exits right boundary, remove it cleanly
      if (item.x > beltWidth + 40) {
        if (item.el.parentNode) {
          item.el.parentNode.removeChild(item.el);
        }
        this.items.splice(i, 1);
      }
    }
  }

  /**
   * Universal drop handler supporting both object signature { item, zoneId } and (itemId, zoneId)
   */
  handleDrop({ item, zoneId }) {
    const id = typeof item === 'object' ? item.id : item;
    return this.handleItemDrop(id, zoneId);
  }

  /**
   * Handles dropping an item card on a target zone by local player
   * @param {string} itemId
   * @param {string} zoneId
   * @returns {boolean} Whether drop was valid for the current mission
   */
  handleItemDrop(itemId, zoneId) {
    let item = this.items.find((it) => it.id === itemId);
    let itemIndex = this.items.indexOf(item);

    // Fallback search directly in DOM if array index was slightly desynced
    if (!item) {
      const el = document.getElementById(itemId);
      if (el) {
        item = {
          id: itemId,
          noun: { id: el.dataset.nounId, label: el.dataset.nounLabel },
          el
        };
      }
    }

    if (!item || !this.currentMission) return false;

    const isCorrectNoun = item.noun.id === this.currentMission.noun.id;
    const isCorrectZone = zoneId === this.currentMission.zoneId;

    if (isCorrectNoun && isCorrectZone) {
      // Valid placement!
      this.currentMissionProgress += 1;
      this.score += 20;
      uiManager.updateScore(this.score);
      uiManager.updateMissionProgress(this.currentMissionProgress, this.currentMission.count);

      // Visual placement in drop zone
      this._addMiniItemToZone(zoneId, item.noun);

      // Remove from conveyor tracking and DOM
      if (item.el && item.el.parentNode) {
        item.el.parentNode.removeChild(item.el);
      }
      if (itemIndex !== -1) {
        this.items.splice(itemIndex, 1);
      }

      // In multiplayer: broadcast drop to partner laptop immediately!
      if (this.isMultiplayer) {
        networkManager.send('ITEM_DROPPED', {
          instanceId: itemId,
          nounId: item.noun.id,
          zoneId
        });
      }

      // Check if target count completed
      if (this.currentMissionProgress >= this.currentMission.count) {
        if (this.isHost) {
          this._handleMissionComplete();
        }
      }

      return true;
    }

    return false;
  }

  _addMiniItemToZone(zoneId, noun) {
    if (typeof uiManager.addPlacedItem === 'function') {
      uiManager.addPlacedItem(zoneId, noun, this.currentMission ? this.currentMission.preposition : '');
    } else {
      const zoneContainer = document.getElementById(`zone-items-${zoneId}`);
      if (zoneContainer) {
        const miniature = document.createElement('span');
        miniature.className = 'placed-item';
        miniature.innerHTML = noun.icon || noun.label;
        miniature.title = noun.label;
        zoneContainer.appendChild(miniature);
      }
    }
  }

  /**
   * Trigger celebration, audio ding, XP, and advance to next mission
   */
  _handleMissionComplete() {
    audioManager.playDing();

    // Trigger canvas confetti celebration
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Award XP and Score bonus
    this.score += 50;
    uiManager.updateScore(this.score);
    uiManager.addXP(40);

    // If multiplayer Host: broadcast completion event to Client!
    if (this.isMultiplayer && this.isHost) {
      networkManager.send('ORDER_COMPLETE', {
        score: this.score,
        xp: 40
      });
    }

    // Brief delay before launching next mission
    setTimeout(() => {
      // Clear placed items visual preview from zones
      if (typeof uiManager.clearPlacedItems === 'function') {
        uiManager.clearPlacedItems();
      } else {
        document.querySelectorAll('.zone-items').forEach((zone) => {
          zone.innerHTML = '';
        });
      }
      this.nextMission();
    }, 1400);
  }

  /**
   * Client receives mission completion celebration from Host
   * @private
   */
  _handleRemoteMissionComplete(score, xp) {
    audioManager.playDing();

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    this.score += 50;
    uiManager.updateScore(this.score);
    uiManager.addXP(xp || 40);

    setTimeout(() => {
      if (typeof uiManager.clearPlacedItems === 'function') {
        uiManager.clearPlacedItems();
      } else {
        document.querySelectorAll('.zone-items').forEach((zone) => {
          zone.innerHTML = '';
        });
      }
    }, 1400);
  }

  /**
   * Helper to set dragging state for an item
   */
  setItemDragging(itemId, isDragging) {
    const item = this.items.find((it) => it.id === itemId);
    if (item) {
      item.isDragging = isDragging;
    }
  }
}

export const gameEngine = new GameEngine();
export default gameEngine;
