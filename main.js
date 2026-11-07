// main.js - Application bootstrap, 1-Click WhatsApp Invites & Real-Time Multiplayer Lobby

import audioManager from './audioManager.js';
import dragDropManager from './dragDrop.js';
import gameEngine from './gameEngine.js';
import uiManager from './uiManager.js';
import networkManager from './networkManager.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize drag and drop pointer events system
  dragDropManager.init();

  // 2. DOM Elements for Lobby Modal & Sub-Views
  const startOverlay = document.getElementById('start-overlay');
  const optionsView = document.getElementById('lobby-options-view');
  const hostView = document.getElementById('lobby-host-view');
  const clientView = document.getElementById('lobby-client-view');
  const autojoinView = document.getElementById('lobby-autojoin-view');

  const soloBtn = document.getElementById('lobby-solo-btn');
  const hostBtn = document.getElementById('lobby-host-btn');
  const joinBtn = document.getElementById('lobby-join-btn');
  const joinInput = document.getElementById('lobby-join-input');
  const joinError = document.getElementById('lobby-join-error');

  // Host View Elements
  const hostCodeDisplay = document.getElementById('host-room-code-display');
  const hostRoomBadge = document.getElementById('host-room-code-badge');
  const hostInviteInput = document.getElementById('host-invite-link-input');
  const hostCopyWhatsappBtn = document.getElementById('host-copy-whatsapp-btn');
  const hostOpenWhatsappBtn = document.getElementById('host-open-whatsapp-btn');
  const hostWhatsappFeedback = document.getElementById('host-whatsapp-feedback');
  const hostCopyCodeBtn = document.getElementById('host-copy-btn');
  const hostStartSoloBtn = document.getElementById('host-start-solo-btn');
  const hostCancelBtn = document.getElementById('host-cancel-btn');

  // Client Manual Join Elements
  const clientCodeDisplay = document.getElementById('client-target-code-display');
  const clientErrorBox = document.getElementById('client-error-box');
  const clientErrorText = document.getElementById('client-error-text');
  const clientCancelBtn = document.getElementById('client-cancel-btn');

  // Auto-Join (WhatsApp Invite Landing) Elements
  const autojoinCodeDisplay = document.getElementById('autojoin-code-display');
  const autojoinStartBtn = document.getElementById('autojoin-start-btn');
  const autojoinStatus = document.getElementById('autojoin-status');
  const autojoinStatusText = document.getElementById('autojoin-status-text');
  const autojoinErrorBox = document.getElementById('autojoin-error-box');
  const autojoinErrorText = document.getElementById('autojoin-error-text');
  const autojoinSoloBtn = document.getElementById('autojoin-solo-btn');

  let activeRoomCode = null;

  // View Switcher Helper
  const showView = (viewToShow) => {
    [optionsView, hostView, clientView, autojoinView].forEach((v) => {
      if (v) v.classList.add('hidden');
    });
    if (viewToShow) viewToShow.classList.remove('hidden');
  };

  // Helper to copy text to clipboard with fallback
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn('Navigator clipboard error, trying fallback:', e);
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      return false;
    }
  };

  // -------------------------------------------------------------
  // Option 1: Start Solo Game
  // -------------------------------------------------------------
  const startSoloGame = () => {
    if (startOverlay) startOverlay.classList.add('hidden');
    audioManager.unlockAudio();
    gameEngine.startSolo();
  };

  if (soloBtn) {
    soloBtn.addEventListener('click', startSoloGame);
  }

  // -------------------------------------------------------------
  // Option 2: Host Kitchen (1-Click WhatsApp Invite Link)
  // -------------------------------------------------------------
  if (hostBtn) {
    hostBtn.addEventListener('click', () => {
      activeRoomCode = networkManager.generateRoomCode();
      const inviteLink = networkManager.getInviteLink(activeRoomCode);
      const whatsappShareUrl = networkManager.getWhatsAppShareUrl(activeRoomCode);

      if (hostCodeDisplay) hostCodeDisplay.textContent = activeRoomCode;
      if (hostRoomBadge) hostRoomBadge.textContent = activeRoomCode;
      if (hostInviteInput) hostInviteInput.value = inviteLink;
      if (hostOpenWhatsappBtn) hostOpenWhatsappBtn.href = whatsappShareUrl;
      if (hostWhatsappFeedback) hostWhatsappFeedback.classList.add('hidden');

      showView(hostView);

      // Start hosting via PeerJS WebRTC
      networkManager.host(
        activeRoomCode,
        // On Sous-Chef connected callback:
        () => {
          console.log('[Main] Sous-chef connected! Launching shared kitchen...');
          if (startOverlay) startOverlay.classList.add('hidden');
          audioManager.unlockAudio();
          gameEngine.startAsHost(activeRoomCode);
        },
        // On Error:
        (err) => {
          console.error('[Main] Host peer error:', err);
          alert('Could not open kitchen room. Please check your network or try Solo mode.');
          showView(optionsView);
        }
      );
    });
  }

  // Copy WhatsApp Invite Link Button
  if (hostCopyWhatsappBtn) {
    hostCopyWhatsappBtn.addEventListener('click', async () => {
      if (!activeRoomCode) return;
      const link = networkManager.getInviteLink(activeRoomCode);
      const messageToShare = `👨‍🍳 Join my kitchen in The Conveyor Chef! Tap the link to start cooking together: ${link}`;

      const copied = await copyToClipboard(messageToShare);
      if (copied && hostWhatsappFeedback) {
        hostWhatsappFeedback.textContent = '✅ Copied! Send this link via WhatsApp to your sous-chef';
        hostWhatsappFeedback.classList.remove('hidden');
        setTimeout(() => {
          if (hostWhatsappFeedback) hostWhatsappFeedback.classList.add('hidden');
        }, 4000);
      }
    });
  }

  // Copy Room Code Only Button
  if (hostCopyCodeBtn) {
    hostCopyCodeBtn.addEventListener('click', async () => {
      if (!activeRoomCode) return;
      const copied = await copyToClipboard(activeRoomCode);
      if (copied) {
        hostCopyCodeBtn.textContent = '✅ Copied!';
        hostCopyCodeBtn.classList.add('copied');
        setTimeout(() => {
          hostCopyCodeBtn.textContent = '📋 Copy Code Only';
          hostCopyCodeBtn.classList.remove('copied');
        }, 1800);
      }
    });
  }

  // Host view: Play Solo Instead
  if (hostStartSoloBtn) {
    hostStartSoloBtn.addEventListener('click', () => {
      networkManager.disconnect();
      startSoloGame();
    });
  }

  // Host view: Back to Main Menu
  if (hostCancelBtn) {
    hostCancelBtn.addEventListener('click', () => {
      networkManager.disconnect();
      activeRoomCode = null;
      showView(optionsView);
    });
  }

  // -------------------------------------------------------------
  // Option 3: Manual Join Kitchen via 4-Letter Code
  // -------------------------------------------------------------
  if (joinInput) {
    joinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (joinError) joinError.classList.add('hidden');
    });

    joinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (joinBtn) joinBtn.click();
      }
    });
  }

  const handleManualJoin = () => {
    const rawCode = joinInput ? joinInput.value.trim().toUpperCase() : '';
    if (!rawCode || rawCode.length < 4) {
      if (joinError) {
        joinError.textContent = 'Please enter a valid 4-letter room code (e.g. CHEF).';
        joinError.classList.remove('hidden');
      }
      if (joinInput) joinInput.focus();
      return;
    }

    if (joinError) joinError.classList.add('hidden');
    if (clientErrorBox) clientErrorBox.classList.add('hidden');
    if (clientCodeDisplay) clientCodeDisplay.textContent = rawCode;

    showView(clientView);

    networkManager.join(
      rawCode,
      () => {
        console.log('[Main] Connected to host! Joining shared kitchen...');
        if (startOverlay) startOverlay.classList.add('hidden');
        audioManager.unlockAudio();
        gameEngine.startAsClient(rawCode);
      },
      (err) => {
        console.error('[Main] Client connection failed:', err);
        if (clientErrorBox) clientErrorBox.classList.remove('hidden');
        if (clientErrorText) {
          clientErrorText.textContent = `Could not connect to room "${rawCode}". Make sure the Host is open and waiting!`;
        }
      }
    );
  };

  if (joinBtn) {
    joinBtn.addEventListener('click', handleManualJoin);
  }

  if (clientCancelBtn) {
    clientCancelBtn.addEventListener('click', () => {
      networkManager.disconnect();
      showView(optionsView);
    });
  }

  // -------------------------------------------------------------
  // Option 4: Auto-Join Landing (via ?room=CODE WhatsApp Invite Link)
  // -------------------------------------------------------------
  const urlParams = new URLSearchParams(window.location.search);
  const autoRoom = urlParams.get('room');

  if (autoRoom) {
    const targetRoom = autoRoom.trim().toUpperCase();
    console.log(`[Main] Auto-join detected via URL parameter: ?room=${targetRoom}`);

    showView(autojoinView);
    if (autojoinCodeDisplay) autojoinCodeDisplay.textContent = targetRoom;
    if (autojoinStatusText) autojoinStatusText.textContent = `Connecting to Chef's Kitchen [${targetRoom}]...`;

    let isAudioUnlocked = false;
    let isConnected = false;

    const launchGameIfReady = () => {
      if (isConnected && isAudioUnlocked) {
        if (startOverlay) startOverlay.classList.add('hidden');
        // Clean URL query param so refresh doesn't re-trigger closed room
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
        gameEngine.startAsClient(targetRoom);
      }
    };

    // Immediately negotiate WebRTC connection in background
    networkManager.join(
      targetRoom,
      () => {
        console.log('[Main] Auto-join WebRTC DataChannel connected!');
        isConnected = true;
        if (autojoinStatusText) {
          autojoinStatusText.textContent = `Connected to [${targetRoom}]! Tap below to start.`;
        }
        if (autojoinStartBtn) {
          autojoinStartBtn.textContent = '🍳 Connected! Tap to Enter Kitchen';
        }
        launchGameIfReady();
      },
      (err) => {
        console.error('[Main] Auto-join connection failed:', err);
        if (autojoinErrorBox) autojoinErrorBox.classList.remove('hidden');
        if (autojoinErrorText) {
          autojoinErrorText.textContent = `Could not connect to kitchen "${targetRoom}". Make sure the Host is open and waiting!`;
        }
        if (autojoinStatus) autojoinStatus.classList.add('hidden');
      }
    );

    // User gesture handler: unlocks Web Audio & Web Speech API explicitly
    if (autojoinStartBtn) {
      autojoinStartBtn.addEventListener('click', () => {
        audioManager.unlockAudio();
        isAudioUnlocked = true;

        if (!isConnected) {
          autojoinStartBtn.textContent = '⏳ Connecting to Host...';
          autojoinStartBtn.disabled = true;
        }
        launchGameIfReady();
      });
    }

    if (autojoinSoloBtn) {
      autojoinSoloBtn.addEventListener('click', () => {
        networkManager.disconnect();
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
        startSoloGame();
      });
    }
  }
});
