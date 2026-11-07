// uiManager.js - UI updates, mission rendering, word karaoke, and GSAP animations

import audioManager from './audioManager.js';

class UIManager {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = 100;
    this.score = 0;

    // DOM Elements
    this.xpBarFill = document.getElementById('xp-bar-fill');
    this.xpProgressbar = document.getElementById('xp-progressbar');
    this.xpText = document.getElementById('xp-text');
    this.levelDisplay = document.getElementById('level-display');
    this.scoreDisplay = document.getElementById('score-display');

    this.missionTextEl = document.getElementById('mission-text');
    this.missionProgressEl = document.getElementById('mission-progress');
    this.replayAudioBtn = document.getElementById('replay-audio-btn');

    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeValue = document.getElementById('volume-value');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedValue = document.getElementById('speed-value');
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('resume-btn');

    this.conveyorBelt = document.getElementById('conveyor-belt');

    // Network Status Badge Elements
    this.networkBadge = document.getElementById('network-badge');
    this.networkBadgeDot = document.getElementById('network-badge-dot');
    this.networkBadgeText = document.getElementById('network-badge-text');

    this.onPauseToggleCallback = null;
    this.onSpeedChangeCallback = null;
    this.currentMission = null;

    // GSAP gear rotation tween
    this.gearTween = null;

