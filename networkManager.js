// networkManager.js - WebRTC DataChannel networking via PeerJS for Symmetric Shared Kitchen

class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.onConnectionChangeCallback = null;

    this.PEER_PREFIX = 'conveyorchef-room-';
  }

  init() {
    this.disconnect();
  }

  /**
   * Register a callback for a specific message type
   * @param {string} type
   * @param {function(any): void} handler
   */
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  /**
   * Send a typed payload across the WebRTC DataChannel
   * @param {string} type
   * @param {object} [payload={}]
   * @returns {boolean} Whether message was sent
   */
  send(type, payload = {}) {
    if (!this.conn || !this.isConnected) {
      return false;
    }
    try {
      this.conn.send({ type, ...payload });
      return true;
    } catch (err) {
      console.error('[NetworkManager] Error sending message:', err);
      return false;
    }
  }

  /**
   * Dispatches incoming message to registered handlers
   * @private
   */
  _dispatch(data) {
    if (!data || !data.type) return;
    const handlers = this.messageHandlers.get(data.type);
    if (handlers && handlers.length > 0) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (e) {
          console.error(`[NetworkManager] Handler error for ${data.type}:`, e);
        }
      });
    }
  }

  /**
   * Sets callback for connection state changes (connected, disconnected, hosting, solo)
   * @param {function(string, object): void} callback
   */
  onConnectionChange(callback) {
    this.onConnectionChangeCallback = callback;
  }

  /**
   * Internal notifier for connection changes
   * @private
   */
  _notifyState(state, details = {}) {
    if (typeof this.onConnectionChangeCallback === 'function') {
      this.onConnectionChangeCallback(state, details);
    }
  }

  /**
   * Generates a 4-letter uppercase room code
   * @returns {string}
   */
  generateRoomCode() {
    const chefWords = ['CHEF', 'COOK', 'BAKE', 'DISH', 'SOUP', 'SALT', 'OVEN', 'BOWL', 'CAKE', 'CHOP', 'FOOD', 'MEAL', 'WOKS', 'FORK'];
    if (Math.random() < 0.6) {
      return chefWords[Math.floor(Math.random() * chefWords.length)];
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generates the 1-click shareable URL for inviting a sous-chef via WhatsApp or messaging
   * @param {string} [roomCode]
   * @returns {string}
   */
  getInviteLink(roomCode) {
    const code = (roomCode || this.roomCode || '').trim().toUpperCase();
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?room=${encodeURIComponent(code)}`;
  }

  /**
   * Generates direct WhatsApp share URL with pre-filled invitation text
   * @param {string} [roomCode]
   * @returns {string}
   */
  getWhatsAppShareUrl(roomCode) {
    const link = this.getInviteLink(roomCode);
    const text = `👨‍🍳 Join my kitchen in The Conveyor Chef! Tap the link to start cooking together in real time: ${link}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  /**
   * Returns robust STUN configuration compatible with HTTPS & tunneling (ngrok / reverse proxies)
   * @private
   */
  _getPeerConfig() {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    return {
      debug: 1,
      secure: isHttps,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    };
  }

  /**
   * Host a kitchen with a given room code
   * @param {string} roomCode
   * @param {function(): void} [onConnectCallback]
   * @param {function(Error): void} [onErrorCallback]
   */
  host(roomCode, onConnectCallback, onErrorCallback) {
    this.disconnect();

    this.isHost = true;
    this.roomCode = String(roomCode).trim().toUpperCase();
    const peerId = `${this.PEER_PREFIX}${this.roomCode}`;

    this._notifyState('hosting', { code: this.roomCode });

    if (typeof Peer === 'undefined') {
      const err = new Error('PeerJS library is not loaded');
      if (onErrorCallback) onErrorCallback(err);
      return;
    }

    try {
      this.peer = new Peer(peerId, this._getPeerConfig());

      this.peer.on('open', (id) => {
        console.log(`[NetworkManager] Hosting room ${this.roomCode} with Peer ID:`, id);
      });

      this.peer.on('connection', (conn) => {
        console.log('[NetworkManager] Sous-chef connection received!');
        this.conn = conn;
        this._setupConnection(conn, onConnectCallback);
      });

      this.peer.on('error', (err) => {
        console.error('[NetworkManager] Host Peer error:', err);
        if (onErrorCallback) onErrorCallback(err);
      });
    } catch (err) {
      if (onErrorCallback) onErrorCallback(err);
    }
  }

  /**
   * Join an existing kitchen using room code
   * @param {string} roomCode
   * @param {function(): void} [onConnectCallback]
   * @param {function(Error): void} [onErrorCallback]
   */
  join(roomCode, onConnectCallback, onErrorCallback) {
    this.disconnect();

    this.isHost = false;
    this.roomCode = String(roomCode).trim().toUpperCase();
    const hostPeerId = `${this.PEER_PREFIX}${this.roomCode}`;

    this._notifyState('connecting', { code: this.roomCode });

    if (typeof Peer === 'undefined') {
      const err = new Error('PeerJS library is not loaded');
      if (onErrorCallback) onErrorCallback(err);
      return;
    }

    try {
      this.peer = new Peer(this._getPeerConfig());

      this.peer.on('open', (myId) => {
        console.log(`[NetworkManager] Client peer ready (${myId}), connecting to host: ${hostPeerId}`);
        const conn = this.peer.connect(hostPeerId, {
          reliable: true
        });
        this.conn = conn;
        this._setupConnection(conn, onConnectCallback);
      });

      this.peer.on('error', (err) => {
        console.error('[NetworkManager] Client Peer error:', err);
        if (onErrorCallback) onErrorCallback(err);
      });
    } catch (err) {
      if (onErrorCallback) onErrorCallback(err);
    }
  }

  /**
   * Configures event listeners on an open DataConnection
   * @private
   */
  _setupConnection(conn, onConnectCallback) {
    conn.on('open', () => {
      console.log('[NetworkManager] WebRTC DataChannel connection open!');
      this.isConnected = true;
      this._notifyState('connected', { code: this.roomCode, isHost: this.isHost });
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    conn.on('data', (data) => {
      this._dispatch(data);
    });

    conn.on('close', () => {
      console.warn('[NetworkManager] Peer connection closed');
      this.isConnected = false;
      this._notifyState('disconnected', { code: this.roomCode });
    });

    conn.on('error', (err) => {
      console.error('[NetworkManager] DataConnection error:', err);
    });
  }

  /**
   * Graceful disconnection and fallback to solo state
   */
  disconnect() {
    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomCode = null;
    this._notifyState('solo');
  }
}

export const networkManager = new NetworkManager();
export default networkManager;