    this._initListeners();
    this._initGSAP();
  }

  _initListeners() {
    // Volume Control
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.volumeValue) {
          this.volumeValue.textContent = `${Math.round(val * 100)}%`;
        }
        audioManager.setVolume(val);
      });
    }

    // Belt Speed Control
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        if (this.speedValue) {
          this.speedValue.textContent = speed === 0 ? 'Stopped (0x)' : `${speed.toFixed(1)}x`;
        }

        // Adjust CSS conveyor track animation duration and GSAP gear rotation timescale
        if (speed <= 0) {
          if (this.conveyorBelt) {
            this.conveyorBelt.classList.add('paused');
          }
          if (this.gearTween) {
            this.gearTween.pause();
          }
        } else {
          if (!this.pauseOverlay || this.pauseOverlay.classList.contains('hidden')) {
            if (this.conveyorBelt) {
              this.conveyorBelt.classList.remove('paused');
            }
            if (this.gearTween) {
              this.gearTween.play();
              this.gearTween.timeScale(speed);
            }
          }
          const baseDuration = 12;
          const newDuration = (baseDuration / speed).toFixed(2);
          document.documentElement.style.setProperty('--belt-speed-duration', `${newDuration}s`);
        }

        if (typeof this.onSpeedChangeCallback === 'function') {
          this.onSpeedChangeCallback(speed);
        }
      });
    }

    // Play/Pause button
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }

    // Resume button on overlay
    if (this.resumeBtn) {
      this.resumeBtn.addEventListener('click', () => {
        this.togglePause(false);
      });
    }

    // Spacebar Pause/Resume toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        this.togglePause();
      }
    });

    // Replay speech audio button
    if (this.replayAudioBtn) {
      this.replayAudioBtn.addEventListener('click', () => {
        this.speakCurrentMission();
      });
    }

    // Read out loud buttons on all Drop Zones
    document.querySelectorAll('.drop-zone').forEach((zone) => {
      const speakBtn = zone.querySelector('.zone-speak-btn');
      const label = zone.querySelector('.tab-title') || zone.querySelector('.zone-label');
      const zoneId = zone.dataset.zoneId || '';

      const spokenMap = {
        'table_on': 'on the table',
        'table_under': 'under the table',
        'plate': 'on the plate',
        'cabinet_in': 'in the cabinet',
        'cabinet_behind': 'behind the cabinet',
        'box': 'in the box',
        'shelf': 'on the shelf',
        'sink': 'in the sink',
        'fridge': 'into the fridge'
      };

      const speakZone = (e) => {
        e.stopPropagation();
        const phrase = spokenMap[zoneId] || (label ? label.textContent.trim() : zoneId);
        audioManager.speakMission(phrase);
      };

      if (speakBtn) speakBtn.addEventListener('click', speakZone);
      if (label) label.addEventListener('click', speakZone);
    });
  }

  /**
   * Initializes GSAP animations: gears spinning, entrance staggers
   */
  _initGSAP() {
    if (typeof gsap === 'undefined') return;

    // Continuous gear rotation
    const gears = document.querySelectorAll('.conveyor-gear');
    if (gears.length > 0) {
      this.gearTween = gsap.to(gears, {
        rotation: 360,
        transformOrigin: '50% 50%',
        duration: 3,
        repeat: -1,
        ease: 'none'
      });
    }

    // Staggered entrance animation for kitchen furniture stations
    this.animateEntrance();
  }

  /**
   * Smooth GSAP entrance animation for kitchen furniture pieces
   */
  animateEntrance() {
    if (typeof gsap === 'undefined') return;
    gsap.from('.furniture-piece', {
      duration: 0.7,
      y: 45,
      opacity: 0,
      stagger: 0.09,
      ease: 'back.out(1.5)',
      clearProps: 'opacity,transform'
    });
  }

  /**
   * Sets callback for pause/play state change
   * @param {function(boolean): void} callback
   */
  setPauseToggleCallback(callback) {
    this.onPauseToggleCallback = callback;
  }

  /**
   * Sets callback for belt speed change
   * @param {function(number): void} callback
   */
  setSpeedChangeCallback(callback) {
    this.onSpeedChangeCallback = callback;
  }

  /**
   * Updates top-bar multiplayer connection status badge
   * @param {string} state - 'solo' | 'hosting' | 'connecting' | 'connected' | 'disconnected'
   * @param {object} [details={}] - { code, isHost }
   */
  updateNetworkBadge(state, details = {}) {
    if (!this.networkBadge) return;

    this.networkBadge.classList.remove(
      'status-solo',
      'status-hosting',
      'status-connecting',
      'status-connected',
      'status-disconnected'
    );
    this.networkBadge.classList.add(`status-${state}`);

    const code = details.code || 'CHEF';

    if (state === 'solo') {
      if (this.networkBadgeDot) this.networkBadgeDot.textContent = '🟢';
      if (this.networkBadgeText) this.networkBadgeText.textContent = 'Solo';
    } else if (state === 'hosting') {
      if (this.networkBadgeDot) this.networkBadgeDot.textContent = '🟡';
      if (this.networkBadgeText) this.networkBadgeText.textContent = `Hosting [${code}]...`;
    } else if (state === 'connecting') {
      if (this.networkBadgeDot) this.networkBadgeDot.textContent = '🟡';
      if (this.networkBadgeText) this.networkBadgeText.textContent = `Connecting [${code}]...`;
    } else if (state === 'connected') {
      if (this.networkBadgeDot) this.networkBadgeDot.textContent = '🟢';
      if (this.networkBadgeText) this.networkBadgeText.textContent = `Co-op: Connected [${code}]`;
    } else if (state === 'disconnected') {
      if (this.networkBadgeDot) this.networkBadgeDot.textContent = '🔴';
      if (this.networkBadgeText) this.networkBadgeText.textContent = 'Disconnected';
    }
  }

  /**
   * Sets belt speed and synchronizes slider and conveyor track CSS
   * @param {number} speed
   * @param {boolean} [fromNetwork=false]
   */
  setSpeed(speed, fromNetwork = false) {
    if (this.speedSlider) {
      this.speedSlider.value = speed;
    }
    if (this.speedValue) {
      this.speedValue.textContent = speed === 0 ? 'Stopped (0x)' : `${speed.toFixed(1)}x`;
    }

    if (speed <= 0) {
      if (this.conveyorBelt) {
        this.conveyorBelt.classList.add('paused');
      }
      if (this.gearTween) {
        this.gearTween.pause();
      }
    } else {
      if (!this.pauseOverlay || this.pauseOverlay.classList.contains('hidden')) {
        if (this.conveyorBelt) {
          this.conveyorBelt.classList.remove('paused');
        }
        if (this.gearTween) {
          this.gearTween.play();
          this.gearTween.timeScale(speed);
        }
      }
      const baseDuration = 12;
      const newDuration = (baseDuration / speed).toFixed(2);
      document.documentElement.style.setProperty('--belt-speed-duration', `${newDuration}s`);
    }

    if (!fromNetwork && typeof this.onSpeedChangeCallback === 'function') {
      this.onSpeedChangeCallback(speed, fromNetwork);
    }
  }

  /**
   * Toggles pause state or forces to explicit state if bool provided
   * @param {boolean} [forcedState]
   * @param {boolean} [fromNetwork=false]
   */
  togglePause(forcedState, fromNetwork = false) {
    const isPaused = forcedState !== undefined ? forcedState : this.pauseOverlay.classList.contains('hidden');

    if (isPaused) {
      this.pauseOverlay.classList.remove('hidden');
      if (this.playPauseBtn) {
        this.playPauseBtn.textContent = '▶️ Play';
        this.playPauseBtn.classList.add('paused');
        this.playPauseBtn.setAttribute('aria-pressed', 'true');
      }
      if (this.conveyorBelt) {
        this.conveyorBelt.classList.add('paused');
      }
      if (this.gearTween) {
        this.gearTween.pause();
      }
    } else {
      this.pauseOverlay.classList.add('hidden');
      if (this.playPauseBtn) {
        this.playPauseBtn.textContent = '⏸️ Pause';
        this.playPauseBtn.classList.remove('paused');
        this.playPauseBtn.setAttribute('aria-pressed', 'false');
      }
      if (this.conveyorBelt) {
        this.conveyorBelt.classList.remove('paused');
      }
      if (this.gearTween) {
        this.gearTween.play();
      }
    }

    if (typeof this.onPauseToggleCallback === 'function') {
      this.onPauseToggleCallback(isPaused, fromNetwork);
    }
  }

  /**
   * Renders the mission sentence where each word is wrapped in a <span class="mission-word" id="word-X">.
   * @param {object} mission - { noun, count, preposition, zoneId, sentenceText }
   * @param {number} [currentProgress=0]
   */
  renderMission(mission, currentProgress = 0) {
    this.currentMission = mission;
    if (!this.missionTextEl) return;

    this.missionTextEl.innerHTML = '';
    const words = mission.sentenceText.trim().split(/\s+/);

    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'mission-word';
      span.id = `word-${index}`;
      span.textContent = word;
      span.title = 'Click to hear word';
      span.style.cursor = 'pointer';

      // Click individual word to read it out loud
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        audioManager.speakWord(cleanWord);
      });

      this.missionTextEl.appendChild(span);
    });

    this.updateMissionProgress(currentProgress, mission.count);

    // Highlight target drop zone station visually with a warm culinary glow
    document.querySelectorAll('.drop-zone').forEach((zone) => {
      zone.classList.remove('zone-target');
      if (zone.dataset.zoneId === mission.zoneId) {
        zone.classList.add('zone-target');
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(zone, { scale: 0.97 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' });
        }
      }
    });

    // Speak mission immediately with real-time karaoke highlight
    this.speakCurrentMission();
  }

  /**
   * Reads the current mission with audioManager and updates karaoke word highlights.
   */
  speakCurrentMission() {
    if (!this.currentMission) return;

    audioManager.speakMission(this.currentMission.sentenceText, (activeIndex) => {
      this.highlightWord(activeIndex);
    });
  }

  /**
   * Highlights a specific word index in the mission sentence. -1 removes all highlights.
   * @param {number} wordIndex
   */
  highlightWord(wordIndex) {
    const allWords = document.querySelectorAll('.mission-word');
    allWords.forEach((el, idx) => {
      if (idx === wordIndex) {
        el.classList.add('active-word', 'active-reading');
      } else {
        el.classList.remove('active-word', 'active-reading');
      }
    });
  }

  /**
   * Adds placed item badge to the appropriate slot in the station with GSAP Snap & Bounce
   * @param {string} zoneId
   * @param {object} noun
   * @param {string} preposition
   */
  addPlacedItem(zoneId, noun, preposition = '') {
    const station = document.getElementById(`zone-${zoneId}`);
    let targetContainer = null;

    if (zoneId === 'table_on') {
      targetContainer = document.getElementById('zone-items-table_on');
    } else if (zoneId === 'table_under') {
      targetContainer = document.getElementById('zone-items-table_under');
    } else if (zoneId === 'plate') {
      targetContainer = document.getElementById('zone-items-plate');
    } else if (zoneId === 'cabinet_in') {
      targetContainer = document.getElementById('zone-items-cabinet_in');
      if (station) {
        station.classList.add('open-door');
        setTimeout(() => station.classList.remove('open-door'), 650);
      }
    } else if (zoneId === 'cabinet_behind') {
      targetContainer = document.getElementById('zone-items-cabinet_behind');
    } else if (zoneId === 'fridge') {
      targetContainer = document.getElementById('zone-items-fridge');
      if (station) {
        station.classList.add('open-door');
        setTimeout(() => station.classList.remove('open-door'), 650);
      }
    } else if (zoneId === 'box') {
      targetContainer = document.getElementById('zone-items-box');
      if (station) {
        station.classList.add('open-door');
        setTimeout(() => station.classList.remove('open-door'), 650);
      }
    } else if (zoneId === 'shelf') {
      targetContainer = document.getElementById('zone-items-shelf');
    } else if (zoneId === 'sink') {
      targetContainer = document.getElementById('zone-items-sink');
    } else {
      targetContainer = document.getElementById(`zone-items-${zoneId}`);
    }

    if (!targetContainer) {
      targetContainer = document.getElementById(`zone-items-${zoneId}`);
    }

    if (targetContainer) {
      const miniature = document.createElement('span');
      miniature.className = 'placed-item';
      if (noun.icon && (noun.icon.startsWith('<svg') || noun.icon.includes('<svg'))) {
        miniature.innerHTML = noun.icon;
      } else {
        miniature.textContent = noun.icon;
      }
      miniature.title = noun.label;
      targetContainer.appendChild(miniature);

      // GSAP "Snap & Bounce" animation
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(
          miniature,
          { scale: 0, y: -24, rotation: -20 },
          { scale: 1, y: 0, rotation: 0, duration: 0.5, ease: 'back.out(2.5)' }
        );

        if (station) {
          gsap.fromTo(
            station,
            { scale: 0.98 },
            { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.4)' }
          );
        }
      }
    }
  }

  /**
   * Clears all placed item containers across all furniture stations
   */
  clearPlacedItems() {
    const containers = [
      'zone-items-box',
      'zone-items-shelf',
      'zone-items-table_on',
      'zone-items-table_under',
      'zone-items-plate',
      'zone-items-sink',
      'zone-items-cabinet_in',
      'zone-items-cabinet_behind',
      'zone-items-fridge'
    ];
    containers.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  }

  /**
   * Updates mission progress text (e.g., "2 / 5 placed")
   */
  updateMissionProgress(current, target) {
    if (this.missionProgressEl) {
      this.missionProgressEl.textContent = `${current} / ${target} placed`;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(this.missionProgressEl, { scale: 1.15 }, { scale: 1, duration: 0.3 });
      }
    }
  }

  /**
   * Updates score display with a joyful counter bounce
   */
  updateScore(newScore) {
    this.score = newScore;
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = this.score;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(this.scoreDisplay, { scale: 1.35, color: '#f39c12' }, { scale: 1, color: '#2c3e50', duration: 0.4 });
      }
    }
  }

  /**
   * Adds XP and updates XP bar and level
   * @param {number} amount
   */
  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level += 1;
      this.xpNeeded = Math.round(this.xpNeeded * 1.25);
    }

    const percentage = Math.min(100, Math.round((this.xp / this.xpNeeded) * 100));

    if (this.xpBarFill) {
      this.xpBarFill.style.width = `${percentage}%`;
    }
    if (this.xpProgressbar) {
      this.xpProgressbar.setAttribute('aria-valuenow', percentage);
    }
    if (this.xpText) {
      this.xpText.textContent = `${this.xp} / ${this.xpNeeded} XP`;
    }
    if (this.levelDisplay) {
      this.levelDisplay.textContent = this.level;
    }
  }
}

export const uiManager = new UIManager();
export default uiManager;
