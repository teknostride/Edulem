/**
 * QuizLem - Gerçek Zamanlı Bilgi Yarışması Platformu
 * Frontend Uygulama Mantığı (app.js)
 * Dolu Dolu & Üst Düzey (Ultra-Premium) Tasarım Sistemi
 */

// ----------------------------------------------------
// 1. SES SENTEZLEYİCİ (WEB AUDIO API)
// ----------------------------------------------------
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('quizlem_muted') === 'true';
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('quizlem_muted', this.isMuted);
    return this.isMuted;
  }

  playTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, this.ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.36);
    });
  }

  playWrong() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(156, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.4);
    osc2.stop(this.ctx.currentTime + 0.4);
  }

  playFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, t: 0.00, d: 0.15 },
      { f: 659.25, t: 0.15, d: 0.15 },
      { f: 783.99, t: 0.30, d: 0.15 },
      { f: 1046.50, t: 0.45, d: 0.45 }
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, this.ctx.currentTime + n.t);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + n.t);
      osc.stop(this.ctx.currentTime + n.t + n.d);
    });
  }

  playJoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  playRiser() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.7);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.75);

      setTimeout(() => {
        this.playChime();
      }, 650);
    } catch (e) {}
  }

  playChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      const freqs = [1046.5, 1318.51, 1567.98, 2093.0];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.05);
        gain.gain.setValueAtTime(0.1, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.4);
      });
    } catch (e) {}
  }

  playDrumroll(duration = 1.8) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.Q.setValueAtTime(4, now);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.25, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);

      // Final punch hit at the end
      const hitTime = now + duration;
      const hitOsc = this.ctx.createOscillator();
      const hitGain = this.ctx.createGain();
      hitOsc.type = 'triangle';
      hitOsc.frequency.setValueAtTime(180, hitTime);
      hitOsc.frequency.exponentialRampToValueAtTime(40, hitTime + 0.35);
      hitGain.gain.setValueAtTime(0.28, hitTime);
      hitGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.4);
      hitOsc.connect(hitGain);
      hitGain.connect(this.ctx.destination);
      hitOsc.start(hitTime);
      hitOsc.stop(hitTime + 0.4);
    } catch (e) {
      console.warn('Drumroll synthesis error:', e);
    }
  }

  playCrownDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      const notes = [1318.5, 1760.0, 2093.0, 2637.0, 3135.9];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.38);
      });
    } catch (e) {}
  }
}

const sound = new SoundManager();

// ----------------------------------------------------
// 1.1 CANLI SES YAYINI VE MİKSER SİSTEMİ (WEBRTC & WEB AUDIO)
// ----------------------------------------------------
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// Vanilla ICE: Adayların SDP içerisine toplanmasını bekleme yardımcısı
function waitForIceGathering(peer, timeoutMs = 1200) {
  return new Promise((resolve) => {
    if (!peer || peer.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    let timer = null;
    const checkState = () => {
      if (peer.iceGatheringState === 'complete') {
        peer.removeEventListener('icegatheringstatechange', checkState);
        if (timer) clearTimeout(timer);
        resolve();
      }
    };
    peer.addEventListener('icegatheringstatechange', checkState);
    timer = setTimeout(() => {
      peer.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, timeoutMs);
  });
}

class VoiceBroadcastManager {
  constructor() {
    this.audioContext = null;
    this.mixerDestination = null;
    this.micStream = null;
    this.micSourceNode = null;
    this.micGainNode = null;
    this.pcStream = null;
    this.pcSourceNode = null;
    this.pcGainNode = null;
    this.musicAudioElem = null;
    this.musicSourceNode = null;
    this.musicGainNode = null;
    this.peers = new Map(); // studentSocketId -> RTCPeerConnection
    this.candidateQueues = new Map(); // studentSocketId -> candidate[]
    this.micAnalyser = null;
    this.micDataArray = null;
    this.micMeterLoop = null;
    this.currentMicLevel = 0;
    this.isMicActive = false;
    this.isPcAudioActive = false;
    this.isMusicActive = false;
    this.musicFileName = '';
  }

  startMicLevelMonitor() {
    this.stopMicLevelMonitor();
    if (!this.micStream) return;

    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(e => {});
      }

      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 128;
      this.micAnalyser.smoothingTimeConstant = 0.2;
      this.micDataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      source.connect(this.micAnalyser);

      const updateMeter = () => {
        if (!this.isMicActive || !this.micAnalyser) return;
        this.micAnalyser.getByteFrequencyData(this.micDataArray);

        let maxVal = 0;
        let sum = 0;
        for (let i = 0; i < this.micDataArray.length; i++) {
          sum += this.micDataArray[i];
          if (this.micDataArray[i] > maxVal) maxVal = this.micDataArray[i];
        }
        const avg = sum / this.micDataArray.length;
        const level = Math.min(100, Math.round((Math.max(avg * 1.5, maxVal * 0.8) / 180) * 100));
        this.currentMicLevel = level;

        const barElem = document.getElementById('host-mic-level-bar');
        const textElem = document.getElementById('host-mic-level-text');
        const miniBar = document.getElementById('host-mic-mini-bar');

        if (barElem) {
          barElem.style.width = level + '%';
          if (level > 70) {
            barElem.className = 'h-full transition-all duration-75 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50';
          } else if (level > 15) {
            barElem.className = 'h-full transition-all duration-75 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50';
          } else {
            barElem.className = 'h-full transition-all duration-75 rounded-full bg-slate-600';
          }
        }
        if (textElem) {
          textElem.textContent = level > 3 ? `%${level}` : 'Sessiz';
        }
        if (miniBar) {
          miniBar.style.width = level + '%';
        }

        this.micMeterLoop = requestAnimationFrame(updateMeter);
      };

      this.micMeterLoop = requestAnimationFrame(updateMeter);
    } catch (err) {
      console.warn('Mic meter başlatılamadı:', err);
    }
  }

  stopMicLevelMonitor() {
    if (this.micMeterLoop) {
      cancelAnimationFrame(this.micMeterLoop);
      this.micMeterLoop = null;
    }
    this.micAnalyser = null;
    this.currentMicLevel = 0;
  }

  async initMixer() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn('AudioContext resume uyarısı:', e);
      }
    }
    if (!this.mixerDestination) {
      this.mixerDestination = this.audioContext.createMediaStreamDestination();
    }
  }

  getMixedAudioTrack() {
    if (!this.mixerDestination) return null;
    const tracks = this.mixerDestination.stream.getAudioTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  getBroadcastTrack() {
    // Mobil ve masaüstü tarayıcılarda mikrofon açıkken sesin doğrudan ve sıfır kayıpla gitmesi için
    if (this.isMicActive && this.micStream) {
      const micTracks = this.micStream.getAudioTracks();
      if (micTracks.length > 0 && micTracks[0].readyState === 'live') {
        return micTracks[0];
      }
    }
    if (this.isPcAudioActive && this.pcStream) {
      const pcTracks = this.pcStream.getAudioTracks();
      if (pcTracks.length > 0 && pcTracks[0].readyState === 'live') {
        return pcTracks[0];
      }
    }
    return this.getMixedAudioTrack();
  }

  broadcastOfferToAllStudents() {
    if (state.hostGame && Array.isArray(state.hostGame.players)) {
      state.hostGame.players.forEach(p => {
        const id = typeof p === 'object' ? (p.socketId || p.id || p.nickname) : p;
        if (id) {
          this.createOfferForStudent(id);
        }
      });
    }
  }

  // 1. Mikrofonu Aç / Kapat
  async toggleMicrophone() {
    await this.initMixer();
    if (this.isMicActive) {
      this.stopMicLevelMonitor();
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      if (this.micSourceNode) {
        this.micSourceNode.disconnect();
        this.micSourceNode = null;
      }
      this.isMicActive = false;
      this.updatePeersTracks();
      this.broadcastStatus();
      return false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        stream.getAudioTracks().forEach(t => { t.enabled = true; });
        this.micStream = stream;
        this.micSourceNode = this.audioContext.createMediaStreamSource(stream);
        this.micGainNode = this.audioContext.createGain();
        this.micGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        this.micSourceNode.connect(this.micGainNode);
        this.micGainNode.connect(this.mixerDestination);

        this.isMicActive = true;
        this.startMicLevelMonitor();
        this.updatePeersTracks();
        this.broadcastStatus();
        this.broadcastOfferToAllStudents();
        return true;
      } catch (err) {
        console.error('Mikrofon başlatma hatası:', err);
        showToast('Mikrofona erişilemedi veya izin reddedildi.', 'error');
        this.isMicActive = false;
        this.stopMicLevelMonitor();
        return false;
      }
    }
  }

  // 2. PC / Sekme / Sistem Sesini Paylaş
  async togglePcAudio() {
    await this.initMixer();
    if (this.isPcAudioActive) {
      if (this.pcStream) {
        this.pcStream.getTracks().forEach(t => t.stop());
        this.pcStream = null;
      }
      if (this.pcSourceNode) {
        this.pcSourceNode.disconnect();
        this.pcSourceNode = null;
      }
      this.isPcAudioActive = false;
      this.updatePeersTracks();
      this.broadcastStatus();
      return false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        const audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
          stream.getTracks().forEach(t => t.stop());
          showToast('Sistem sesi paylaşılmadı. Lütfen açılan pencerede "Sesi de paylaş" kutucuğunu işaretleyin.', 'warning');
          return false;
        }

        audioTracks[0].onended = () => {
          this.isPcAudioActive = false;
          if (this.pcSourceNode) {
            this.pcSourceNode.disconnect();
            this.pcSourceNode = null;
          }
          this.updatePeersTracks();
          this.broadcastStatus();
          render();
        };

        this.pcStream = stream;
        this.pcSourceNode = this.audioContext.createMediaStreamSource(new MediaStream(audioTracks));
        this.pcGainNode = this.audioContext.createGain();
        this.pcGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        this.pcSourceNode.connect(this.pcGainNode);
        this.pcGainNode.connect(this.mixerDestination);

        this.isPcAudioActive = true;
        this.updatePeersTracks();
        this.broadcastStatus();
        this.broadcastOfferToAllStudents();
        return true;
      } catch (err) {
        console.error('PC sesi paylaşma hatası:', err);
        showToast('Ekran/Ses paylaşımı iptal edildi.', 'info');
        this.isPcAudioActive = false;
        return false;
      }
    }
  }

  // 3. Yerel Ses/Müzik Dosyası Çalma (MP3, WAV, vb.)
  async playMusicFile(file) {
    await this.initMixer();
    this.stopMusic();

    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.loop = true;
      this.musicAudioElem = audio;
      this.musicFileName = file.name;

      this.musicSourceNode = this.audioContext.createMediaElementSource(audio);
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime);
      this.musicSourceNode.connect(this.musicGainNode);
      this.musicGainNode.connect(this.mixerDestination);
      this.musicGainNode.connect(this.audioContext.destination);

      await audio.play();
      this.isMusicActive = true;
      this.updatePeersTracks();
      this.broadcastStatus();
      this.broadcastOfferToAllStudents();
      return true;
    } catch (err) {
      console.error('Müzik dosyası çalma hatası:', err);
      showToast('Ses dosyası oynatılamadı.', 'error');
      return false;
    }
  }

  stopMusic() {
    if (this.musicAudioElem) {
      this.musicAudioElem.pause();
      this.musicAudioElem.src = '';
      this.musicAudioElem = null;
    }
    if (this.musicSourceNode) {
      this.musicSourceNode.disconnect();
      this.musicSourceNode = null;
    }
    this.isMusicActive = false;
    this.musicFileName = '';
    this.updatePeersTracks();
    this.broadcastStatus();
  }

  isAnyAudioActive() {
    return this.isMicActive || this.isPcAudioActive || this.isMusicActive;
  }

  broadcastStatus() {
    if (!socket || !state.hostGame.pin) return;
    const isBroadcasting = this.isAnyAudioActive();
    socket.emit('voice:status', {
      pin: state.hostGame.pin,
      isBroadcasting,
      hasMic: this.isMicActive,
      hasPcAudio: this.isPcAudioActive,
      hasMusic: this.isMusicActive
    });
  }

  updatePeersTracks() {
    const track = this.getBroadcastTrack();
    if (!track) return;
    track.enabled = true;
    for (const [studentId, peer] of this.peers.entries()) {
      try {
        const senders = peer.getSenders();
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(track);
        } else {
          const streamToSend = this.micStream || (this.mixerDestination ? this.mixerDestination.stream : new MediaStream([track]));
          peer.addTrack(track, streamToSend);
        }
      } catch (e) {
        console.warn('Track güncelleme uyarısı:', e);
      }
    }
  }

  async createOfferForStudent(studentSocketId) {
    await this.initMixer();
    try {
      const existing = this.peers.get(studentSocketId);
      if (existing && (existing.iceConnectionState === 'connected' || existing.iceConnectionState === 'completed')) {
        console.log(`[Host WebRTC - ${studentSocketId}] Zaten bağlı, tekrar offer oluşturulmadı.`);
        return;
      }

      if (this.peers.has(studentSocketId)) {
        try { this.peers.get(studentSocketId).close(); } catch(e) {}
        this.peers.delete(studentSocketId);
      }

      const peer = new RTCPeerConnection(RTC_CONFIG);
      this.peers.set(studentSocketId, peer);

      const track = this.getBroadcastTrack();
      if (track) {
        track.enabled = true;
        const streamToSend = this.micStream || (this.mixerDestination ? this.mixerDestination.stream : new MediaStream([track]));
        const sender = peer.addTrack(track, streamToSend);
        try {
          const tr = peer.getTransceivers().find(t => t.sender === sender);
          if (tr) tr.direction = 'sendonly';
        } catch(e) {}
      }

      peer.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('voice:candidate', { to: studentSocketId, candidate: event.candidate });
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log(`[Host WebRTC - ${studentSocketId}] ICE State: ${peer.iceConnectionState}`);
      };

      const offer = await peer.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await peer.setLocalDescription(offer);

      // Vanilla ICE: Adayların SDP'ye toplanması için max 1200ms bekle (TURN için yeterli süre)
      await waitForIceGathering(peer, 1200);

      if (socket) {
        const finalSdp = peer.localDescription || offer;
        socket.emit('voice:offer', { to: studentSocketId, sdp: finalSdp });
      }
    } catch (err) {
      console.error('Student offer oluşturma hatası:', err);
    }
  }

  async handleAnswer(studentSocketId, sdp) {
    const peer = this.peers.get(studentSocketId);
    if (peer) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log(`[Host WebRTC - ${studentSocketId}] Answer uygulandı.`);

        // Bekleyen adayları ilet
        if (this.candidateQueues.has(studentSocketId)) {
          const queue = this.candidateQueues.get(studentSocketId);
          for (const cand of queue) {
            try { await peer.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
          this.candidateQueues.delete(studentSocketId);
        }
      } catch (err) {
        console.error('Answer kaydetme hatası:', err);
      }
    }
  }

  async handleCandidate(studentSocketId, candidate) {
    const peer = this.peers.get(studentSocketId);
    if (!peer || !candidate) return;

    if (peer.remoteDescription && peer.remoteDescription.type) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Candidate ekleme hatası:', err);
      }
    } else {
      if (!this.candidateQueues.has(studentSocketId)) {
        this.candidateQueues.set(studentSocketId, []);
      }
      this.candidateQueues.get(studentSocketId).push(candidate);
    }
  }

  removeStudent(studentSocketId) {
    const peer = this.peers.get(studentSocketId);
    if (peer) {
      try { peer.close(); } catch(e) {}
      this.peers.delete(studentSocketId);
    }
  }

  stopAll() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.pcStream) {
      this.pcStream.getTracks().forEach(t => t.stop());
      this.pcStream = null;
    }
    this.stopMusic();
    for (const [id, peer] of this.peers.entries()) {
      try { peer.close(); } catch (e) {}
    }
    this.peers.clear();
    this.candidateQueues.clear();
    this.isMicActive = false;
    this.isPcAudioActive = false;
    this.broadcastStatus();
  }
}

class VoiceReceiverManager {
  constructor() {
    this.peer = null;
    this.audioElem = null;
    this.audioCtx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.analyserData = null;
    this.meterAnimLoop = null;
    this.candidateQueue = [];
    this.isMuted = false;
    this.volume = 1.0;
    this.hostSocketId = null;
    this.currentRemoteStream = null;
    this.initAudioContext();
    this.initAudioElement();
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && !this.gainNode) {
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
  }

  initAudioElement() {
    if (!this.audioElem) {
      let elem = document.getElementById('student-voice-player');
      if (!elem) {
        elem = document.createElement('audio');
        elem.id = 'student-voice-player';
        elem.autoplay = true;
        elem.playsInline = true;
        elem.setAttribute('playsinline', '');
        elem.setAttribute('webkit-playsinline', '');
        elem.style.position = 'fixed';
        elem.style.bottom = '0px';
        elem.style.right = '0px';
        elem.style.width = '2px';
        elem.style.height = '2px';
        elem.style.opacity = '0.01';
        elem.style.pointerEvents = 'none';
        elem.style.zIndex = '-1';
        document.body.appendChild(elem);
      }
      this.audioElem = elem;
    }
  }

  async unlockAudio() {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
        console.log('[VoiceReceiver] AudioContext kilidi açıldı.');
      } catch (e) {
        console.warn('[VoiceReceiver] AudioContext resume hatası:', e);
      }
    }

    this.initAudioElement();
    if (this.audioElem) {
      try {
        this.audioElem.muted = false;
        await this.audioElem.play();
        console.log('[VoiceReceiver] AudioElement oynatma kilidi açıldı.');
      } catch (e) {
        console.warn('[VoiceReceiver] Ses kilidi açma denemesi:', e);
      }
    }

    if (state.student && state.student.voice) {
      state.student.voice.needClick = false;
      state.student.voice.isPlaying = true;
      render();
    }
  }

  async handleOffer(hostSocketId, sdp) {
    this.initAudioContext();
    this.initAudioElement();
    this.hostSocketId = hostSocketId;

    if (this.peer) {
      try { this.peer.close(); } catch (e) {}
    }

    this.peer = new RTCPeerConnection(RTC_CONFIG);

    this.peer.ontrack = (event) => {
      console.log('[VoiceReceiver] WebRTC audio ontrack tetiklendi:', event);
      const remoteStream = (event.streams && event.streams[0]) 
        ? event.streams[0] 
        : new MediaStream([event.track]);

      this.currentRemoteStream = remoteStream;
      this.attachAndPlayStream(remoteStream);
      this.startIncomingLevelMonitor(remoteStream);
    };

    this.peer.onicecandidate = (event) => {
      if (event.candidate && socket && this.hostSocketId) {
        socket.emit('voice:candidate', { to: this.hostSocketId, candidate: event.candidate });
      }
    };

    this.peer.oniceconnectionstatechange = () => {
      const iceState = this.peer.iceConnectionState;
      console.log(`[Student WebRTC] ICE State: ${iceState}`);
      if (state.student && state.student.voice) {
        state.student.voice.iceState = iceState;
        if (iceState === 'connected' || iceState === 'completed') {
          state.student.voice.connected = true;
        } else if (iceState === 'failed' || iceState === 'disconnected') {
          state.student.voice.connected = false;
        }
        render();
      }
    };

    // 1. Remote Description'ı uygula (Gelen ses hattı otomatik eşleşir)
    await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));

    // 2. Bekleyen adayları uygula
    if (this.candidateQueue && this.candidateQueue.length > 0) {
      for (const cand of this.candidateQueue) {
        try { await this.peer.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
      }
      this.candidateQueue = [];
    }

    // 3. Standart Unified-Plan cevabı üret
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);

    // 4. Vanilla ICE: Adayların toplanması için bekle (TURN için yeterli süre)
    await waitForIceGathering(this.peer, 1200);

    if (socket && this.hostSocketId) {
      const finalSdp = this.peer.localDescription || answer;
      socket.emit('voice:answer', { to: this.hostSocketId, sdp: finalSdp });
    }
  }

  attachAndPlayStream(stream) {
    this.initAudioContext();
    this.initAudioElement();

    // 1. Web Audio API Kanalı (Doğrudan hoparlöre sıfır engelleme ile basar)
    if (this.audioCtx) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(e => {});
        }
        if (this.sourceNode) {
          try { this.sourceNode.disconnect(); } catch (e) {}
        }
        this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
        this.sourceNode.connect(this.gainNode);
        console.log('[VoiceReceiver] Web Audio API hoparlör çıkışına bağlandı.');
      } catch (err) {
        console.warn('[VoiceReceiver] Web Audio source bağlama uyarısı:', err);
      }
    }

    // 2. HTML5 Audio Element Kanalı (Yedek ses kanalı)
    if (this.audioElem) {
      this.audioElem.srcObject = stream;
      this.audioElem.muted = this.isMuted;
      this.audioElem.volume = this.volume;

      const p = this.audioElem.play();
      if (p !== undefined) {
        p.then(() => {
          console.log('[VoiceReceiver] AudioElement oynatılıyor.');
          if (state.student && state.student.voice) {
            state.student.voice.needClick = false;
            state.student.voice.isPlaying = true;
            state.student.voice.connected = true;
            render();
          }
        }).catch(err => {
          console.warn('[VoiceReceiver] Otomatik oynatma kısıtlandı:', err);
          if (state.student && state.student.voice) {
            state.student.voice.needClick = true;
            render();
          }
        });
      }
    }
  }

  startIncomingLevelMonitor(stream) {
    this.stopIncomingLevelMonitor();
    if (!stream) return;

    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(e => {});
      }

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.2;
      this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount);

      if (this.sourceNode) {
        this.sourceNode.connect(this.analyserNode);
      } else {
        const s = this.audioCtx.createMediaStreamSource(stream);
        s.connect(this.analyserNode);
      }

      const updateMeter = () => {
        if (!this.analyserNode || !this.analyserData) return;
        this.analyserNode.getByteFrequencyData(this.analyserData);

        let maxVal = 0;
        let sum = 0;
        for (let i = 0; i < this.analyserData.length; i++) {
          sum += this.analyserData[i];
          if (this.analyserData[i] > maxVal) maxVal = this.analyserData[i];
        }
        const avg = sum / this.analyserData.length;
        const level = Math.min(100, Math.round((Math.max(avg * 1.5, maxVal * 0.8) / 180) * 100));

        const barElem = document.getElementById('student-voice-incoming-bar');
        const textElem = document.getElementById('student-voice-incoming-text');

        if (barElem) {
          barElem.style.width = level + '%';
          if (level > 60) {
            barElem.className = 'h-full transition-all duration-75 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50';
          } else if (level > 10) {
            barElem.className = 'h-full transition-all duration-75 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50';
          } else {
            barElem.className = 'h-full transition-all duration-75 rounded-full bg-slate-600';
          }
        }
        if (textElem) {
          textElem.textContent = level > 3 ? `%${level}` : '%0';
        }

        this.meterAnimLoop = requestAnimationFrame(updateMeter);
      };

      this.meterAnimLoop = requestAnimationFrame(updateMeter);
    } catch (err) {
      console.warn('[VoiceReceiver] Ses seviye monitörü başlatılamadı:', err);
    }
  }

  stopIncomingLevelMonitor() {
    if (this.meterAnimLoop) {
      cancelAnimationFrame(this.meterAnimLoop);
      this.meterAnimLoop = null;
    }
    this.analyserNode = null;
    this.analyserData = null;
  }

  async handleCandidate(candidate) {
    if (!candidate) return;
    if (this.peer && this.peer.remoteDescription && this.peer.remoteDescription.type) {
      try {
        await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Student candidate hatası:', err);
      }
    } else {
      this.candidateQueue.push(candidate);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    if (this.audioElem) {
      this.audioElem.muted = this.isMuted;
    }
    return this.isMuted;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    if (this.audioElem) {
      this.audioElem.volume = this.volume;
    }
  }

  disconnect() {
    this.stopIncomingLevelMonitor();
    if (this.peer) {
      try { this.peer.close(); } catch (e) {}
      this.peer = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
    if (this.audioElem) {
      this.audioElem.srcObject = null;
    }
    this.currentRemoteStream = null;
    this.candidateQueue = [];
    if (state.student && state.student.voice) {
      state.student.voice.connected = false;
      state.student.voice.isPlaying = false;
    }
  }
}

const voiceBroadcast = new VoiceBroadcastManager();
const voiceReceiver = new VoiceReceiverManager();

// ----------------------------------------------------
// 2. MERKEZİ UYGULAMA DURUMU (APPLICATION STATE)
// ----------------------------------------------------
const state = {
  view: 'HOME',
  token: localStorage.getItem('quizlem_token') || null,
  user: JSON.parse(localStorage.getItem('quizlem_user') || 'null'),
  
  quizzes: [],
  editingQuiz: null,
  
  // Panel Arama & Kategori Filtresi
  searchQuery: '',
  selectedCategory: 'Tümü',

  // Raporlama Durumu
  reports: [],
  selectedReport: null,
  activeDashboardTab: 'quizzes', // 'quizzes' | 'reports'
  searchReportQuery: '',
  reportDetailSubTab: 'ranking', // 'ranking' | 'questions' | 'matrix'

  hostGame: {
    pin: null,
    sessionId: null,
    quizTitle: '',
    totalQuestions: 0,
    players: [],
    currentQuestion: null,
    answersReceived: 0,
    summary: null,
    podium: null,
    podiumStep: 0,
    timer: { timeLeft: 0, totalTime: 20 },
    settings: {
      showQuestionsOnStudent: false, // Soruların ve görsellerin öğrenci telefonunda görünmesi
      showOptionsTextOnStudent: false, // Şık metinlerinin öğrenci butonlarında görünmesi
      shuffleQuestions: false, // Soruları karıştır
      shuffleOptions: false // Şıkları karıştır
    }
  },

  student: {
    pin: '',
    nickname: '',
    avatar: '🐱',
    quizTitle: '',
    currentQuestion: null,
    submittedAnswer: null,
    hasAnswered: false,
    lastResult: null,
    podium: null,
    timer: { timeLeft: 0, totalTime: 20 },
    selectedIndices: [],
    orderItems: [],
    voice: {
      isBroadcasting: false,
      hasMic: false,
      hasPcAudio: false,
      hasMusic: false,
      isMuted: false,
      volume: 1,
      needClick: false,
      isPlaying: false,
      connected: false,
      iceState: 'new'
    }
  }
};

// Kahoot 4 Renk Paleti
const KAHOOT_OPTIONS = [
  {
    index: 0,
    name: 'Kırmızı',
    color: 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 shadow-lg shadow-rose-500/20 active:scale-[0.98]',
    badgeBg: 'bg-white/20 text-white border border-white/20',
    shapeSymbol: '▲',
    shapeClass: 'shape-triangle',
    icon: 'fa-solid fa-play -rotate-90',
    barColor: 'from-rose-500 to-red-600'
  },
  {
    index: 1,
    name: 'Mavi',
    color: 'bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98]',
    badgeBg: 'bg-white/20 text-white border border-white/20',
    shapeSymbol: '◆',
    shapeClass: 'shape-diamond',
    icon: 'fa-solid fa-square rotate-45',
    barColor: 'from-blue-500 to-indigo-600'
  },
  {
    index: 2,
    name: 'Sarı',
    color: 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98]',
    badgeBg: 'bg-white/25 text-white border border-white/20',
    shapeSymbol: '●',
    shapeClass: 'shape-circle',
    icon: 'fa-solid fa-circle',
    barColor: 'from-amber-400 to-yellow-500'
  },
  {
    index: 3,
    name: 'Yeşil',
    color: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-lg shadow-emerald-500/20 active:scale-[0.98]',
    badgeBg: 'bg-white/20 text-white border border-white/20',
    shapeSymbol: '■',
    shapeClass: 'shape-square',
    icon: 'fa-solid fa-square',
    barColor: 'from-emerald-500 to-teal-600'
  }
];

const QUESTION_TYPE_LABELS = {
  multiple: { label: 'Çoktan Seçmeli', icon: 'fa-list-check', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  boolean: { label: 'Doğru / Yanlış', icon: 'fa-check-double', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  fill_blank: { label: 'Boşluk Doldurma', icon: 'fa-pen-clip', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  order: { label: 'Sıralama Sorusu', icon: 'fa-arrow-down-1-9', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  multiselect: { label: 'Çok Cevaplı', icon: 'fa-square-check', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  image_choice: { label: 'Görsel Seçmeli', icon: 'fa-image', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const AVATARS = ['🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐸', '🐙', '🦄', '🚀', '⚡'];

// ----------------------------------------------------
// 3. TOAST BİLDİRİM FONKSİYONU
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const styles = {
    info: 'bg-white text-slate-800 border-l-4 border-indigo-600 shadow-premium',
    success: 'bg-white text-slate-800 border-l-4 border-emerald-500 shadow-premium',
    error: 'bg-white text-slate-800 border-l-4 border-rose-500 shadow-premium',
    warning: 'bg-white text-slate-800 border-l-4 border-amber-500 shadow-premium'
  };

  const icons = {
    info: 'fa-info-circle text-indigo-600',
    success: 'fa-check-circle text-emerald-500',
    error: 'fa-exclamation-triangle text-rose-500',
    warning: 'fa-exclamation-circle text-amber-500'
  };

  toast.className = `${styles[type] || styles.info} px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-pop-in pointer-events-auto border border-slate-100 transition-all duration-300`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-lg"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ----------------------------------------------------
// 4. REST API İSTEK YARDIMCISI VE ALT KLASÖR DESTEĞİ
// ----------------------------------------------------
const BASE_PATH = (() => {
  const path = window.location.pathname;
  if (path.includes('/quizlem')) {
    return '/quizlem';
  }
  return '';
})();

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const url = (endpoint.startsWith('/') && BASE_PATH) ? `${BASE_PATH}${endpoint}` : endpoint;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const rawText = await res.text();
    let data;

    if (!rawText || !rawText.trim()) {
      if (!res.ok) {
        throw new Error(`Sunucu Hatası (${res.status}): Arka plan API boş yanıt döndü.`);
      }
      data = {};
    } else {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        if (!res.ok) {
          throw new Error(`Sunucu Hatası (${res.status}): ` + rawText.substring(0, 100));
        }
        throw new Error('Sunucudan geçersiz yanıt formatı alındı.');
      }
    }

    if (!res.ok) {
      throw new Error(data.error || 'İşlem sırasında bir hata oluştu.');
    }
    return data;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

async function handleImageFileUpload(file, onSuccess) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Lütfen geçerli bir görsel dosyası (PNG, JPG, WEBP) seçin.', 'warning');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showToast('Görsel boyutu 15MB\'tan küçük olmalıdır.', 'warning');
    return;
  }

  showToast('Görsel yükleniyor...', 'info');
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result;
    try {
      const res = await apiRequest('/api/upload', 'POST', { image: base64Data, name: file.name });
      if (res && res.url) {
        showToast('Görsel başarıyla yüklendi! 🖼️', 'success');
        if (typeof onSuccess === 'function') onSuccess(res.url);
      } else {
        showToast(res?.error || 'Görsel yüklenemedi.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Yükleme sırasında hata oluştu.', 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function loadReports() {
  if (!state.token) return;
  try {
    const data = await apiRequest('/api/reports');
    state.reports = data.reports || [];
    render();
  } catch (err) {
    console.error('Raporlar yüklenemedi:', err);
  }
}

async function viewReportDetail(reportId) {
  if (!state.token) return;
  try {
    const data = await apiRequest(`/api/reports/${reportId}`);
    state.selectedReport = data;
    state.reportDetailSubTab = 'ranking';
    state.view = 'REPORT_DETAIL';
    render();
  } catch (err) {
    showToast('Rapor detayları yüklenemedi.', 'error');
  }
}

async function deleteReport(reportId) {
  if (!confirm('Bu yarışma raporunu silmek istediğinize emin misiniz?')) return;
  try {
    await apiRequest(`/api/reports/${reportId}`, 'DELETE');
    showToast('Rapor başarıyla silindi.', 'success');
    loadReports();
  } catch (err) {
    showToast('Rapor silinemedi.', 'error');
  }
}

function downloadReportExcel(reportId) {
  if (!state.token) return;
  showToast('Excel (.xlsx) raporu hazırlanıyor...', 'info');
  fetch(`${BASE_PATH}/api/reports/${reportId}/excel`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error('Excel raporu indirilemedi.');
    return res.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuizLem_Rapor_${reportId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('Excel raporu başarıyla indirildi!', 'success');
  })
  .catch(err => {
    showToast(err.message, 'error');
  });
}

// ----------------------------------------------------
// 5. CANLI İLETİŞİM MOTORU (SOCKET.IO VEYA PHP KÖPRÜSÜ)
// ----------------------------------------------------
const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const rawSocket = (isLocalhost && typeof io === 'function') ? io({
  path: BASE_PATH ? `${BASE_PATH}/socket.io` : '/socket.io',
  reconnectionAttempts: 1,
  timeout: 1500
}) : { connected: false };

const eventListeners = {};

const liveBridge = {
  active: false,
  pollTimer: null,
  role: null,
  pin: null,
  lastState: null,
  lastQuestionIndex: -1,
  lastSummaryShown: false,
  lastPodiumShown: false,

  async hostCreateGame(quizId) {
    showToast('Canlı yarışma lobisi oluşturuluyor...', 'info');
    try {
      const data = await apiRequest('/api/game/create', 'POST', { quizId });
      this.active = true;
      this.role = 'host';
      this.pin = data.pin;
      this.lastState = 'lobby';
      this.lastQuestionIndex = -1;
      this.lastSummaryShown = false;
      this.lastPodiumShown = false;

      socket.trigger('host:game_created', data);
      this.startPolling();
    } catch (err) {
      showToast('Oda açılamadı: ' + err.message, 'error');
    }
  },

  async playerJoin(pin, nickname, avatar) {
    try {
      const data = await apiRequest('/api/game/join', 'POST', { pin, nickname, avatar });
      this.active = true;
      this.role = 'player';
      this.pin = pin;
      this.lastState = 'lobby';
      this.lastQuestionIndex = -1;
      this.lastSummaryShown = false;
      this.lastPodiumShown = false;

      socket.trigger('player:join_success', data);
      this.startPolling();
    } catch (err) {
      socket.trigger('player:join_error', { message: err.message || 'Odaya bağlanılamadı.' });
    }
  },

  async sendAction(action, extraData = {}) {
    try {
      return await apiRequest('/api/game/action', 'POST', {
        pin: this.pin || state.hostGame.pin || state.student.pin,
        action,
        ...extraData
      });
    } catch (err) {
      console.warn('Action error:', err);
    }
  },

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.poll(), 900);
    this.poll();
  },

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.active = false;
  },

  async poll() {
    const pin = this.pin || state.hostGame.pin || state.student.pin;
    if (!pin) return;
    try {
      const nick = state.student.nickname || '';
      const role = this.role || (state.view.startsWith('HOST') ? 'host' : 'player');
      const url = `/api/game/status?pin=${pin}&role=${role}` + (nick ? `&nickname=${encodeURIComponent(nick)}` : '');
      const res = await apiRequest(url, 'GET');
      if (!res || !res.state) return;

      // 1. Oyuncu Listesi
      if (role === 'host') {
        socket.trigger('room:player_list', {
          count: res.players ? res.players.length : 0,
          players: res.players || []
        });
        socket.trigger('host:answer_count_update', {
          answersReceived: res.answersReceived || 0,
          totalPlayers: res.players ? res.players.length : 0
        });
      }

      // 2. Soru Başlama
      if (res.state === 'question' && res.currentQuestion) {
        if (this.lastQuestionIndex !== res.currentQuestionIndex) {
          this.lastQuestionIndex = res.currentQuestionIndex;
          this.lastSummaryShown = false;

          if (role === 'host') {
            socket.trigger('host:question_start', res.currentQuestion);
          } else {
            socket.trigger('player:question_start', res.currentQuestion);
          }
        }

        socket.trigger('game:timer_tick', {
          timeLeft: res.currentQuestion.timeLeft,
          totalTime: res.currentQuestion.timeLimit
        });
      }

      // 3. Cevap Özeti
      if (res.state === 'summary') {
        if (!this.lastSummaryShown) {
          this.lastSummaryShown = true;
          if (role === 'host') {
            socket.trigger('host:question_summary', res.summary);
          } else {
            if (res.lastResult) {
              socket.trigger('player:question_result', res.lastResult);
            }
          }
        }
      }

      // 4. Podyum
      if (res.state === 'podium' && res.podium) {
        if (!this.lastPodiumShown) {
          this.lastPodiumShown = true;
          socket.trigger('game:final_results', {
            quizTitle: res.quizTitle,
            sessionId: res.sessionId,
            podium: res.podium
          });
          this.stopPolling();
        }
      }

      this.lastState = res.state;
    } catch (err) {
      console.warn('Poll error:', err);
    }

    // WebRTC Ses Yayını Sinyallerini Kontrol Et
    await this.pollSignals();
  },

  lastSignalId: 0,

  async sendSignal(type, payload, to = 'all') {
    const pin = this.pin || state.hostGame.pin || state.student.pin;
    const from = (this.role === 'host' || state.view.startsWith('HOST')) ? 'host' : (state.student.nickname || 'student');
    if (!pin) return;
    try {
      await apiRequest('/api/game/signal', 'POST', { pin, from, to, type, payload });
    } catch (err) {
      console.warn('Signal send error:', err);
    }
  },

  async pollSignals() {
    const pin = this.pin || state.hostGame.pin || state.student.pin;
    if (!pin) return;
    const myId = (this.role === 'host' || state.view.startsWith('HOST')) ? 'host' : (state.student.nickname || 'student');
    try {
      const res = await apiRequest(`/api/game/signals?pin=${pin}&to=${encodeURIComponent(myId)}&last_id=${this.lastSignalId}`, 'GET');
      if (!res || !Array.isArray(res.signals)) return;
      for (const sig of res.signals) {
        if (sig.id > this.lastSignalId) this.lastSignalId = sig.id;
        if (sig.from === myId) continue;
        
        if (sig.type === 'status') {
          socket.trigger('voice:status', sig.payload);
        } else if (sig.type === 'student_joined') {
          socket.trigger('voice:student_joined', { studentSocketId: sig.from });
        } else if (sig.type === 'offer') {
          socket.trigger('voice:offer', { sdp: sig.payload.sdp, from: sig.from });
        } else if (sig.type === 'answer') {
          socket.trigger('voice:answer', { sdp: sig.payload.sdp, from: sig.from });
        } else if (sig.type === 'candidate') {
          socket.trigger('voice:candidate', { candidate: sig.payload.candidate, from: sig.from });
        }
      }
    } catch (err) {
      console.warn('Signal poll error:', err);
    }
  }
};

const socket = {
  get connected() {
    return (rawSocket && rawSocket.connected) || liveBridge.active;
  },
  on(event, callback) {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(callback);
    if (rawSocket && rawSocket.on) rawSocket.on(event, callback);
  },
  trigger(event, data) {
    if (eventListeners[event]) {
      eventListeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error('Event cb error:', e); }
      });
    }
  },
  emit(event, data = {}) {
    if (rawSocket && rawSocket.connected) {
      rawSocket.emit(event, data);
      return;
    }

    if (event === 'host:create_game') {
      liveBridge.hostCreateGame(data.quizId);
    } else if (event === 'player:join') {
      liveBridge.playerJoin(data.pin, data.nickname, data.avatar);
    } else if (event === 'host:start_game') {
      liveBridge.sendAction('start');
    } else if (event === 'host:next_question') {
      liveBridge.sendAction('next_question');
    } else if (event === 'host:update_settings') {
      liveBridge.sendAction('update_settings', { settings: data.settings });
    } else if (event === 'player:submit_answer') {
      liveBridge.sendAction('submit_answer', {
        nickname: state.student.nickname,
        answer: data.answer
      });
      socket.trigger('player:answer_recorded', { answer: data.answer });
    } else if (event === 'voice:status') {
      liveBridge.sendSignal('status', data, 'all');
    } else if (event === 'voice:join_listen') {
      liveBridge.sendSignal('student_joined', {}, 'host');
    } else if (event === 'voice:offer') {
      liveBridge.sendSignal('offer', { sdp: data.sdp }, data.to);
    } else if (event === 'voice:answer') {
      liveBridge.sendSignal('answer', { sdp: data.sdp }, data.to || 'host');
    } else if (event === 'voice:candidate') {
      liveBridge.sendSignal('candidate', { candidate: data.candidate }, data.to);
    }
  }
};

socket.on('disconnect', () => {
  console.warn('Socket koptu');
});

socket.on('error_message', ({ message }) => {
  showToast(message, 'error');
});

socket.on('player:join_error', ({ message }) => {
  showToast(message, 'error');
  const btn = document.getElementById('btn-student-join');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<span>Giriş Yap</span><i class="fa-solid fa-arrow-right"></i>`;
  }
});

socket.on('player:join_success', ({ pin, nickname, avatar, quizTitle }) => {
  state.student.pin = pin;
  state.student.nickname = nickname;
  state.student.avatar = avatar;
  state.student.quizTitle = quizTitle;
  state.view = 'STUDENT_LOBBY';
  sound.playJoin();
  render();

  // Odaya girer girmez ses yayınını dinlemeye hazır olduğunu bildir
  socket.emit('voice:join_listen', { pin });
});

socket.on('host:game_created', ({ pin, sessionId, quizTitle, totalQuestions, settings }) => {
  state.hostGame.pin = pin;
  state.hostGame.sessionId = sessionId || null;
  state.hostGame.quizTitle = quizTitle;
  state.hostGame.totalQuestions = totalQuestions;
  state.hostGame.players = [];
  if (settings) state.hostGame.settings = settings;
  state.view = 'HOST_LOBBY';
  render();
});

socket.on('host:settings_updated', ({ settings }) => {
  state.hostGame.settings = settings;
});

socket.on('game:settings_changed', ({ settings }) => {
  if (state.hostGame.pin) state.hostGame.settings = settings;
});

// Canlı Ses Yayını Durumu (Host -> Odaya Duyuru)
socket.on('voice:status', (data) => {
  if (state.student && state.student.pin) {
    state.student.voice = {
      ...state.student.voice,
      isBroadcasting: data.isBroadcasting,
      hasMic: data.hasMic,
      hasPcAudio: data.hasPcAudio,
      hasMusic: data.hasMusic
    };
    if (data.isBroadcasting) {
      socket.emit('voice:join_listen', { pin: state.student.pin });
    } else {
      voiceReceiver.disconnect();
    }
    if (state.view.startsWith('STUDENT_')) {
      render();
    }
  }
});

// Host: Öğrenci dinleyici olarak bağlandı
socket.on('voice:student_joined', ({ studentSocketId }) => {
  if (state.hostGame && state.hostGame.pin && voiceBroadcast.isAnyAudioActive()) {
    voiceBroadcast.createOfferForStudent(studentSocketId);
  }
});

// Öğrenci: Host'tan WebRTC Offer geldi
socket.on('voice:offer', async ({ sdp, from }) => {
  if (state.student && state.student.pin) {
    await voiceReceiver.handleOffer(from, sdp);
  }
});

// Host: Öğrenciden WebRTC Answer geldi
socket.on('voice:answer', async ({ sdp, from }) => {
  if (state.hostGame && state.hostGame.pin) {
    await voiceBroadcast.handleAnswer(from, sdp);
  }
});

// Host & Öğrenci: WebRTC ICE Candidate
socket.on('voice:candidate', ({ candidate, from }) => {
  if (state.hostGame && state.hostGame.pin) {
    voiceBroadcast.handleCandidate(from, candidate);
  } else if (state.student && state.student.pin) {
    voiceReceiver.handleCandidate(candidate);
  }
});

socket.on('room:player_list', ({ count, players }) => {
  state.hostGame.players = players;
  if (voiceBroadcast.isAnyAudioActive() && Array.isArray(players)) {
    players.forEach(p => {
      const id = typeof p === 'object' ? (p.socketId || p.id || p.nickname) : p;
      if (id && !voiceBroadcast.peers.has(id)) {
        voiceBroadcast.createOfferForStudent(id);
      }
    });
  }
  if (state.view === 'HOST_LOBBY') {
    sound.playJoin();
    render();
  }
});

socket.on('host:question_start', (data) => {
  state.hostGame.currentQuestion = data;
  state.hostGame.answersReceived = 0;
  state.hostGame.timer.timeLeft = data.timeLimit;
  state.hostGame.timer.totalTime = data.timeLimit;
  state.view = 'HOST_QUESTION';
  render();
});

socket.on('player:question_start', (data) => {
  state.student.currentQuestion = data;
  state.student.submittedAnswer = null;
  state.student.hasAnswered = false;
  state.student.timer.timeLeft = data.timeLimit;
  state.student.timer.totalTime = data.timeLimit;
  state.student.selectedIndices = [];
  state.student.orderItems = data.shuffledItems ? [...data.shuffledItems] : [];
  state.view = 'STUDENT_ANSWER';
  render();
});

socket.on('game:timer_tick', ({ timeLeft, totalTime }) => {
  state.hostGame.timer.timeLeft = timeLeft;
  state.student.timer.timeLeft = timeLeft;

  if (timeLeft <= 5 && timeLeft > 0) {
    sound.playTick();
  }

  const hostTimerEl = document.getElementById('host-timer-display');
  if (hostTimerEl) hostTimerEl.innerText = timeLeft;

  const studentTimerEl = document.getElementById('student-timer-display');
  if (studentTimerEl) studentTimerEl.innerText = timeLeft;

  const timerBarEl = document.getElementById('timer-progress-bar');
  if (timerBarEl) {
    const pct = Math.max(0, (timeLeft / totalTime) * 100);
    timerBarEl.style.width = `${pct}%`;
    if (timeLeft <= 5) {
      timerBarEl.className = 'h-full transition-all duration-1000 ease-linear bg-rose-500 shadow-glow-rose';
    }
  }
});

socket.on('host:answer_count_update', ({ answersReceived, totalPlayers }) => {
  state.hostGame.answersReceived = answersReceived;
  const countEl = document.getElementById('host-answer-count');
  if (countEl) countEl.innerText = answersReceived;
});

socket.on('player:answer_recorded', ({ answer }) => {
  state.student.hasAnswered = true;
  state.student.submittedAnswer = answer;
  render();
});

socket.on('host:question_summary', (summaryData) => {
  state.hostGame.summary = summaryData;
  state.view = 'HOST_SUMMARY';
  render();
});

socket.on('player:question_result', (resultData) => {
  state.student.lastResult = resultData;
  state.view = 'STUDENT_FEEDBACK';
  if (resultData.isCorrect) {
    sound.playCorrect();
  } else {
    sound.playWrong();
  }
  render();
});

socket.on('game:final_results', ({ quizTitle, sessionId, podium }) => {
  state.hostGame.podium = podium;
  if (sessionId) state.hostGame.sessionId = sessionId;
  state.student.podium = podium;

  if (state.view.startsWith('HOST')) {
    state.view = 'HOST_PODIUM';
    state.hostGame.podiumStep = 0;
    render();
    startHostPodiumChoreography();
  } else {
    state.view = 'STUDENT_PODIUM';
    render();
    const myNick = state.student.nickname;
    const found = podium && podium.allPlayers && podium.allPlayers.find(p => p.nickname === myNick);
    if (found && found.rank <= 3) {
      sound.playFanfare();
      triggerConfetti();
    }
  }
});

socket.on('game:host_disconnected', ({ message }) => {
  showToast(message, 'warning');
  state.view = 'HOME';
  state.student.pin = '';
  render();
});

function triggerConfetti() {
  if (typeof confetti === 'function') {
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }
}

// ----------------------------------------------------
// 6. EKRAN RENDER EDİCİLERİ (VIEW RENDERERS)
// ----------------------------------------------------

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  switch (state.view) {
    case 'HOME':
      app.innerHTML = renderHomeView();
      break;
    case 'TEACHER_LOGIN':
      app.innerHTML = renderTeacherLoginView();
      break;
    case 'TEACHER_REGISTER':
      app.innerHTML = renderTeacherRegisterView();
      break;
    case 'TEACHER_DASHBOARD':
      app.innerHTML = renderTeacherDashboardView();
      break;
    case 'QUIZ_EDITOR':
      app.innerHTML = renderQuizEditorView();
      break;
    case 'HOST_LOBBY':
      app.innerHTML = renderHostLobbyView();
      break;
    case 'HOST_QUESTION':
      app.innerHTML = renderHostQuestionView();
      break;
    case 'HOST_SUMMARY':
      app.innerHTML = renderHostSummaryView();
      break;
    case 'HOST_PODIUM':
      app.innerHTML = renderHostPodiumView();
      break;
    case 'STUDENT_LOBBY':
      app.innerHTML = renderStudentLobbyView();
      break;
    case 'STUDENT_ANSWER':
      app.innerHTML = renderStudentAnswerView();
      break;
    case 'STUDENT_FEEDBACK':
      app.innerHTML = renderStudentFeedbackView();
      break;
    case 'STUDENT_PODIUM':
      app.innerHTML = renderStudentPodiumView();
      break;
    case 'REPORT_DETAIL':
      app.innerHTML = renderReportDetailView();
      break;
    default:
      app.innerHTML = renderHomeView();
  }

  attachViewListeners();
}

// ----------------------------------------------------
// A. ANA SAYFA: ZENGİN & DOLU DOLU HERO LAYOUT
// Artık ekranda devasa boşluk yok; sol sütunda vitrin, sağ sütunda katılım kartı yer alır!
// ----------------------------------------------------
function renderHomeView() {
  return `
    <div class="flex-1 flex flex-col justify-between w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 2xl:px-12">
      
      <!-- Üst Navigasyon Barı -->
      <nav class="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:px-6 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center font-brand font-black text-2xl shadow-md shadow-indigo-500/25">
            Q
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-brand font-black text-2xl tracking-tight text-slate-900 leading-none">QuizLem</span>
              <span class="bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">PRO 2.0</span>
            </div>
            <p class="text-xs text-slate-500 font-medium hidden sm:block">Gerçek Zamanlı Kahoot Tarzı Yarışma Platformu</p>
          </div>
        </div>

        <!-- Hızlı Rozetler (Geniş Ekran) -->
        <div class="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600">
          <span class="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
            <i class="fa-solid fa-bolt text-amber-500"></i> Hızlı Skorlama
          </span>
          <span class="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
            <i class="fa-solid fa-shapes text-indigo-500"></i> 6 Soru Tipi
          </span>
          <span class="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
            <i class="fa-solid fa-trophy text-emerald-500"></i> 3D Podyum
          </span>
        </div>

        <button id="btn-goto-teacher" class="bg-white hover:bg-slate-50 active:scale-95 text-xs sm:text-sm font-bold text-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-sm transition-all flex items-center gap-2 hover:border-indigo-300 hover:text-indigo-600">
          <i class="fa-solid fa-chalkboard-user text-indigo-500"></i>
          <span>Öğretmen Girişi</span>
        </button>
      </nav>

      <!-- Ana Hero Grid: Sol Sütun (Tanıtım & Vitrin) + Sağ Sütun (PIN Giriş Kartı) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 2xl:gap-14 my-auto py-4 items-center">
        
        <!-- Sol Sütun: Vitrin & Özellik Kartları (Büyük ekranları dolu gösterir) -->
        <div class="lg:col-span-7 xl:col-span-7 2xl:col-span-8 space-y-6">
          <div class="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <span class="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
            <span>Canlı Sınıf & Grup Yarışmaları</span>
          </div>

          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-brand font-black text-slate-900 tracking-tight leading-[1.15]">
            Öğrenmeyi Rekabete ve <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-600">Eğlenceye</span> Dönüştürün.
          </h1>

          <p class="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
            Kahoot tarzı eşzamanlı yarışmalar düzenleyin. Öğrenciler akıllı tahtadaki soruyu takip edip cep telefonlarından tek dokunuşla cevap versin.
          </p>

          <!-- 4'lü Özellik Rozetleri Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div class="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shrink-0 border border-amber-200">
                <i class="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm">Hıza Dayalı Skor</h4>
                <p class="text-[11px] text-slate-500">Erken doğru cevap verenler en yüksek puanı toplar.</p>
              </div>
            </div>

            <div class="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shrink-0 border border-indigo-200">
                <i class="fa-solid fa-layer-group"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm">6 Zengin Soru Tarzı</h4>
                <p class="text-[11px] text-slate-500">Boşluk doldurma, kronolojik sıralama, çoklu seçim ve görseller.</p>
              </div>
            </div>

            <div class="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shrink-0 border border-emerald-200">
                <i class="fa-solid fa-trophy"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm">3D Podyum & Konfeti</h4>
                <p class="text-[11px] text-slate-500">Şampiyonlar kürsüde alkışlanır ve konfeti patlatılır.</p>
              </div>
            </div>

            <div class="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shrink-0 border border-rose-200">
                <i class="fa-solid fa-mobile-screen"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm">Sıfır Kurulum</h4>
                <p class="text-[11px] text-slate-500">Uygulama indirmeden sadece PIN ile anında katılım.</p>
              </div>
            </div>
          </div>

          <!-- Canlı Önizleme Küçük Barı -->
          <div class="hidden sm:flex items-center gap-4 bg-white/80 p-3 rounded-2xl border border-slate-200/80 max-w-lg shadow-sm">
            <div class="flex -space-x-2">
              <span class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white">▲</span>
              <span class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white">◆</span>
              <span class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white">●</span>
              <span class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white">■</span>
            </div>
            <div class="text-xs text-slate-600">
              <strong class="text-slate-900 font-bold">Kahoot Formatında:</strong> Kırmızı, Mavi, Sarı, Yeşil bloklarla hızlı yarışma.
            </div>
          </div>
        </div>

        <!-- Sağ Sütun: Yarışmaya Katıl Kartı (Ultra-Premium Card) -->
        <div class="lg:col-span-5 xl:col-span-5 2xl:col-span-4 w-full flex justify-center">
          <div class="w-full max-w-md 2xl:max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-premium relative overflow-hidden animate-pop-in">
            <!-- Üst Renk Şeridi -->
            <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-indigo-500 via-amber-400 to-emerald-500"></div>

            <div class="text-center mb-6 pt-2">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2 border border-indigo-200/70 text-xl shadow-sm">
                <i class="fa-solid fa-gamepad"></i>
              </div>
              <h2 class="text-2xl font-brand font-black text-slate-900">Yarışmaya Katıl</h2>
              <p class="text-xs text-slate-500 font-medium">Tahtadaki 6 haneli oyun PIN kodunu girin</p>
            </div>

            <form id="form-student-join" class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  <i class="fa-solid fa-key text-indigo-500 mr-1"></i> Oyun PIN Kodu
                </label>
                <input 
                  type="tel" 
                  id="input-pin" 
                  maxlength="6" 
                  placeholder="123456" 
                  required
                  autocomplete="off"
                  class="w-full text-center text-3xl font-brand font-black tracking-widest py-3.5 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  <i class="fa-solid fa-user text-indigo-500 mr-1"></i> Rumuzun (Nickname)
                </label>
                <input 
                  type="text" 
                  id="input-nickname" 
                  maxlength="15" 
                  placeholder="Örn: HızlıZihin" 
                  required
                  autocomplete="off"
                  class="w-full text-center text-base font-bold py-3 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Avatarını Seç</label>
                <div class="flex items-center justify-center gap-2 flex-wrap" id="avatar-selector">
                  ${AVATARS.map((av, idx) => `
                    <button 
                      type="button" 
                      data-avatar="${av}" 
                      class="avatar-btn w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${idx === 0 ? 'bg-indigo-50 border-2 border-indigo-500 scale-110 shadow-sm' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}"
                    >
                      ${av}
                    </button>
                  `).join('')}
                </div>
              </div>

              <button 
                type="submit" 
                id="btn-student-join"
                class="w-full mt-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-brand font-black text-lg py-4 rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Yarışmaya Katıl</span>
                <i class="fa-solid fa-arrow-right text-sm"></i>
              </button>
            </form>

            <!-- Öğretmen Bilgi Kartı -->
            <div class="mt-5 pt-4 border-t border-slate-100 text-center">
              <p class="text-xs text-slate-500">
                Öğretmen misiniz? Kendi testlerinizi oluşturmak için 
                <button id="btn-goto-teacher-link" class="text-indigo-600 font-bold hover:underline ml-1">Giriş Yapın ➔</button>
              </p>
            </div>
          </div>
        </div>

      </div>

      <!-- Alt Ticker / Footer -->
      <footer class="pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
        <div>QuizLem &bull; Gerçek Zamanlı Eğlenceli Bilgi Yarışması Platformu</div>
        <div class="flex items-center gap-4">
          <span><i class="fa-solid fa-shield-halved text-emerald-500 mr-1"></i> Anti-Cheat Koruması</span>
          <span><i class="fa-solid fa-wifi text-indigo-500 mr-1"></i> Eşzamanlı Socket.io</span>
        </div>
      </footer>
    </div>
  `;
}

// ----------------------------------------------------
// B. ÖĞRETMEN GİRİŞ & KAYIT EKRANLARI
// ----------------------------------------------------
function renderTeacherLoginView() {
  return `
    <div class="flex-1 flex flex-col justify-center items-center p-4 max-w-md mx-auto w-full">
      <div class="w-full bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium animate-pop-in">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-brand font-bold text-xl shadow-md shadow-indigo-500/20">Q</div>
            <span class="font-brand font-bold text-xl text-slate-900">Öğretmen Girişi</span>
          </div>
          <button id="btn-back-home" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <div class="bg-indigo-50/80 border border-indigo-200/70 rounded-2xl p-3.5 mb-5 text-xs text-indigo-900 flex items-start gap-2.5">
          <i class="fa-solid fa-key text-indigo-600 text-sm mt-0.5"></i>
          <div class="leading-relaxed">
            <strong>Hazır Demo Giriş Bilgileri:</strong><br>
            Kullanıcı: <code class="bg-indigo-200/60 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-950">ogretmen</code> &bull; 
            Şifre: <code class="bg-indigo-200/60 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-950">123456</code>
          </div>
        </div>

        <form id="form-teacher-login" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Kullanıcı Adı</label>
            <input 
              type="text" 
              id="login-username" 
              value="ogretmen" 
              required
              class="w-full font-medium py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Şifre</label>
            <input 
              type="password" 
              id="login-password" 
              value="123456" 
              required
              class="w-full font-medium py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
            />
          </div>

          <button 
            type="submit" 
            class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <i class="fa-solid fa-right-to-bracket"></i>
            <span>Giriş Yap</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Hesabınız yok mu? 
          <button id="btn-goto-register" class="text-indigo-600 font-bold hover:underline ml-1">Kayıt Olun</button>
        </div>
      </div>
    </div>
  `;
}

function renderTeacherRegisterView() {
  return `
    <div class="flex-1 flex flex-col justify-center items-center p-4 max-w-md mx-auto w-full">
      <div class="w-full bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium animate-pop-in">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-brand font-bold text-xl text-slate-900">Yeni Öğretmen Kaydı</h2>
          <button id="btn-back-home" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <form id="form-teacher-register" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Adınız Soyadınız</label>
            <input 
              type="text" 
              id="reg-fullname" 
              placeholder="Örn: Zeynep Öğretmen" 
              required
              class="w-full font-medium py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Kullanıcı Adı</label>
            <input 
              type="text" 
              id="reg-username" 
              placeholder="zeynep_hoca" 
              required
              class="w-full font-medium py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Şifre</label>
            <input 
              type="password" 
              id="reg-password" 
              placeholder="••••••••" 
              required
              class="w-full font-medium py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-sm"
            />
          </div>

          <button 
            type="submit" 
            class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <i class="fa-solid fa-user-plus"></i>
            <span>Hesap Oluştur</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Zaten hesabınız var mı? 
          <button id="btn-goto-login" class="text-indigo-600 font-bold hover:underline ml-1">Giriş Yap</button>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// C. ÖĞRETMEN YÖNETİM PANELİ (FULL DOLU SAAS DASHBOARD)
// İki küçük kart yerine; istatistikler, banner, arama, filtreler ve ipuçları paneli!
// ----------------------------------------------------
function renderTeacherDashboardView() {
  const teacherName = state.user ? state.user.full_name : 'Öğretmen';
  
  // Toplam Soru Sayısı Hesabı
  const totalQuestionsCount = state.quizzes.reduce((acc, q) => acc + (q.question_count || 0), 0);

  // Filtrelenmiş Quizler
  const filteredQuizzes = state.quizzes.filter(q => {
    const matchesCategory = (state.selectedCategory === 'Tümü' || q.category === state.selectedCategory);
    const matchesSearch = (q.title.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                           (q.description && q.description.toLowerCase().includes(state.searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const categories = ['Tümü', 'Genel', 'Bilim', 'Teknoloji', 'Tarih', 'Eğlence', 'Diğer'];

  return `
    <div class="flex-1 flex flex-col w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 2xl:px-12 space-y-6">
      
      <!-- Üst Header Bar -->
      <header class="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-brand font-black text-2xl shadow-md shadow-indigo-500/20">
            Q
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="font-brand font-black text-2xl text-slate-900 leading-none">QuizLem Panel</h1>
              <span class="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">Öğretmen Modu</span>
            </div>
            <p class="text-xs text-slate-500 font-medium mt-1">Hoş geldiniz, <strong class="text-slate-800">${teacherName}</strong></p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <button id="btn-create-quiz" class="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm cursor-pointer">
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Yeni Test Hazırla</span>
          </button>
          <button id="btn-logout" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 border border-slate-200/60 cursor-pointer">
            <i class="fa-solid fa-right-from-bracket text-xs"></i>
            <span>Çıkış</span>
          </button>
        </div>
      </header>

      <!-- Panel Sekmeleri (Testlerim vs. Raporlar & Analizler) -->
      <div class="flex items-center gap-2.5 border-b border-slate-200/80 pb-3">
        <button id="tab-dashboard-quizzes" class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${state.activeDashboardTab === 'quizzes' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'}">
          <i class="fa-solid fa-layer-group"></i>
          <span>Testlerim</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${state.activeDashboardTab === 'quizzes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}">${state.quizzes.length}</span>
        </button>

        <button id="tab-dashboard-reports" class="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${state.activeDashboardTab === 'reports' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'}">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Raporlar & Analizler</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${state.activeDashboardTab === 'reports' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}">${state.reports.length}</span>
        </button>
      </div>

      ${state.activeDashboardTab === 'reports' ? renderDashboardReportsTab() : `
      <!-- KPI İstatistik Kartları (4 Adet Modern Panel) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <!-- 1. Toplam Test -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0 border border-indigo-100">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Test</span>
            <span class="text-2xl font-brand font-black text-slate-900">${state.quizzes.length}</span>
            <span class="text-[10px] text-emerald-600 font-bold block">● Yayına Hazır</span>
          </div>
        </div>

        <!-- 2. Soru Havuzu -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0 border border-amber-100">
            <i class="fa-solid fa-circle-question"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Soru Havuzu</span>
            <span class="text-2xl font-brand font-black text-slate-900">${totalQuestionsCount}</span>
            <span class="text-[10px] text-slate-500 font-semibold block">Farklı Kategorilerde</span>
          </div>
        </div>

        <!-- 3. Desteklenen Soru Tipleri -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0 border border-purple-100">
            <i class="fa-solid fa-shapes"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Soru Çeşitliliği</span>
            <span class="text-2xl font-brand font-black text-slate-900">6 Tarz</span>
            <span class="text-[10px] text-purple-600 font-bold block">Boşluk, Sıralama, Görsel</span>
          </div>
        </div>

        <!-- 4. Canlı Durum -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0 border border-emerald-100">
            <i class="fa-solid fa-tower-broadcast"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sunucu Durumu</span>
            <span class="text-2xl font-brand font-black text-emerald-600">Aktif</span>
            <span class="text-[10px] text-slate-500 font-semibold block">Socket.io PIN Motoru</span>
          </div>
        </div>
      </div>

      <!-- Hoş Geldiniz Banner Kartı -->
      <div class="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <!-- Arka Plan Işık Efekti -->
        <div class="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="space-y-2 relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-amber-300">
            <i class="fa-solid fa-sparkles"></i>
            <span>Akıllı Tahta ve Mobil Uyumlu Yarışma Yayını</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-brand font-black">Sınıfınızla Yarışmaya Başlamaya Hazır Mısınız?</h2>
          <p class="text-xs sm:text-sm text-indigo-200 leading-relaxed">
            Aşağıdaki hazır testlerden birinde <strong>"Hemen Oynat"</strong> butonuna basın; ekranda beliren 6 haneli PIN kodunu tahtaya yansıtın ve öğrencilerin bağlanmasını izleyin!
          </p>
        </div>

        <div class="relative z-10 shrink-0">
          <button id="btn-banner-create" class="bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-brand font-black px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm cursor-pointer">
            <i class="fa-solid fa-plus"></i>
            <span>Yeni Bir Test Tasarla</span>
          </button>
        </div>
      </div>

      <!-- Filtre ve Arama Alanı -->
      <div class="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <!-- Kategori Butonları -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" id="category-filter-tabs">
          ${categories.map(cat => `
            <button 
              type="button" 
              data-category="${cat}" 
              class="btn-filter-cat whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${state.selectedCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}"
            >
              ${cat}
            </button>
          `).join('')}
        </div>

        <!-- Canlı Arama Inputu -->
        <div class="relative min-w-[240px] sm:min-w-[300px]">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input 
            type="text" 
            id="input-search-quizzes" 
            value="${state.searchQuery}" 
            placeholder="Test başlığı veya konu ara..." 
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <!-- İki Kolonlu İçerik Düzeni: Sol (Test Kartları Grid) + Sağ (Öğretmen İpuçları & Rehber) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 2xl:gap-8">
        
        <!-- Sol Ana Kolon: Test Kartları -->
        <div class="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-4">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-list-check text-indigo-600"></i>
              <span>Test Koleksiyonu (${filteredQuizzes.length})</span>
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
            ${filteredQuizzes.length === 0 ? `
              <div class="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-3xl mx-auto mb-3">
                  <i class="fa-solid fa-folder-open"></i>
                </div>
                <h4 class="text-base font-bold text-slate-800 mb-1">Eşleşen test bulunamadı</h4>
                <p class="text-xs text-slate-500 mb-4 max-w-sm mx-auto">Arama kriterlerinizi değiştirebilir veya yeni bir test oluşturabilirsiniz.</p>
                <button id="btn-create-quiz-empty" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm">
                  <i class="fa-solid fa-plus"></i>
                  <span>Test Oluştur</span>
                </button>
              </div>
            ` : filteredQuizzes.map(quiz => `
              <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-premium hover:-translate-y-1 relative">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-3">
                    <span class="text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
                      ${quiz.category || 'Genel'}
                    </span>
                    <span class="text-xs text-slate-500 font-semibold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                      <i class="fa-solid fa-circle-question text-indigo-500"></i>
                      ${quiz.question_count || 0} Soru
                    </span>
                  </div>

                  <h4 class="text-base sm:text-lg font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors leading-snug">${quiz.title}</h4>
                  <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">${quiz.description || 'Açıklama girilmemiş.'}</p>
                </div>

                <!-- Eylemler -->
                <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button 
                    data-play-quiz="${quiz.id}" 
                    class="btn-play-quiz flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-slate-950 font-brand font-black py-2.5 px-3 rounded-xl transition-all shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                  >
                    <i class="fa-solid fa-play text-xs"></i>
                    <span>Hemen Oynat</span>
                  </button>

                  <button 
                    data-edit-quiz="${quiz.id}" 
                    title="Düzenle" 
                    class="btn-edit-quiz w-9 h-9 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-all border border-slate-200/60 cursor-pointer"
                  >
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                  </button>

                  <button 
                    data-delete-quiz="${quiz.id}" 
                    title="Sil" 
                    class="btn-delete-quiz w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-all border border-slate-200/60 cursor-pointer"
                  >
                    <i class="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sağ Kolon: İpuçları, Rehber & Hızlı Bilgiler -->
        <div class="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-5">
          
          <!-- Hızlı Başlatma Rehberi -->
          <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-circle-play text-emerald-500"></i>
              <span>3 Adımda Canlı Yarışma</span>
            </h4>

            <div class="space-y-3 text-xs">
              <div class="flex items-start gap-3">
                <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 border border-indigo-200">1</span>
                <div>
                  <strong class="text-slate-800 block">Testi Seçin ve Başlatın</strong>
                  <span class="text-slate-500">Listeden dilediğiniz teste tıklayarak 6 haneli lobi odasını açın.</span>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 border border-indigo-200">2</span>
                <div>
                  <strong class="text-slate-800 block">PIN Kodunu Paylaşın</strong>
                  <span class="text-slate-500">Öğrenciler kendi cep telefonlarından veya tabletlerinden PIN'i girsin.</span>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 border border-indigo-200">3</span>
                <div>
                  <strong class="text-slate-800 block">Öğrenmeyi Kutlayın</strong>
                  <span class="text-slate-500">Süre bitiminde anlık grafikler ve finalde 3D podyum gösterilir.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Yeni Soru Tipleri İpucu Kartı -->
          <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 sm:p-6 border border-amber-200/80 shadow-sm space-y-3">
            <h4 class="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-lightbulb text-amber-500"></i>
              <span>Yeni Soru Tiplerini Keşfedin</span>
            </h4>
            <p class="text-xs text-amber-800 leading-relaxed">
              Testlerinize sadece çoktan seçmeli değil; <strong>Boşluk Doldurma</strong> (klavyeyle yazma), <strong>Sıralama</strong> (kronolojik adımlar), <strong>Çoklu Seçim</strong> ve <strong>Görsel</strong> sorular ekleyebilirsiniz.
            </p>
            <div class="pt-1">
              <span class="text-[11px] font-bold text-amber-700 bg-amber-200/60 px-2.5 py-1 rounded-lg">
                🚀 Soru editöründen hemen deneyin!
              </span>
            </div>
          </div>

        </div>

      </div>
      `}

    </div>
  `;
}

// ----------------------------------------------------
// C1. ÖĞRETMEN RAPORLAR SEKMESİ (DASHBOARD REPORTS TAB)
// ----------------------------------------------------
function renderDashboardReportsTab() {
  const reports = state.reports || [];
  const query = (state.searchReportQuery || '').toLowerCase().trim();
  const filteredReports = reports.filter(r => {
    return (r.quiz_title && r.quiz_title.toLowerCase().includes(query)) ||
           (r.pin && r.pin.toString().includes(query));
  });

  const totalSessions = reports.length;
  const totalPlayers = reports.reduce((acc, r) => acc + (r.player_count || 0), 0);

  return `
    <!-- Raporlar KPI Özeti -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0 border border-indigo-100">
          <i class="fa-solid fa-trophy"></i>
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tamamlanan Yarışma</span>
          <span class="text-2xl font-brand font-black text-slate-900">${totalSessions}</span>
          <span class="text-[10px] text-emerald-600 font-bold block">● Kayıtlı Rapor</span>
        </div>
      </div>

      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0 border border-emerald-100">
          <i class="fa-solid fa-users"></i>
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Katılım</span>
          <span class="text-2xl font-brand font-black text-slate-900">${totalPlayers}</span>
          <span class="text-[10px] text-slate-500 font-semibold block">Öğrenci Karnesi</span>
        </div>
      </div>

      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0 border border-amber-100">
          <i class="fa-solid fa-file-excel"></i>
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Excel Dışa Aktarma</span>
          <span class="text-2xl font-brand font-black text-emerald-600">.xlsx</span>
          <span class="text-[10px] text-slate-500 font-semibold block">3 Sayfalı Detaylı Rapor</span>
        </div>
      </div>
    </div>

    <!-- Rapor Arama & Başlık Çubuğu -->
    <div class="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
          <i class="fa-solid fa-clock-rotate-left text-indigo-600"></i>
          <span>Geçmiş Yarışmalar (${filteredReports.length})</span>
        </h3>
      </div>

      <div class="relative min-w-[260px]">
        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
        <input 
          type="text" 
          id="input-search-reports" 
          value="${state.searchReportQuery}" 
          placeholder="Yarışma başlığı veya PIN ara..." 
          class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
        />
      </div>
    </div>

    <!-- Raporlar Listesi / Kartlar -->
    ${filteredReports.length === 0 ? `
      <div class="py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
        <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-3xl mx-auto mb-3">
          <i class="fa-solid fa-chart-line"></i>
        </div>
        <h4 class="text-base font-bold text-slate-800 mb-1">Kayıtlı yarışma raporu bulunamadı</h4>
        <p class="text-xs text-slate-500 mb-4 max-w-sm mx-auto">Bir test başlatıp yarışmayı tamamladığınızda öğrencilerin tüm yanıtları, karneleri ve soru başarı analizleri burada görüntülenecektir.</p>
        <button id="btn-goto-quizzes-tab" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer">
          <i class="fa-solid fa-layer-group"></i>
          <span>Testlerime Git</span>
        </button>
      </div>
    ` : `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
        ${filteredReports.map(report => {
          const dateStr = new Date(report.finished_at || report.created_at).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
          return `
            <div class="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-premium hover:-translate-y-1 relative">
              <div>
                <div class="flex items-start justify-between gap-2 mb-3">
                  <span class="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl">
                    PIN: ${report.pin}
                  </span>
                  <span class="text-[11px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                    <i class="fa-regular fa-calendar text-indigo-500"></i>
                    ${dateStr}
                  </span>
                </div>

                <h4 class="text-base font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                  ${report.quiz_title}
                </h4>

                <div class="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-users text-indigo-600"></i>
                    <span class="text-slate-600"><strong>${report.player_count}</strong> Katılımcı</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-question text-emerald-600"></i>
                    <span class="text-slate-600"><strong>${report.total_questions}</strong> Soru</span>
                  </div>
                </div>
              </div>

              <!-- Eylemler -->
              <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button 
                  data-report-id="${report.id}" 
                  class="btn-view-report flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white font-bold py-2.5 px-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <i class="fa-solid fa-chart-pie"></i>
                  <span>İncele</span>
                </button>

                <button 
                  data-report-id="${report.id}" 
                  title="Excel (.xlsx) Raporunu İndir" 
                  class="btn-download-excel bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <i class="fa-solid fa-file-excel text-emerald-600"></i>
                  <span class="hidden sm:inline">Excel</span>
                </button>

                <button 
                  data-report-id="${report.id}" 
                  title="Raporu Sil" 
                  class="btn-delete-report w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all border border-slate-200/60 cursor-pointer shrink-0"
                >
                  <i class="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

// ----------------------------------------------------
// C2. DETAYLI RAPOR VE KARNE GÖRÜNÜMÜ (REPORT DETAIL VIEW)
// ----------------------------------------------------
function renderReportDetailView() {
  if (!state.selectedReport) {
    return `<div class="p-8 text-center text-slate-500"><p>Rapor yüklenemedi.</p></div>`;
  }

  const { session, players = [], questions = [], answers = [] } = state.selectedReport;

  // 1. Şampiyon
  const champion = players.length > 0 ? players[0] : null;

  // 2. Sınıf Genel Başarı Oranı %
  let overallAccuracy = 0;
  if (answers.length > 0) {
    const correctCount = answers.filter(a => a.is_correct === 1).length;
    overallAccuracy = ((correctCount / answers.length) * 100).toFixed(1);
  } else if (players.length > 0) {
    const sumAcc = players.reduce((acc, p) => acc + (p.accuracy_pct || 0), 0);
    overallAccuracy = (sumAcc / players.length).toFixed(1);
  }

  // 3. En Zor Soru
  let hardestQuestion = null;
  let lowestAcc = 101;
  questions.forEach((q, idx) => {
    const qAnswers = answers.filter(a => a.question_index === idx);
    if (qAnswers.length > 0) {
      const correctCount = qAnswers.filter(a => a.is_correct === 1).length;
      const acc = (correctCount / qAnswers.length) * 100;
      if (acc < lowestAcc) {
        lowestAcc = acc;
        hardestQuestion = { index: idx + 1, text: q.question_text, acc: acc.toFixed(0) };
      }
    }
  });

  const dateStr = new Date(session.finished_at || session.created_at).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const activeSubTab = state.reportDetailSubTab || 'ranking';

  return `
    <div class="flex-1 flex flex-col w-full max-w-[1680px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 2xl:px-12 space-y-6">
      
      <!-- Üst Bar / Geri ve Excel İndir -->
      <header class="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button id="btn-report-back-dashboard" class="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all border border-slate-200/60 cursor-pointer">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="font-brand font-black text-xl sm:text-2xl text-slate-900">${session.quiz_title}</h1>
              <span class="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                PIN: ${session.pin}
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium mt-1">Yarışma Tarihi: ${dateStr}</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button 
            id="btn-export-excel-detail" 
            data-report-id="${session.id}"
            class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm cursor-pointer"
          >
            <i class="fa-solid fa-file-excel text-base"></i>
            <span>Excel (.xlsx) Raporunu İndir</span>
          </button>
        </div>
      </header>

      <!-- KPI Kartları (4 Adet) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Şampiyon -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0 border border-amber-200">
            ${champion ? champion.avatar : '🏆'}
          </div>
          <div class="truncate">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Yarışma Şampiyonu</span>
            <span class="text-base sm:text-lg font-brand font-black text-slate-900 truncate block">
              ${champion ? champion.nickname : 'Katılımcı Yok'}
            </span>
            <span class="text-[10px] text-amber-600 font-bold block">${champion ? `${champion.total_score.toLocaleString()} Puan` : '-'}</span>
          </div>
        </div>

        <!-- 2. Katılımcı -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0 border border-indigo-100">
            <i class="fa-solid fa-users"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Katılımcı Sayısı</span>
            <span class="text-2xl font-brand font-black text-slate-900">${players.length}</span>
            <span class="text-[10px] text-indigo-600 font-bold block">Öğrenci Yarıştı</span>
          </div>
        </div>

        <!-- 3. Sınıf Başarısı -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0 border border-emerald-100">
            <i class="fa-solid fa-bullseye"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sınıf Başarısı</span>
            <span class="text-2xl font-brand font-black text-emerald-600">%${overallAccuracy}</span>
            <span class="text-[10px] text-slate-500 font-semibold block">Ortalama Doğruluk</span>
          </div>
        </div>

        <!-- 4. En Zor Soru -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0 border border-rose-100">
            <i class="fa-solid fa-fire"></i>
          </div>
          <div class="truncate">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">En Zor Soru</span>
            <span class="text-base sm:text-lg font-brand font-black text-slate-900 block truncate">
              ${hardestQuestion ? `Soru #${hardestQuestion.index}` : '-'}
            </span>
            <span class="text-[10px] text-rose-600 font-bold block">
              ${hardestQuestion ? `%${hardestQuestion.acc} Başarı Oranı` : 'Tüm sorular başarılı'}
            </span>
          </div>
        </div>
      </div>

      <!-- Alt Sekmeler (Tabs) -->
      <div class="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button id="subtab-ranking" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${activeSubTab === 'ranking' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
          <i class="fa-solid fa-ranking-star"></i>
          <span>Öğrenci Karneleri (${players.length})</span>
        </button>

        <button id="subtab-questions" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${activeSubTab === 'questions' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
          <i class="fa-solid fa-chart-column"></i>
          <span>Soru Başarı Analizi (${questions.length})</span>
        </button>

        <button id="subtab-matrix" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${activeSubTab === 'matrix' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}">
          <i class="fa-solid fa-table-cells"></i>
          <span>Detaylı Cevap Matrisi</span>
        </button>
      </div>

      <!-- Alt Sekme İçeriği -->
      ${activeSubTab === 'ranking' ? renderReportRankingTab(players, session) : ''}
      ${activeSubTab === 'questions' ? renderReportQuestionsTab(questions, answers) : ''}
      ${activeSubTab === 'matrix' ? renderReportMatrixTab(players, questions, answers) : ''}

    </div>
  `;
}

// ----------------------------------------------------
// C3. ÖĞRENCİ KARNELERİ SIRALAMA TABLOSU
// ----------------------------------------------------
function renderReportRankingTab(players, session) {
  if (!players || players.length === 0) {
    return `
      <div class="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
        <p class="text-slate-500 font-semibold">Bu yarışmaya katılan öğrenci bulunamadı.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
          <i class="fa-solid fa-trophy text-amber-500"></i>
          <span>Öğrenci Başarı Sıralaması ve Karneleri</span>
        </h3>
        <span class="text-xs text-slate-500 font-medium">Toplam ${players.length} Yarışmacı</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-100">
            <tr>
              <th class="py-3 px-4 text-center w-16">Sıra</th>
              <th class="py-3 px-4">Öğrenci</th>
              <th class="py-3 px-4 text-center">Toplam Puan</th>
              <th class="py-3 px-4 text-center">Doğru</th>
              <th class="py-3 px-4 text-center">Yanlış</th>
              <th class="py-3 px-4">Başarı Oranı</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            ${players.map((p, idx) => {
              let rankBadge = `<span class="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center mx-auto text-xs">${idx + 1}</span>`;
              if (idx === 0) {
                rankBadge = `<span class="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center mx-auto shadow-sm text-xs">🥇 1</span>`;
              } else if (idx === 1) {
                rankBadge = `<span class="w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-bold flex items-center justify-center mx-auto shadow-sm text-xs">🥈 2</span>`;
              } else if (idx === 2) {
                rankBadge = `<span class="w-7 h-7 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center mx-auto shadow-sm text-xs">🥉 3</span>`;
              }

              const acc = p.accuracy_pct || 0;
              let barColor = 'bg-rose-500';
              if (acc >= 75) barColor = 'bg-emerald-500';
              else if (acc >= 50) barColor = 'bg-amber-500';

              return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3 px-4 text-center">${rankBadge}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">${p.avatar || '🐱'}</span>
                      <div>
                        <strong class="text-slate-900 block font-bold">${p.nickname}</strong>
                        <span class="text-[10px] text-slate-400">Katılımcı #${p.id}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center font-brand font-black text-indigo-600 text-base">
                    ${(p.total_score || 0).toLocaleString()}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold text-xs">
                      <i class="fa-solid fa-check text-[10px]"></i> ${p.correct_count || 0}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg font-bold text-xs">
                      <i class="fa-solid fa-xmark text-[10px]"></i> ${p.wrong_count || 0}
                    </span>
                  </td>
                  <td class="py-3 px-4 min-w-[140px]">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div class="${barColor} h-2.5 rounded-full transition-all duration-500" style="width: ${acc}%"></div>
                      </div>
                      <span class="text-xs font-bold text-slate-700 w-10 text-right">%${acc}</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// C4. SORU BAŞARI ANALİZİ
// ----------------------------------------------------
function renderReportQuestionsTab(questions, answers) {
  if (!questions || questions.length === 0) {
    return `
      <div class="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
        <p class="text-slate-500 font-semibold">Soru kaydı bulunamadı.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      ${questions.map((q, idx) => {
        const qAnswers = answers.filter(a => a.question_index === idx);
        const totalSubmissions = qAnswers.length;
        const correctCount = qAnswers.filter(a => a.is_correct === 1).length;
        const wrongCount = totalSubmissions - correctCount;
        const accPct = totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0;

        let avgTimeSec = 0;
        if (totalSubmissions > 0) {
          const sumTime = qAnswers.reduce((acc, a) => acc + (a.response_time_ms || 0), 0);
          avgTimeSec = (sumTime / totalSubmissions / 1000).toFixed(1);
        }

        const typeInfo = QUESTION_TYPE_LABELS[q.question_type] || { label: 'Soru', icon: 'fa-circle-question', color: 'bg-slate-100 text-slate-700 border-slate-200' };

        return `
          <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-brand font-black flex items-center justify-center text-sm border border-indigo-100">
                  ${idx + 1}
                </span>
                <span class="text-xs font-bold px-2.5 py-1 rounded-xl border ${typeInfo.color} flex items-center gap-1.5">
                  <i class="fa-solid ${typeInfo.icon}"></i>
                  ${typeInfo.label}
                </span>
                <span class="text-xs text-slate-400 font-semibold">
                  <i class="fa-regular fa-clock"></i> ${avgTimeSec} sn ort. süre
                </span>
              </div>

              <div class="flex items-center gap-3 text-xs font-bold">
                <span class="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  <i class="fa-solid fa-check"></i> ${correctCount} Doğru
                </span>
                <span class="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                  <i class="fa-solid fa-xmark"></i> ${wrongCount} Yanlış
                </span>
                <span class="text-slate-900 font-brand font-black text-sm">
                  %${accPct} Başarı
                </span>
              </div>
            </div>

            <!-- Soru Metni -->
            <h4 class="text-base font-bold text-slate-900 leading-snug">${q.question_text}</h4>

            <!-- Başarı Çubuğu -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>Soru Başarı Grafiği</span>
                <span>%${accPct} Doğru Yanıt</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                <div class="bg-emerald-500 h-3 transition-all" style="width: ${accPct}%"></div>
                <div class="bg-rose-500 h-3 transition-all" style="width: ${100 - accPct}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// C5. DETAYLI CEVAP MATRİSİ (MATRIX TAB)
// ----------------------------------------------------
function renderReportMatrixTab(players, questions, answers) {
  if (!players || players.length === 0 || !questions || questions.length === 0) {
    return `
      <div class="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
        <p class="text-slate-500 font-semibold">Cevap matrisi için yeterli veri bulunamadı.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 class="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <i class="fa-solid fa-table-cells text-indigo-600"></i>
            <span>Öğrenci Soru Cevap Matrisi</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">Her öğrencinin her soruya verdiği cevap, doğruluk durumu, yanıt süresi ve kazandığı puan.</p>
        </div>

        <!-- Lejant -->
        <div class="flex items-center gap-3 text-xs font-semibold">
          <span class="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            <i class="fa-solid fa-check text-emerald-600"></i> Doğru
          </span>
          <span class="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
            <i class="fa-solid fa-xmark text-rose-600"></i> Yanlış
          </span>
          <span class="flex items-center gap-1.5 text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
            - Boş
          </span>
        </div>
      </div>

      <!-- Kaydırılabilir Matris Tablosu -->
      <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th class="py-3 px-4 min-w-[160px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Öğrenci</th>
              ${questions.map((q, idx) => `
                <th class="py-3 px-3 text-center min-w-[120px] border-r border-slate-200">
                  <div class="font-bold text-slate-800">Soru #${idx + 1}</div>
                  <div class="text-[10px] text-slate-400 font-normal truncate max-w-[110px]" title="${q.question_text}">
                    ${q.question_text}
                  </div>
                </th>
              `).join('')}
              <th class="py-3 px-4 text-center min-w-[90px]">Toplam</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            ${players.map(p => {
              return `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="py-3 px-4 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 font-bold text-slate-800">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">${p.avatar || '🐱'}</span>
                      <span class="truncate max-w-[120px]">${p.nickname}</span>
                    </div>
                  </td>

                  ${questions.map((q, qIdx) => {
                    const ans = answers.find(a => a.player_id === p.id && a.question_index === qIdx);
                    if (!ans) {
                      return `
                        <td class="py-3 px-3 text-center border-r border-slate-100">
                          <span class="text-slate-300 font-mono text-xs">-</span>
                        </td>
                      `;
                    }

                    const isCorr = ans.is_correct === 1;
                    const sec = (ans.response_time_ms / 1000).toFixed(1);
                    const pts = ans.earned_points || 0;

                    return `
                      <td class="py-2.5 px-3 text-center border-r border-slate-100">
                        <div class="inline-flex flex-col items-center px-2 py-1 rounded-xl text-[11px] font-bold ${isCorr ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
                          <div class="flex items-center gap-1">
                            <i class="fa-solid ${isCorr ? 'fa-check text-emerald-600' : 'fa-xmark text-rose-600'}"></i>
                            <span>${isCorr ? `+${pts}` : '0 P'}</span>
                          </div>
                          <span class="text-[9px] opacity-75 font-normal">${sec}s</span>
                        </div>
                      </td>
                    `;
                  }).join('')}

                  <td class="py-3 px-4 text-center font-brand font-black text-indigo-600 text-sm">
                    ${(p.total_score || 0).toLocaleString()}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// D. TEST VE SORU EDİTÖRÜ (QUIZ EDITOR)
// ----------------------------------------------------
function renderQuizEditorView() {
  const isEditing = !!state.editingQuiz;
  const quiz = state.editingQuiz || {
    title: '',
    description: '',
    category: 'Genel',
    questions: [
      {
        question_text: '',
        question_type: 'multiple',
        options: ['', '', '', ''],
        correct_option: 0,
        image_url: '',
        time_limit: 20,
        points_multiplier: 1
      }
    ]
  };

  return `
    <div class="flex-1 flex flex-col w-full max-w-6xl 2xl:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <!-- Üst Bar -->
      <div class="bg-white/85 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button id="btn-cancel-editor" class="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all border border-slate-200/60 cursor-pointer">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 class="font-brand font-black text-2xl text-slate-900">
              ${isEditing ? 'Testi Düzenle' : 'Yeni Test Hazırla'}
            </h1>
            <p class="text-xs text-slate-500 font-medium">Çoktan seçmeli, boşluk doldurma, sıralama ve görsel soruları ekleyin</p>
          </div>
        </div>

        <button id="btn-save-quiz" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm cursor-pointer">
          <i class="fa-solid fa-floppy-disk"></i>
          <span>Kaydet</span>
        </button>
      </div>

      <form id="form-quiz-editor" class="space-y-6">
        <!-- Genel Bilgiler -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 class="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-circle-info"></i>
            <span>Genel Test Ayarları</span>
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Test Başlığı *</label>
              <input 
                type="text" 
                id="quiz-title" 
                value="${quiz.title || ''}" 
                placeholder="Örn: 9. Sınıf Fen & Teknoloji Bilgi Yarışması" 
                required
                class="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
              <select id="quiz-category" class="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none">
                <option value="Genel" ${quiz.category === 'Genel' ? 'selected' : ''}>Genel Kültür</option>
                <option value="Bilim" ${quiz.category === 'Bilim' ? 'selected' : ''}>Bilim & Matematik</option>
                <option value="Teknoloji" ${quiz.category === 'Teknoloji' ? 'selected' : ''}>Teknoloji & Yazılım</option>
                <option value="Tarih" ${quiz.category === 'Tarih' ? 'selected' : ''}>Tarih & Coğrafya</option>
                <option value="Eğlence" ${quiz.category === 'Eğlence' ? 'selected' : ''}>Eğlence & Spor</option>
                <option value="Diğer" ${quiz.category === 'Diğer' ? 'selected' : ''}>Diğer</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Açıklama</label>
            <input 
              type="text" 
              id="quiz-description" 
              value="${quiz.description || ''}" 
              placeholder="Yarışma hakkında kısa bir tanıtım..." 
              class="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <!-- Sorular Listesi -->
        <div class="flex items-center justify-between pt-2 px-1">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-list-ol text-indigo-600"></i>
            <span>Sorular (<span id="question-count-badge">${quiz.questions.length}</span>)</span>
          </h2>
          <button type="button" id="btn-add-question" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer">
            <i class="fa-solid fa-plus"></i>
            <span>Yeni Soru Ekle</span>
          </button>
        </div>

        <div id="questions-container" class="space-y-6">
          ${quiz.questions.map((q, qIndex) => renderQuestionCard(q, qIndex)).join('')}
        </div>
      </form>
    </div>
  `;
}

function renderQuestionCard(q, qIndex) {
  const type = q.question_type || 'multiple';

  return `
    <div class="question-card bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm relative animate-pop-in" data-q-index="${qIndex}">
      <!-- Üst Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-700 font-brand font-black flex items-center justify-center text-sm shadow-sm">
            ${qIndex + 1}
          </span>
          <span class="font-bold text-slate-800 text-sm">Soru ${qIndex + 1}</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap text-xs">
          <select class="q-type bg-slate-50 text-slate-800 font-bold rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none">
            <option value="multiple" ${type === 'multiple' ? 'selected' : ''}>🔘 Çoktan Seçmeli (4 Şık)</option>
            <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>🔘 Doğru / Yanlış</option>
            <option value="fill_blank" ${type === 'fill_blank' ? 'selected' : ''}>✍️ Boşluk Doldurma</option>
            <option value="order" ${type === 'order' ? 'selected' : ''}>🔢 Sıralama Sorusu</option>
            <option value="multiselect" ${type === 'multiselect' ? 'selected' : ''}>☑️ Çok Cevaplı</option>
            <option value="image_choice" ${type === 'image_choice' ? 'selected' : ''}>🖼️ Görsel Seçmeli</option>
          </select>

          <select class="q-time bg-slate-50 text-slate-700 rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none font-medium">
            <option value="10" ${q.time_limit === 10 ? 'selected' : ''}>⏱️ 10 sn</option>
            <option value="20" ${q.time_limit === 20 || !q.time_limit ? 'selected' : ''}>⏱️ 20 sn</option>
            <option value="30" ${q.time_limit === 30 ? 'selected' : ''}>⏱️ 30 sn</option>
            <option value="60" ${q.time_limit === 60 ? 'selected' : ''}>⏱️ 60 sn</option>
          </select>

          <select class="q-multiplier bg-slate-50 text-slate-700 rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none font-medium">
            <option value="1" ${q.points_multiplier === 1 || !q.points_multiplier ? 'selected' : ''}>⭐ Standart Puan</option>
            <option value="2" ${q.points_multiplier === 2 ? 'selected' : ''}>🔥 Çift Puan (2x)</option>
          </select>

          <button type="button" class="btn-remove-question w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all ml-1 border border-slate-200/60 cursor-pointer" title="Soruyu Sil">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>

      <!-- Soru Metni & İsteğe Bağlı Görsel -->
      <div class="space-y-3 mb-5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Soru Metni *</label>
          <textarea 
            rows="2" 
            class="q-text w-full text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
            placeholder="Sorunuzu buraya yazın..."
            required
          >${q.question_text || ''}</textarea>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <label class="block text-xs font-bold text-slate-700">
              <i class="fa-solid fa-image text-indigo-500 mr-1"></i>
              Soru Görseli (İsteğe Bağlı)
            </label>
            <label class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200 shadow-sm active:scale-95">
              <i class="fa-solid fa-cloud-arrow-up text-[11px]"></i>
              <span>📁 PC'den Görsel Seç (PNG/JPG)</span>
              <input type="file" class="hidden q-image-file" accept="image/png,image/jpeg,image/jpg,image/webp" />
            </label>
          </div>
          <div class="flex items-center gap-2">
            <input 
              type="url" 
              class="q-image-url flex-1 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none placeholder:text-slate-400 font-medium"
              placeholder="https://... veya sağdaki butondan dosya yükleyin"
              value="${q.image_url || ''}"
            />
            <button type="button" class="btn-clear-image px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all border border-slate-200/60 cursor-pointer ${q.image_url ? '' : 'hidden'}" title="Görseli Kaldır">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <!-- Canlı Thumbnail Önizlemesi -->
          <div class="q-image-preview ${q.image_url ? '' : 'hidden'}">
            <div class="inline-flex items-center gap-3 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
              <img src="${q.image_url || ''}" class="w-16 h-12 rounded-xl object-cover border border-slate-200 preview-img bg-white" />
              <div class="text-[11px] text-slate-600 font-semibold pr-2 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>Görsel hazır</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Soru Tipine Özel Alanlar -->
      <div class="options-wrapper">
        ${renderOptionsForType(q, qIndex)}
      </div>
    </div>
  `;
}

function renderOptionsForType(q, qIndex) {
  const type = q.question_type || 'multiple';

  if (type === 'multiple') {
    const opts = (Array.isArray(q.options) && q.options.length >= 4) ? q.options : ['', '', '', ''];
    const correctIdx = parseInt(q.correct_option) || 0;

    return `
      <label class="block text-xs font-bold text-slate-700 mb-2">
        Şıklar (Doğru seçeneğin solundaki daireyi işaretleyin)
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${[0, 1, 2, 3].map(optIdx => {
          const style = KAHOOT_OPTIONS[optIdx];
          const isCorrect = (correctIdx === optIdx);
          return `
            <div class="flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50/70'}">
              <input type="radio" name="correct_for_${qIndex}" value="${optIdx}" class="q-correct w-5 h-5 accent-emerald-600 cursor-pointer ml-1" ${isCorrect ? 'checked' : ''} />
              <span class="w-8 h-8 rounded-xl ${style.color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                <i class="${style.icon}"></i>
              </span>
              <input type="text" class="q-opt-input flex-1 bg-transparent text-slate-800 text-sm focus:outline-none font-semibold placeholder:text-slate-400" placeholder="${style.name} Şıkkı..." value="${opts[optIdx] || ''}" required />
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (type === 'boolean') {
    const correctIdx = parseInt(q.correct_option) || 0;
    return `
      <label class="block text-xs font-bold text-slate-700 mb-2">Doğru Yanıtı Seçin</label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${[
          { idx: 0, text: 'Doğru', style: KAHOOT_OPTIONS[1] },
          { idx: 1, text: 'Yanlış', style: KAHOOT_OPTIONS[0] }
        ].map(item => `
          <div class="flex items-center gap-2.5 p-3 rounded-2xl border transition-all ${correctIdx === item.idx ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50/70'}">
            <input type="radio" name="correct_for_${qIndex}" value="${item.idx}" class="q-correct w-5 h-5 accent-emerald-600 cursor-pointer ml-1" ${correctIdx === item.idx ? 'checked' : ''} />
            <span class="w-8 h-8 rounded-xl ${item.style.color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              <i class="${item.style.icon}"></i>
            </span>
            <input type="text" class="q-opt-input flex-1 bg-transparent text-slate-800 text-sm focus:outline-none font-bold" value="${item.text}" readonly />
          </div>
        `).join('')}
      </div>
    `;
  }

  if (type === 'fill_blank') {
    let acceptedStr = '';
    if (Array.isArray(q.correct_option)) {
      acceptedStr = q.correct_option.join(', ');
    } else {
      acceptedStr = q.correct_option || '';
    }

    return `
      <div class="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2">
        <label class="block text-xs font-bold text-amber-900">
          <i class="fa-solid fa-pen-clip mr-1 text-amber-600"></i>
          Kabul Edilen Doğru Kelime(ler) *
        </label>
        <p class="text-[11px] text-amber-700">
          Öğrencinin bu soruya doğru puan alması için yazması gereken kelimeleri virgülle ayırarak yazın (Büyük/küçük harf duyarsızdır).
        </p>
        <input 
          type="text" 
          class="q-fill-blank-input w-full bg-white border border-amber-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          placeholder="Örn: Ankara, ankara"
          value="${acceptedStr}"
          required
        />
      </div>
    `;
  }

  if (type === 'order') {
    const items = (Array.isArray(q.options) && q.options.length >= 4) ? q.options : [
      '1. İlk Aşama / Olay',
      '2. İkinci Aşama / Olay',
      '3. Üçüncü Aşama / Olay',
      '4. Dördüncü Aşama / Olay'
    ];

    return `
      <div class="space-y-2">
        <label class="block text-xs font-bold text-slate-700">
          <i class="fa-solid fa-arrow-down-1-9 mr-1 text-purple-600"></i>
          Doğru Sıralama Adımları (Eskiden yeniye veya baştan sona doğru yazın)
        </label>
        <p class="text-[11px] text-slate-500">
          Buraya yazdığınız sıra otomatik olarak "DOĞRU SIRALAMA" kabul edilir. Yarışmada öğrencilere bu maddeler karıştırılarak gösterilecektir.
        </p>
        <div class="space-y-2.5 pt-1">
          ${[0, 1, 2, 3].map(idx => `
            <div class="flex items-center gap-2.5 p-2.5 rounded-2xl border border-slate-200 bg-slate-50">
              <span class="w-7 h-7 rounded-lg bg-purple-600 text-white font-brand font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                ${idx + 1}
              </span>
              <input 
                type="text" 
                class="q-order-step flex-1 bg-transparent text-slate-800 text-sm focus:outline-none font-semibold placeholder:text-slate-400"
                placeholder="${idx + 1}. Adım / Olay..."
                value="${items[idx] || ''}"
                required
              />
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (type === 'multiselect') {
    const opts = (Array.isArray(q.options) && q.options.length >= 4) ? q.options : ['', '', '', ''];
    let correctList = [];
    if (Array.isArray(q.correct_option)) {
      correctList = q.correct_option.map(Number);
    } else {
      try { correctList = JSON.parse(q.correct_option).map(Number); } catch (e) {}
    }

    return `
      <label class="block text-xs font-bold text-slate-700 mb-1">
        <i class="fa-solid fa-square-check mr-1 text-emerald-600"></i>
        Çoklu Şıklar (Doğru olan TÜM seçeneklerin kutucuğunu işaretleyin)
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        ${[0, 1, 2, 3].map(optIdx => {
          const style = KAHOOT_OPTIONS[optIdx];
          const isChecked = correctList.includes(optIdx);
          return `
            <div class="flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all ${isChecked ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50/70'}">
              <input type="checkbox" value="${optIdx}" class="q-multiselect-check w-5 h-5 accent-emerald-600 cursor-pointer ml-1" ${isChecked ? 'checked' : ''} />
              <span class="w-8 h-8 rounded-xl ${style.color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                <i class="${style.icon}"></i>
              </span>
              <input type="text" class="q-opt-input flex-1 bg-transparent text-slate-800 text-sm focus:outline-none font-semibold placeholder:text-slate-400" placeholder="${style.name} Şıkkı..." value="${opts[optIdx] || ''}" required />
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (type === 'image_choice') {
    let opts = [];
    if (Array.isArray(q.options) && q.options.length >= 4) {
      opts = q.options;
    } else {
      opts = [
        { text: 'Seçenek 1', image: '' },
        { text: 'Seçenek 2', image: '' },
        { text: 'Seçenek 3', image: '' },
        { text: 'Seçenek 4', image: '' }
      ];
    }
    const correctIdx = parseInt(q.correct_option) || 0;

    return `
      <label class="block text-xs font-bold text-slate-700 mb-1">
        <i class="fa-solid fa-images mr-1 text-rose-600"></i>
        Görsel Seçenekler (Doğru şıkkı işaretleyin ve her şıkkın görsel URL'sini girin)
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        ${[0, 1, 2, 3].map(optIdx => {
          const style = KAHOOT_OPTIONS[optIdx];
          const isCorrect = (correctIdx === optIdx);
          const currentOpt = opts[optIdx] || { text: '', image: '' };
          const optText = (typeof currentOpt === 'object') ? currentOpt.text : currentOpt;
          const optImg = (typeof currentOpt === 'object') ? currentOpt.image : '';

          return `
            <div class="p-3 rounded-2xl border transition-all space-y-2 ${isCorrect ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50/70'}">
              <div class="flex items-center gap-2">
                <input type="radio" name="correct_for_${qIndex}" value="${optIdx}" class="q-correct w-5 h-5 accent-emerald-600 cursor-pointer" ${isCorrect ? 'checked' : ''} />
                <span class="w-7 h-7 rounded-lg ${style.color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  <i class="${style.icon}"></i>
                </span>
                <input type="text" class="q-imgopt-text flex-1 bg-transparent text-slate-800 text-sm focus:outline-none font-bold" placeholder="Etiket (Örn: Kedi)" value="${optText || ''}" required />
              </div>
              <div class="flex items-center gap-1.5">
                <input type="url" class="q-imgopt-url flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none font-medium" placeholder="Görsel URL veya dosya yükleyin" value="${optImg || ''}" required />
                <label class="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-all border border-slate-200 shrink-0 active:scale-95 shadow-sm" title="PC'den Görsel Seç (PNG / JPG)">
                  <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
                  <input type="file" class="hidden q-imgopt-file" accept="image/png,image/jpeg,image/jpg,image/webp" />
                </label>
              </div>
              <div class="q-imgopt-preview ${optImg ? '' : 'hidden'}">
                <img src="${optImg || ''}" class="w-full h-20 rounded-xl object-cover border border-slate-200 preview-opt-img bg-white" />
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return '';
}

// ----------------------------------------------------
// E. SUNUCU / ÖĞRETMEN LOBİSİ (HOST LOBBY)
// ----------------------------------------------------
function renderHostLobbyView() {
  const pin = state.hostGame.pin || '------';
  const players = state.hostGame.players || [];
  const count = players.length;
  const settings = state.hostGame.settings || {
    showQuestionsOnStudent: false,
    showOptionsTextOnStudent: false,
    shuffleQuestions: false,
    shuffleOptions: false
  };

  const isBroadcasting = voiceBroadcast.isAnyAudioActive();

  return `
    <div class="flex-1 flex flex-col w-full max-w-[1680px] 2xl:max-w-[1850px] mx-auto p-4 sm:p-6 lg:p-8 2xl:px-12 gap-5">
      
      <!-- Üst Header Bar -->
      <div class="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-xl shadow-sm">
            <i class="fa-solid fa-gamepad"></i>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">Yarışma Yayını & Lobi</span>
            <h2 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">${state.hostGame.quizTitle}</h2>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Ses Efektleri Mute Butonu -->
          <button id="btn-toggle-sound" class="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all border border-slate-200/60 cursor-pointer" title="Oyun Seslerini Aç/Kapat">
            <i class="fa-solid ${sound.isMuted ? 'fa-volume-xmark text-rose-500' : 'fa-volume-high text-emerald-600'}"></i>
          </button>
          
          <button id="btn-cancel-game" class="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200/60 cursor-pointer">
            <i class="fa-solid fa-stop"></i>
            <span>Sonlandır</span>
          </button>
        </div>
      </div>

      <!-- Ana İçerik Grid (Hemen Header'ın Altında, Boşluksuz) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Sol Alan: PIN Kodu, Ses Yayını ve Ayarlar (7 Kolon) -->
        <div class="lg:col-span-7 flex flex-col gap-4">
          
          <!-- PIN Kodu Kartı -->
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-premium text-center relative overflow-hidden">
            <div class="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-1 rounded-full text-xs font-bold mb-2.5 shadow-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Yarışma Odası Açık &bull; Katılımlar Başladı</span>
            </div>

            <h3 class="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">
              Öğrenci Katılım PIN Kodu
            </h3>

            <div class="inline-block relative group">
              <div class="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-950 text-white font-brand font-black text-4xl sm:text-6xl tracking-widest px-8 sm:px-12 py-3.5 sm:py-4 rounded-3xl shadow-xl border border-indigo-700/50 flex items-center justify-center gap-4">
                <span id="lobby-pin-display" class="select-all">${pin}</span>
                <button id="btn-copy-pin" title="PIN'i Kopyala" class="text-indigo-300 hover:text-white transition-colors text-lg sm:text-xl cursor-pointer">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
            </div>

            <p class="text-xs text-slate-500 mt-2.5 font-medium">
              Öğrenciler telefon veya tabletlerinden bu PIN kodunu girerek odaya katılabilirler
            </p>
          </div>

          <!-- Canlı Ses Yayını & Müzik Kontrol Barı (Yeni Özellik!) -->
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-premium">
            <div class="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-black">
                  <i class="fa-solid fa-tower-broadcast"></i>
                </span>
                <div>
                  <h4 class="font-bold text-slate-800 text-xs sm:text-sm leading-none">Öğretmen Canlı Ses Yayını</h4>
                  <p class="text-[11px] text-slate-400 mt-0.5">Sınıfa sesinizi veya bilgisayar müziğinizi dinletin (Öğrenciler dinleyicidir)</p>
                </div>
              </div>

              <!-- Yayın Durumu Rozeti -->
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${isBroadcasting ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-600 border-slate-200'}">
                <span class="w-2 h-2 rounded-full ${isBroadcasting ? 'bg-rose-500' : 'bg-slate-400'}"></span>
                <span>${isBroadcasting ? 'YAYINDA' : 'Ses Yayını Kapalı'}</span>
              </span>
            </div>

            <!-- Ses Butonları Barı -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              <!-- 1. Mikrofon Aç/Kapat -->
              <button id="btn-host-toggle-mic" class="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${voiceBroadcast.isMicActive ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-500/25' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                <i class="fa-solid ${voiceBroadcast.isMicActive ? 'fa-microphone' : 'fa-microphone-slash'} text-sm"></i>
                <span>${voiceBroadcast.isMicActive ? 'Mikrofonu Kapat' : 'Mikrofonumu Aç'}</span>
              </button>

              <!-- 2. PC / Sekme Sistem Sesi Paylaş -->
              <button id="btn-host-toggle-pc-sound" class="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${voiceBroadcast.isPcAudioActive ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-indigo-500/25' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                <i class="fa-solid fa-display text-sm"></i>
                <span>${voiceBroadcast.isPcAudioActive ? 'PC Sesini Durdur' : 'PC Sesini Paylaş'}</span>
              </button>

              <!-- 3. MP3 / Ses Dosyası Dinlet -->
              <label class="cursor-pointer px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border shadow-sm ${voiceBroadcast.isMusicActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-500/25' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                <i class="fa-solid ${voiceBroadcast.isMusicActive ? 'fa-circle-stop' : 'fa-music'} text-sm"></i>
                <span class="truncate">${voiceBroadcast.isMusicActive ? 'Müziği Durdur' : '🎵 MP3 Çal'}</span>
                <input type="file" id="input-host-music-file" class="hidden" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg" />
              </label>
            </div>

            <!-- Canlı Mikrofon Giriş / İletim Şiddeti (VU Bar) -->
            ${voiceBroadcast.isMicActive ? `
              <div class="mt-3 p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-inner flex flex-col gap-2 animate-pop-in">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="flex items-center gap-2 text-emerald-400">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <i class="fa-solid fa-microphone-lines"></i>
                    <span>Mikrofon İletim Şiddeti (Canlı VU Bar):</span>
                  </span>
                  <span id="host-mic-level-text" class="font-mono text-emerald-300 font-black text-sm bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/50">%0</span>
                </div>
                
                <!-- Canlı Hareketli Ses Seviye Barı -->
                <div class="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div id="host-mic-level-bar" class="h-full rounded-full bg-slate-600 transition-all duration-75" style="width: 0%;"></div>
                </div>

                <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span class="text-slate-500">Sessiz (0)</span>
                  <span class="text-emerald-400/90 font-semibold">🎙️ Konuştuğunuzda bar sağa doğru dalgalanmalıdır</span>
                  <span class="text-rose-400">Yüksek (100)</span>
                </div>
              </div>
            ` : ''}

            ${voiceBroadcast.musicFileName ? `
              <div class="mt-2.5 flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                <div class="flex items-center gap-2 truncate">
                  <i class="fa-solid fa-compact-disc fa-spin text-emerald-600"></i>
                  <span class="truncate">Oynatılıyor: ${voiceBroadcast.musicFileName}</span>
                </div>
                <button id="btn-stop-music" class="text-xs text-emerald-700 hover:text-rose-600 font-bold px-2 py-0.5">Durdur</button>
              </div>
            ` : ''}
          </div>

          <!-- Gelişmiş Yarışma Ayarları Paneli (Yeni Özellik!) -->
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-premium">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span class="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-sliders text-indigo-600"></i>
                <span>Gelişmiş Yarışma Ayarları</span>
              </span>
              <span class="text-[11px] text-slate-400 font-medium">Değişiklikler anında geçerli olur</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              <!-- Ayar 1: Soruları ve Görselleri Öğrenci Telefonunda Göster -->
              <label class="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${settings.showQuestionsOnStudent ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}">
                <div class="pr-2">
                  <div class="font-bold text-slate-800 flex items-center gap-1.5">
                    <i class="fa-solid fa-mobile-screen text-indigo-600"></i>
                    <span>Soruları Telefonda Göster</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Soru metni ve görsel öğrencinin ekranında da okunsun</p>
                </div>
                <input type="checkbox" id="setting-show-questions" class="w-5 h-5 accent-indigo-600 cursor-pointer shrink-0" ${settings.showQuestionsOnStudent ? 'checked' : ''} />
              </label>

              <!-- Ayar 2: Şık Metinlerini Butonlarda Yazılı Göster -->
              <label class="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${settings.showOptionsTextOnStudent ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}">
                <div class="pr-2">
                  <div class="font-bold text-slate-800 flex items-center gap-1.5">
                    <i class="fa-solid fa-font text-indigo-600"></i>
                    <span>Şık Metinlerini Göster</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Öğrenci şık butonlarında metinleri de görsün</p>
                </div>
                <input type="checkbox" id="setting-show-options" class="w-5 h-5 accent-indigo-600 cursor-pointer shrink-0" ${settings.showOptionsTextOnStudent ? 'checked' : ''} />
              </label>

              <!-- Ayar 3: Soruları Karıştır -->
              <label class="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${settings.shuffleQuestions ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}">
                <div class="pr-2">
                  <div class="font-bold text-slate-800 flex items-center gap-1.5">
                    <i class="fa-solid fa-shuffle text-indigo-600"></i>
                    <span>Soruları Karıştır</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Soru sırası her yarışmada rastgele gelsin</p>
                </div>
                <input type="checkbox" id="setting-shuffle-questions" class="w-5 h-5 accent-indigo-600 cursor-pointer shrink-0" ${settings.shuffleQuestions ? 'checked' : ''} />
              </label>

              <!-- Ayar 4: Şıkları Karıştır -->
              <label class="flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${settings.shuffleOptions ? 'bg-indigo-50/70 border-indigo-300 shadow-sm' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}">
                <div class="pr-2">
                  <div class="font-bold text-slate-800 flex items-center gap-1.5">
                    <i class="fa-solid fa-arrows-rotate text-indigo-600"></i>
                    <span>Şıkları Karıştır</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Çoktan seçmeli şıkların yeri karıştırılsın</p>
                </div>
                <input type="checkbox" id="setting-shuffle-options" class="w-5 h-5 accent-indigo-600 cursor-pointer shrink-0" ${settings.shuffleOptions ? 'checked' : ''} />
              </label>

            </div>
          </div>

        </div>

        <!-- Sağ Alan: Katılan Yarışmacılar ve Başlat Butonu (5 Kolon) -->
        <div class="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-premium flex flex-col justify-between h-full min-h-[500px]">
          <div>
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <span class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-users text-indigo-600"></i>
                <span>Bağlanan Yarışmacılar</span>
              </span>
              <span class="bg-indigo-600 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-sm">
                ${count} Öğrenci
              </span>
            </div>

            <div class="flex flex-wrap gap-2.5 min-h-[220px] max-h-[440px] overflow-y-auto pr-1">
              ${count === 0 ? `
                <div class="w-full text-center py-16 text-slate-400 font-medium text-sm animate-pulse">
                  <i class="fa-solid fa-hourglass-half text-3xl mb-2 text-indigo-400 block"></i>
                  Öğrencilerin bağlanması bekleniyor...
                  <p class="text-xs text-slate-400 mt-1">Öğrenciler PIN ile girdikçe burada belirecektir</p>
                </div>
              ` : players.map(p => `
                <div class="bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-sm animate-pop-in">
                  <span class="text-lg">${p.avatar}</span>
                  <span>${p.nickname}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Başlat Butonu -->
          <div class="pt-6 text-center border-t border-slate-100">
            <button 
              id="btn-start-game" 
              ${count === 0 ? 'disabled' : ''}
              class="w-full py-4 rounded-2xl font-brand font-black text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${count > 0 ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white active:scale-98 shadow-emerald-500/25 cursor-pointer animate-bounce-short' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}"
            >
              <i class="fa-solid fa-play"></i>
              <span>Yarışmayı Başlat (${count} Kişi)</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
}

// ----------------------------------------------------
// F. SUNUCU / TAHTA SORU EKRANI (HOST QUESTION)
// ----------------------------------------------------
function renderHostQuestionView() {
  const q = state.hostGame.currentQuestion;
  if (!q) return '';

  const timer = state.hostGame.timer;
  const qType = q.questionType || 'multiple';
  const typeInfo = QUESTION_TYPE_LABELS[qType] || QUESTION_TYPE_LABELS.multiple;

  return `
    <div class="flex-1 flex flex-col justify-between w-full max-w-[1680px] 2xl:max-w-[1850px] mx-auto p-4 sm:p-6 lg:p-8 2xl:px-12 h-full">
      <!-- Üst Bar -->
      <div class="flex items-center justify-between gap-4 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <span class="text-xs uppercase font-bold text-indigo-600">Soru</span>
            <span class="font-brand font-black text-xl text-slate-900">${q.questionIndex + 1} / ${q.totalQuestions}</span>
          </div>

          <button id="btn-host-mic-quick" class="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${voiceBroadcast.isMicActive ? 'bg-rose-600 text-white border-rose-700 shadow-md animate-pulse' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'}" title="Canlı Mikrofonu Aç/Kapat">
            <i class="fa-solid ${voiceBroadcast.isMicActive ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
            <span class="hidden sm:inline">${voiceBroadcast.isMicActive ? 'Mikrofon Açık' : 'Mikrofon'}</span>
          </button>
        </div>

        <!-- Sayaç -->
        <div class="relative flex items-center justify-center">
          <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white text-indigo-600 font-brand font-black text-3xl sm:text-4xl shadow-premium flex items-center justify-center border-4 border-indigo-500 animate-pulse-subtle">
            <span id="host-timer-display">${timer.timeLeft}</span>
          </div>
        </div>

        <div class="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-right">
          <span class="text-xs uppercase font-bold text-slate-400 block">Cevaplar</span>
          <span class="font-brand font-black text-xl text-emerald-600">
            <span id="host-answer-count">${state.hostGame.answersReceived}</span> / ${state.hostGame.players.length}
          </span>
        </div>
      </div>

      <!-- İlerleme Çubuğu -->
      <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
        <div id="timer-progress-bar" class="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-1000 ease-linear shadow-glow-indigo" style="width: ${(timer.timeLeft / timer.totalTime) * 100}%"></div>
      </div>

      <!-- Soru Metni Kartı -->
      <div class="my-auto py-3">
        <div class="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-premium text-center border border-slate-200/80">
          <div class="flex items-center justify-center gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${typeInfo.color}">
              <i class="fa-solid ${typeInfo.icon}"></i>
              <span>${typeInfo.label}</span>
            </span>

            ${q.pointsMultiplier > 1 ? `
              <span class="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
                🔥 2X ÇİFT PUAN!
              </span>
            ` : ''}
          </div>

          ${q.imageUrl ? `
            <div class="max-h-56 overflow-hidden rounded-2xl mb-4 border border-slate-200 inline-block shadow-sm">
              <img src="${q.imageUrl}" alt="Soru Görseli" class="max-h-56 w-auto object-contain mx-auto" />
            </div>
          ` : ''}

          <h1 class="text-2xl sm:text-4xl font-extrabold leading-snug tracking-tight text-slate-900">
            ${q.questionText}
          </h1>
        </div>
      </div>

      <!-- Soru Tipine Göre Şıklar -->
      <div class="pt-2">
        ${renderHostQuestionOptions(q)}
      </div>
    </div>
  `;
}

function renderHostQuestionOptions(q) {
  const type = q.questionType || 'multiple';

  if (type === 'fill_blank') {
    return `
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-slate-200 text-center shadow-premium animate-pop-in">
        <div class="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-6 py-3 rounded-2xl mb-4 font-bold text-sm">
          <i class="fa-solid fa-keyboard text-lg text-amber-600"></i>
          <span>Cevabı kendi cihazınızdan yazarak gönderin</span>
        </div>
        <div class="text-4xl sm:text-6xl font-mono font-black text-slate-300 tracking-widest select-none">
          [ _ _ _ _ _ _ _ _ ]
        </div>
      </div>
    `;
  }

  if (type === 'order') {
    return `
      <div class="space-y-3">
        <div class="text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          Öğrenciler maddeleri doğru kronolojik / aşama sırasına diziyor
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          ${(q.options || []).map((stepText, idx) => {
            const style = KAHOOT_OPTIONS[idx % KAHOOT_OPTIONS.length];
            return `
              <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3.5">
                <span class="w-10 h-10 rounded-xl ${style.color} text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                  ${idx + 1}
                </span>
                <span class="text-base sm:text-lg font-bold text-slate-800">${stepText}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (type === 'image_choice') {
    return `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        ${(q.options || []).map((opt, idx) => {
          const style = KAHOOT_OPTIONS[idx];
          const imgUrl = (typeof opt === 'object') ? opt.image : '';
          const textLabel = (typeof opt === 'object') ? opt.text : opt;

          return `
            <div class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between">
              <div class="h-32 bg-slate-100 overflow-hidden relative">
                ${imgUrl ? `
                  <img src="${imgUrl}" alt="${textLabel}" class="w-full h-full object-cover" />
                ` : `
                  <div class="w-full h-full flex items-center justify-center text-slate-400">Görsel Yok</div>
                `}
                <span class="absolute top-2 left-2 w-8 h-8 rounded-lg ${style.color} text-white flex items-center justify-center font-bold text-xs shadow">
                  <i class="${style.icon}"></i>
                </span>
              </div>
              <div class="p-3 text-center font-bold text-slate-800 text-sm truncate">
                ${textLabel}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const isMultiple = (type !== 'boolean');
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${isMultiple ? (q.options || []).map((optText, idx) => {
        const style = KAHOOT_OPTIONS[idx];
        return `
          <div class="${style.color} text-white p-4 sm:p-6 rounded-2xl flex items-center gap-4 transition-all shadow-md">
            <span class="w-12 h-12 rounded-xl ${style.badgeBg} flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
              <i class="${style.icon}"></i>
            </span>
            <span class="text-lg sm:text-2xl font-bold leading-tight flex-1">
              ${optText}
            </span>
            ${type === 'multiselect' ? `
              <span class="w-7 h-7 rounded-lg border-2 border-white/40 flex items-center justify-center text-xs">
                <i class="fa-solid fa-square-check"></i>
              </span>
            ` : ''}
          </div>
        `;
      }).join('') : [
        { text: 'Doğru', style: KAHOOT_OPTIONS[1] },
        { text: 'Yanlış', style: KAHOOT_OPTIONS[0] }
      ].map(item => `
        <div class="${item.style.color} text-white p-5 sm:p-8 rounded-2xl flex items-center gap-4 shadow-md">
          <span class="w-14 h-14 rounded-xl ${item.style.badgeBg} flex items-center justify-center font-black text-2xl shrink-0 shadow-sm">
            <i class="${item.style.icon}"></i>
          </span>
          <span class="text-2xl sm:text-3xl font-extrabold flex-1">
            ${item.text}
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// G. SUNUCU / TAHTA SORU SONU ÖZETİ (HOST SUMMARY)
// ----------------------------------------------------
function renderHostSummaryView() {
  const summary = state.hostGame.summary;
  const q = state.hostGame.currentQuestion;
  if (!summary || !q) return '';

  return `
    <div class="flex-1 flex flex-col justify-between w-full max-w-[1680px] 2xl:max-w-[1850px] mx-auto p-4 sm:p-6 lg:p-8 2xl:px-12 h-full">
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-xs uppercase font-bold text-indigo-600 block">Soru Tamamlandı</span>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">${q.questionText}</h2>
        </div>

        <div class="flex items-center gap-2.5">
          <button id="btn-host-mic-quick" class="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${voiceBroadcast.isMicActive ? 'bg-rose-600 text-white border-rose-700 shadow-md animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'}" title="Canlı Mikrofonu Aç/Kapat">
            <i class="fa-solid ${voiceBroadcast.isMicActive ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
            <span class="hidden sm:inline">${voiceBroadcast.isMicActive ? 'Mikrofon Açık' : 'Mikrofon'}</span>
          </button>

          <button id="btn-next-question" class="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-brand font-black px-6 py-3 rounded-2xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-2 text-base cursor-pointer">
            <span>${summary.isLastQuestion ? '🏆 Podyuma Geç' : 'Sonraki Soru'}</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-6">
        <!-- Sol: Yanıt Dağılımı -->
        <div class="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium flex flex-col justify-between">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i class="fa-solid fa-chart-column text-indigo-600"></i>
            <span>Yanıt Dağılımı ve Doğru Cevap</span>
          </h3>

          ${renderSummaryStatsByType(summary, q)}

          <div class="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-700">
            <span class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
              <i class="fa-solid fa-check"></i>
            </span>
            <div>
              <span class="font-semibold text-slate-500 block">Doğru Yanıt:</span>
              <strong class="text-emerald-700 text-sm">${summary.humanReadableCorrect}</strong>
            </div>
          </div>
        </div>

        <!-- Sağ: Liderlik Tablosu -->
        <div class="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium">
          <h3 class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i class="fa-solid fa-trophy text-amber-500"></i>
            <span>İlk 5 Liderlik Tablosu</span>
          </h3>

          <div class="space-y-3">
            ${summary.leaderboard.length === 0 ? `
              <div class="text-center py-10 text-slate-400 text-sm">Henüz puan kazanan olmadı.</div>
            ` : summary.leaderboard.map((item, idx) => {
              const rankBgs = ['bg-amber-400 text-slate-900', 'bg-slate-200 text-slate-800', 'bg-amber-700 text-white'];
              return `
                <div class="bg-slate-50 rounded-2xl p-3.5 flex items-center justify-between border border-slate-200/60 shadow-sm animate-pop-in">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl ${rankBgs[idx] || 'bg-slate-200 text-slate-700'} font-brand font-black flex items-center justify-center text-sm shadow-sm">
                      ${item.rank}
                    </span>
                    <span class="text-2xl">${item.avatar}</span>
                    <div>
                      <span class="font-bold text-slate-900 block text-sm sm:text-base">${item.nickname}</span>
                      ${item.streak > 1 ? `
                        <span class="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <i class="fa-solid fa-fire text-amber-500"></i> ${item.streak} Seri!
                        </span>
                      ` : ''}
                    </div>
                  </div>

                  <div class="text-right">
                    <span class="font-brand font-black text-base sm:text-lg text-slate-900">${item.score} P</span>
                    ${item.lastEarned > 0 ? `
                      <span class="text-[10px] text-emerald-600 block font-bold">+${item.lastEarned}</span>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSummaryStatsByType(summary, q) {
  const type = summary.questionType || 'multiple';

  if (type === 'fill_blank') {
    const list = summary.textAnswersSummary || [];
    if (list.length === 0) {
      return `<div class="py-12 text-center text-slate-400 text-sm">Hiç cevap gelmedi.</div>`;
    }

    return `
      <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
        ${list.map(item => `
          <div class="flex items-center justify-between p-2.5 rounded-xl border ${item.isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}">
            <span class="font-bold text-sm">"${item.text}"</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-md ${item.isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}">
              ${item.isCorrect ? 'Doğru' : 'Yanlış'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }

  const maxCount = Math.max(...summary.optionCounts, 1);
  return `
    <div class="flex items-end justify-around gap-3 h-52 pb-4 border-b border-slate-100">
      ${summary.optionCounts.map((count, idx) => {
        const style = KAHOOT_OPTIONS[idx % KAHOOT_OPTIONS.length];
        let isCorrect = false;
        if (type === 'multiselect') {
          isCorrect = Array.isArray(summary.correctOption) && summary.correctOption.includes(idx);
        } else {
          isCorrect = (idx === parseInt(summary.correctOption));
        }

        const heightPct = Math.round((count / maxCount) * 100);

        return `
          <div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <span class="text-sm font-black text-slate-800 ${count > 0 ? 'bg-slate-100 px-2 py-0.5 rounded-md' : 'opacity-30'}">
              ${count}
            </span>
            
            <div class="w-full max-w-[56px] rounded-t-xl transition-all duration-700 relative ${style.color} ${isCorrect ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-white' : 'opacity-80'}" style="height: ${Math.max(heightPct, 12)}%">
              ${isCorrect ? `
                <span class="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md">
                  <i class="fa-solid fa-check"></i>
                </span>
              ` : ''}
            </div>

            <span class="w-8 h-8 rounded-lg ${style.color} text-white flex items-center justify-center text-xs font-bold shadow-sm">
              <i class="${style.icon}"></i>
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// H. SUNUCU / TAHTA FİNAL PODYUMU (HOST PODIUM)
// Tam Ekran, Teatral Spor Işıklar, 3D Basamaklar ve Adım Adım Açılış
// ----------------------------------------------------
let podiumTimers = [];

function clearPodiumTimers() {
  podiumTimers.forEach(t => clearTimeout(t));
  podiumTimers = [];
}

function renderHostPodiumView() {
  const podium = state.hostGame.podium;
  if (!podium) return '';

  const { first, second, third, allPlayers } = podium;
  const runnersUp = (allPlayers || []).slice(3, 5);
  const step = state.hostGame.podiumStep || 0;
  const quizTitle = state.hostGame.quizTitle || 'QuizLem';

  let statusText = 'Ve Büyük Final Başlıyor... ✨';
  if (step === 1) statusText = third ? `🥉 3. Sıra: ${third.nickname}!` : '3. Sıra Kürsüde!';
  else if (step === 2) statusText = second ? `🥈 2. Sıra: ${second.nickname}!` : '2. Sıra Kürsüde!';
  else if (step === 3) statusText = '🥁 Ve Büyük Şampiyon Geliyor!...';
  else if (step >= 4) statusText = first ? `🏆 BÜYÜK ŞAMPİYON: ${first.nickname}! 🏆` : '🏆 TEBRİKLER ŞAMPİYONLAR! 🏆';

  return `
    <div class="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#060814] via-[#0d122b] to-[#04060f] text-white flex flex-col justify-between select-none">
      
      <!-- Üst Bar / Durum ve Butonlar -->
      <header class="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 text-lg shadow-glow-amber">
            <i class="fa-solid fa-trophy"></i>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">Şampiyonlar Kürsüsü</span>
            <h2 class="text-xs sm:text-base font-bold text-white truncate max-w-[140px] sm:max-w-md">${quizTitle}</h2>
          </div>
        </div>

        <!-- Başlık ve Durum Bildirimi -->
        <div id="podium-status-badge" class="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/15 text-xs font-bold text-slate-200 shadow-inner">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span id="podium-status-title">${statusText}</span>
        </div>

        <!-- Aksiyon Butonları -->
        <div class="flex items-center gap-2 sm:gap-2.5">
          <button id="btn-skip-podium" class="${step >= 4 ? 'hidden' : 'flex'} items-center gap-1.5 sm:gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 transition-all cursor-pointer">
            <i class="fa-solid fa-forward-fast text-amber-400"></i>
            <span class="hidden sm:inline">Hepsini Göster</span>
            <span class="sm:hidden">Atla</span>
          </button>

          <button id="btn-replay-podium" class="${step >= 4 ? 'flex' : 'hidden'} items-center gap-1.5 sm:gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 transition-all cursor-pointer">
            <i class="fa-solid fa-arrow-rotate-right text-indigo-400"></i>
            <span class="hidden sm:inline">Tekrar Oynat</span>
          </button>

          <button id="btn-podium-view-report" class="${step >= 4 ? 'flex' : 'hidden'} items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer">
            <i class="fa-solid fa-chart-pie"></i>
            <span>Raporu İncele</span>
          </button>

          <button id="btn-finish-to-dashboard" class="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer">
            <i class="fa-solid fa-house"></i>
            <span>Panele Dön</span>
          </button>
        </div>
      </header>

      <!-- Spor Işıklar (Volumetric Theatrical Spotlights) -->
      <div class="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <!-- Sol Spot: 3. Sıraya Odaklı -->
        <div id="spotlight-left" class="absolute inset-0 spotlight-beam-left transition-opacity duration-700 ${step >= 1 ? 'opacity-85' : 'opacity-15'}"></div>

        <!-- Sağ Spot: 2. Sıraya Odaklı -->
        <div id="spotlight-right" class="absolute inset-0 spotlight-beam-right transition-opacity duration-700 ${step >= 2 ? 'opacity-85' : 'opacity-15'}"></div>

        <!-- Merkez Altın Spot: 1. Sıraya Odaklı -->
        <div id="spotlight-center" class="absolute inset-0 spotlight-beam-center transition-opacity duration-700 ${step >= 3 ? (step >= 4 ? 'opacity-95' : 'opacity-70') : 'opacity-10'}"></div>

        <!-- Sahne Tabanı Işık Haresi (Glow Floor) -->
        <div class="stage-floor-glow absolute bottom-0 left-0 right-0 h-80"></div>
      </div>

      <!-- Ana Sahne Alanı: 3D Podyum Basamakları -->
      <main class="relative z-20 flex-1 flex flex-col justify-end items-center px-2 sm:px-4 pb-3 sm:pb-6 w-full max-w-7xl 2xl:max-w-[1750px] mx-auto">
        
        <!-- Mobil Ekranlar İçin Durum Başlığı -->
        <div class="sm:hidden mb-2 bg-white/10 px-3.5 py-1 rounded-full border border-white/15 text-[11px] font-bold text-slate-200">
          <span id="podium-status-title-mobile">${statusText}</span>
        </div>

        <!-- 3D Podyum Gövdesi (Soldan Sağa: 2, 1, 3) -->
        <div class="flex items-end justify-center gap-2 sm:gap-6 md:gap-10 2xl:gap-16 w-full max-w-4xl lg:max-w-5xl 2xl:max-w-6xl px-2">
          
          <!-- 2. SIRA (GÜMÜŞ) -->
          <div class="flex-1 max-w-[190px] sm:max-w-[220px] 2xl:max-w-[270px] flex flex-col items-center">
            <!-- Oyuncu Bilgileri & Avatar -->
            <div id="podium-avatar-2" class="mb-2.5 sm:mb-3 text-center transition-all duration-700 ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}">
              ${second ? `
                <div class="relative inline-block mb-1">
                  <div class="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-slate-200 via-slate-400 to-slate-600 p-0.5 shadow-[0_0_25px_rgba(203,213,225,0.4)] flex items-center justify-center text-2xl sm:text-4xl bg-slate-800">
                    <span>${second.avatar}</span>
                  </div>
                  <div class="absolute -bottom-1 -right-1 bg-slate-700 border-2 border-slate-300 text-slate-100 text-[9px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow">
                    2.
                  </div>
                </div>
                <h3 class="font-brand font-black text-xs sm:text-base text-slate-100 truncate max-w-[95px] sm:max-w-[160px] drop-shadow-md">
                  ${second.nickname}
                </h3>
                <span class="inline-block mt-0.5 text-[9px] sm:text-xs font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700">
                  ${second.score} P
                </span>
              ` : `
                <div class="text-slate-500 text-xs py-2 italic">Boş</div>
              `}
            </div>

            <!-- 3D Gümüş Basamak -->
            <div id="podium-col-2" class="w-full transition-all duration-700 ease-out transform ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0 pointer-events-none'}">
              <!-- 3D Üst Kapak -->
              <div class="pedestal-silver-top rounded-[50%] h-8 sm:h-12 -mb-4 sm:-mb-6 relative z-10 mx-1 flex items-center justify-center">
                <span class="text-[8px] sm:text-[10px] uppercase font-black tracking-wider text-slate-700">GÜMÜŞ</span>
              </div>
              <!-- 3D Ön Yüz -->
              <div class="pedestal-silver-face w-full rounded-b-2xl sm:rounded-b-3xl h-36 sm:h-52 pt-5 sm:pt-8 pb-3 sm:pb-4 flex flex-col items-center justify-between text-white">
                <div class="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-slate-100 text-sm sm:text-lg shadow-inner">
                  <i class="fa-solid fa-medal"></i>
                </div>
                <span class="font-brand font-black text-3xl sm:text-6xl text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  2
                </span>
                <div class="w-6 sm:w-8 h-1 bg-white/30 rounded-full"></div>
              </div>
              <!-- Zemin Gölgesi -->
              <div class="w-3/4 h-2.5 sm:h-3 bg-black/60 rounded-full blur-md mx-auto mt-2"></div>
            </div>
          </div>

          <!-- 1. SIRA (ALTIN - ŞAMPİYON) -->
          <div class="flex-1 max-w-[210px] sm:max-w-[260px] 2xl:max-w-[320px] flex flex-col items-center relative z-20">
            <!-- Oyuncu Bilgileri, Avatar ve Düşen Taç -->
            <div id="podium-avatar-1" class="mb-2.5 sm:mb-3 text-center transition-all duration-700 ${step >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}">
              ${first ? `
                <div class="relative inline-block mb-1">
                  <!-- Havadan Düşen Altın Taç -->
                  <div id="podium-crown" class="text-3xl sm:text-5xl mb-0.5 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.9)] ${step >= 4 ? 'animate-crown-drop' : 'opacity-0'}">
                    👑
                  </div>
                  <div class="w-16 h-16 sm:w-26 sm:h-26 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 p-0.5 sm:p-1 shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center justify-center text-3xl sm:text-5xl bg-slate-900 border-2 border-yellow-200">
                    <span>${first.avatar}</span>
                  </div>
                  <div class="absolute -bottom-1 sm:-bottom-1.5 -right-1 bg-gradient-to-r from-amber-500 to-yellow-500 border-2 border-white text-slate-950 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-lg">
                    1. 🏆
                  </div>
                </div>
                <h3 class="font-brand font-black text-xs sm:text-lg text-yellow-300 truncate max-w-[110px] sm:max-w-[190px] drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                  ${first.nickname}
                </h3>
                <span class="inline-block mt-0.5 text-[10px] sm:text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 px-2.5 py-0.5 rounded-full shadow-lg border border-yellow-100">
                  ${first.score} P
                </span>
              ` : `
                <div class="text-slate-500 text-xs py-2 italic">Boş</div>
              `}
            </div>

            <!-- 3D Altın Basamak -->
            <div id="podium-col-1" class="w-full transition-all duration-700 ease-out transform ${step >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0 pointer-events-none'}">
              <!-- 3D Üst Kapak -->
              <div class="pedestal-gold-top rounded-[50%] h-10 sm:h-14 -mb-5 sm:-mb-7 relative z-10 mx-1 flex items-center justify-center">
                <span class="text-[9px] sm:text-xs uppercase font-black tracking-wider text-amber-950">ŞAMPİYON</span>
              </div>
              <!-- 3D Ön Yüz -->
              <div class="pedestal-gold-face w-full rounded-b-2xl sm:rounded-b-3xl h-48 sm:h-72 pt-6 sm:pt-9 pb-4 sm:pb-5 flex flex-col items-center justify-between text-white">
                <div class="w-9 h-9 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-amber-950/30 border border-amber-300/40 flex items-center justify-center text-yellow-200 text-lg sm:text-2xl shadow-inner">
                  <i class="fa-solid fa-trophy"></i>
                </div>
                <span class="font-brand font-black text-4xl sm:text-7xl text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]">
                  1
                </span>
                <div class="w-8 sm:w-12 h-1 sm:h-1.5 bg-yellow-200/40 rounded-full"></div>
              </div>
              <!-- Zemin Gölgesi -->
              <div class="w-4/5 h-3 sm:h-4 bg-amber-900/60 rounded-full blur-lg mx-auto mt-2"></div>
            </div>
          </div>

          <!-- 3. SIRA (BRONZ) -->
          <div class="flex-1 max-w-[190px] sm:max-w-[220px] 2xl:max-w-[270px] flex flex-col items-center">
            <!-- Oyuncu Bilgileri & Avatar -->
            <div id="podium-avatar-3" class="mb-2.5 sm:mb-3 text-center transition-all duration-700 ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}">
              ${third ? `
                <div class="relative inline-block mb-1">
                  <div class="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-orange-400 via-amber-600 to-amber-900 p-0.5 shadow-[0_0_25px_rgba(249,115,22,0.4)] flex items-center justify-center text-2xl sm:text-4xl bg-slate-900">
                    <span>${third.avatar}</span>
                  </div>
                  <div class="absolute -bottom-1 -right-1 bg-amber-800 border-2 border-orange-300 text-orange-100 text-[9px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow">
                    3.
                  </div>
                </div>
                <h3 class="font-brand font-black text-xs sm:text-base text-orange-200 truncate max-w-[95px] sm:max-w-[160px] drop-shadow-md">
                  ${third.nickname}
                </h3>
                <span class="inline-block mt-0.5 text-[9px] sm:text-xs font-bold text-orange-300 bg-slate-900/80 px-2 py-0.5 rounded-full border border-orange-800">
                  ${third.score} P
                </span>
              ` : `
                <div class="text-slate-500 text-xs py-2 italic">Boş</div>
              `}
            </div>

            <!-- 3D Bronz Basamak -->
            <div id="podium-col-3" class="w-full transition-all duration-700 ease-out transform ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0 pointer-events-none'}">
              <!-- 3D Üst Kapak -->
              <div class="pedestal-bronze-top rounded-[50%] h-8 sm:h-10 -mb-4 sm:-mb-5 relative z-10 mx-1 flex items-center justify-center">
                <span class="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-amber-950">BRONZ</span>
              </div>
              <!-- 3D Ön Yüz -->
              <div class="pedestal-bronze-face w-full rounded-b-2xl sm:rounded-b-3xl h-28 sm:h-40 pt-4 sm:pt-6 pb-2.5 sm:pb-3 flex flex-col items-center justify-between text-white">
                <div class="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-black/20 border border-orange-300/40 flex items-center justify-center text-orange-100 text-xs sm:text-base shadow-inner">
                  <i class="fa-solid fa-award"></i>
                </div>
                <span class="font-brand font-black text-2xl sm:text-5xl text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  3
                </span>
                <div class="w-6 sm:w-8 h-1 bg-white/20 rounded-full"></div>
              </div>
              <!-- Zemin Gölgesi -->
              <div class="w-3/4 h-2.5 sm:h-3 bg-black/60 rounded-full blur-md mx-auto mt-2"></div>
            </div>
          </div>

        </div>

        <!-- 4. ve 5. Dereceler (Onur Kürsüsü / Runners Up) -->
        <div id="podium-runners-up" class="w-full max-w-md 2xl:max-w-xl mt-4 sm:mt-6 transition-all duration-700 ${step >= 4 && runnersUp.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}">
          <div class="bg-slate-900/70 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 shadow-xl flex items-center justify-around gap-2">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Onur Listesi:</span>
            ${runnersUp.map(p => `
              <div class="flex items-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/10 transition-all">
                <span class="text-xs font-black text-indigo-400">${p.rank}.</span>
                <span class="text-base sm:text-lg">${p.avatar}</span>
                <span class="text-[11px] sm:text-xs font-bold text-slate-200 truncate max-w-[70px] sm:max-w-[100px]">${p.nickname}</span>
                <span class="text-[10px] sm:text-[11px] font-brand font-bold text-slate-400">${p.score}P</span>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

function setPodiumStep(step) {
  state.hostGame.podiumStep = step;

  const podium = state.hostGame.podium || {};
  const { first, second, third } = podium;

  // Başlık bildirimlerini güncelle
  const titleEl = document.getElementById('podium-status-title');
  const titleMobileEl = document.getElementById('podium-status-title-mobile');
  let titleText = 'Ve Büyük Final Başlıyor... ✨';

  if (step === 0) titleText = 'Ve Büyük Final Başlıyor... ✨';
  else if (step === 1) titleText = third ? `🥉 3. Sıra: ${third.nickname}!` : '3. Sıra Kürsüde!';
  else if (step === 2) titleText = second ? `🥈 2. Sıra: ${second.nickname}!` : '2. Sıra Kürsüde!';
  else if (step === 3) titleText = '🥁 Ve Büyük Şampiyon Geliyor!...';
  else if (step >= 4) titleText = first ? `🏆 BÜYÜK ŞAMPİYON: ${first.nickname}! 🏆` : '🏆 TEBRİKLER ŞAMPİYONLAR! 🏆';

  if (titleEl) titleEl.innerText = titleText;
  if (titleMobileEl) titleMobileEl.innerText = titleText;

  // Spot ışıklar
  const spotLeft = document.getElementById('spotlight-left');
  const spotRight = document.getElementById('spotlight-right');
  const spotCenter = document.getElementById('spotlight-center');

  if (spotLeft) spotLeft.className = `absolute inset-0 spotlight-beam-left transition-opacity duration-700 ${step >= 1 ? 'opacity-85' : 'opacity-15'}`;
  if (spotRight) spotRight.className = `absolute inset-0 spotlight-beam-right transition-opacity duration-700 ${step >= 2 ? 'opacity-85' : 'opacity-15'}`;
  if (spotCenter) spotCenter.className = `absolute inset-0 spotlight-beam-center transition-opacity duration-700 ${step >= 3 ? (step >= 4 ? 'opacity-95' : 'opacity-70') : 'opacity-10'}`;

  // 3. Sıra Basamak ve Avatar
  const col3 = document.getElementById('podium-col-3');
  const av3 = document.getElementById('podium-avatar-3');
  if (col3) {
    if (step >= 1) {
      col3.classList.remove('translate-y-[140%]', 'opacity-0', 'pointer-events-none');
      col3.classList.add('translate-y-0', 'opacity-100');
    } else {
      col3.classList.add('translate-y-[140%]', 'opacity-0', 'pointer-events-none');
      col3.classList.remove('translate-y-0', 'opacity-100');
    }
  }
  if (av3) {
    if (step >= 1) {
      av3.classList.remove('translate-y-12', 'opacity-0');
      av3.classList.add('translate-y-0', 'opacity-100');
    } else {
      av3.classList.add('translate-y-12', 'opacity-0');
      av3.classList.remove('translate-y-0', 'opacity-100');
    }
  }

  // 2. Sıra Basamak ve Avatar
  const col2 = document.getElementById('podium-col-2');
  const av2 = document.getElementById('podium-avatar-2');
  if (col2) {
    if (step >= 2) {
      col2.classList.remove('translate-y-[140%]', 'opacity-0', 'pointer-events-none');
      col2.classList.add('translate-y-0', 'opacity-100');
    } else {
      col2.classList.add('translate-y-[140%]', 'opacity-0', 'pointer-events-none');
      col2.classList.remove('translate-y-0', 'opacity-100');
    }
  }
  if (av2) {
    if (step >= 2) {
      av2.classList.remove('translate-y-12', 'opacity-0');
      av2.classList.add('translate-y-0', 'opacity-100');
    } else {
      av2.classList.add('translate-y-12', 'opacity-0');
      av2.classList.remove('translate-y-0', 'opacity-100');
    }
  }

  // 1. Sıra Basamak, Avatar ve Taç
  const col1 = document.getElementById('podium-col-1');
  const av1 = document.getElementById('podium-avatar-1');
  const crown = document.getElementById('podium-crown');
  if (col1) {
    if (step >= 4) {
      col1.classList.remove('translate-y-[140%]', 'opacity-0', 'pointer-events-none');
      col1.classList.add('translate-y-0', 'opacity-100');
    } else {
      col1.classList.add('translate-y-[140%]', 'opacity-0', 'pointer-events-none');
      col1.classList.remove('translate-y-0', 'opacity-100');
    }
  }
  if (av1) {
    if (step >= 4) {
      av1.classList.remove('translate-y-12', 'opacity-0');
      av1.classList.add('translate-y-0', 'opacity-100');
    } else {
      av1.classList.add('translate-y-12', 'opacity-0');
      av1.classList.remove('translate-y-0', 'opacity-100');
    }
  }
  if (crown) {
    if (step >= 4) {
      crown.classList.remove('opacity-0');
      crown.classList.add('animate-crown-drop');
    } else {
      crown.classList.add('opacity-0');
      crown.classList.remove('animate-crown-drop');
    }
  }

  // Runners-up
  const runnersUpEl = document.getElementById('podium-runners-up');
  if (runnersUpEl) {
    if (step >= 4) {
      runnersUpEl.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
      runnersUpEl.classList.add('opacity-100', 'translate-y-0');
    } else {
      runnersUpEl.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
      runnersUpEl.classList.remove('opacity-100', 'translate-y-0');
    }
  }

  // Butonlar
  const btnSkip = document.getElementById('btn-skip-podium');
  const btnReplay = document.getElementById('btn-replay-podium');
  const btnPodiumReport = document.getElementById('btn-podium-view-report');
  if (btnSkip) {
    if (step >= 4) btnSkip.classList.add('hidden');
    else btnSkip.classList.remove('hidden');
  }
  if (btnReplay) {
    if (step >= 4) btnReplay.classList.remove('hidden');
    else btnReplay.classList.add('hidden');
  }
  if (btnPodiumReport) {
    if (step >= 4) btnPodiumReport.classList.remove('hidden');
    else btnPodiumReport.classList.add('hidden');
  }
}

function startHostPodiumChoreography() {
  clearPodiumTimers();
  setPodiumStep(0);

  const podium = state.hostGame.podium || {};
  const has3rd = !!podium.third;
  const has2nd = !!podium.second;
  const has1st = !!podium.first;

  let cumulativeTime = 1200;

  // 1. Aşama: 3. Sıra Açılışı
  if (has3rd) {
    const t1 = setTimeout(() => {
      setPodiumStep(1);
      sound.playRiser();
    }, cumulativeTime);
    podiumTimers.push(t1);
    cumulativeTime += 2600;
  }

  // 2. Aşama: 2. Sıra Açılışı
  if (has2nd) {
    const t2 = setTimeout(() => {
      setPodiumStep(2);
      sound.playRiser();
    }, cumulativeTime);
    podiumTimers.push(t2);
    cumulativeTime += 2600;
  }

  // 3. Aşama: 1. Sıra Öncesi Davul Sesi (Drumroll)
  if (has1st) {
    const t3 = setTimeout(() => {
      setPodiumStep(3);
      sound.playDrumroll(1.8);
    }, cumulativeTime);
    podiumTimers.push(t3);
    cumulativeTime += 1800;

    // 4. Aşama: Şampiyonun Zirveye Yükselişi, Taç Düşüşü & Konfeti
    const t4 = setTimeout(() => {
      setPodiumStep(4);
      sound.playCrownDrop();
      sound.playFanfare();
      triggerConfetti();
    }, cumulativeTime);
    podiumTimers.push(t4);
  } else {
    const tEnd = setTimeout(() => {
      setPodiumStep(4);
    }, cumulativeTime);
    podiumTimers.push(tEnd);
  }
}

function skipHostPodiumChoreography() {
  clearPodiumTimers();
  setPodiumStep(4);
  sound.playFanfare();
  triggerConfetti();
}

function renderStudentVoiceBanner() {
  const v = state.student && state.student.voice;
  if (!v || !v.isBroadcasting) return '';

  return `
    <div class="w-full my-2.5 px-3.5 py-2.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-2xl flex flex-col gap-2 shadow-md border border-purple-700/50 animate-pop-in">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <span class="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
            <i class="fa-solid fa-tower-broadcast text-purple-300"></i>
            <span>Öğretmen Yayında</span>
            ${v.connected ? `
              <span class="text-[10px] bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <i class="fa-solid fa-circle-check text-[9px]"></i> SES BAĞLANDI
              </span>
            ` : `
              <span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <i class="fa-solid fa-spinner fa-spin text-[9px]"></i> ${v.iceState === 'failed' ? 'Yeniden Bağlanıyor...' : (v.iceState || 'Bağlanıyor...')}
              </span>
            `}
            <span class="text-[9px] text-white/40 font-mono">v2.5.7</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          ${v.needClick ? `
            <button type="button" id="btn-student-unblock-audio" class="text-xs px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black animate-bounce shadow-lg flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-volume-high"></i>
              <span>Sesi Aç (Dokun)</span>
            </button>
          ` : `
            <button type="button" id="btn-student-toggle-mute" class="text-xs px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all cursor-pointer">
              <i class="fa-solid ${voiceReceiver.isMuted ? 'fa-volume-xmark text-rose-300' : 'fa-volume-high text-emerald-300'}"></i>
            </button>
            <input type="range" id="input-student-volume" min="0" max="1" step="0.05" value="${voiceReceiver.volume}" class="w-16 accent-indigo-400 cursor-pointer" />
          `}
        </div>
      </div>

      <!-- Öğrenci Gelen Ses Şiddeti Barı (VU Meter) -->
      ${v.connected ? `
        <div class="w-full pt-1.5 border-t border-purple-800/40 flex items-center justify-between gap-2 text-[10px]">
          <span class="flex items-center gap-1.5 text-purple-200 font-bold">
            <i class="fa-solid fa-volume-high text-emerald-400"></i>
            <span>Gelen Ses Sinyali:</span>
            <span id="student-voice-incoming-text" class="font-mono text-emerald-300 font-bold">%0</span>
          </span>
          <div class="flex-1 max-w-[140px] h-2 bg-purple-950 rounded-full overflow-hidden border border-purple-700/50 p-0.5">
            <div id="student-voice-incoming-bar" class="h-full bg-emerald-400 transition-all duration-75 rounded-full" style="width: 0%;"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ----------------------------------------------------
// I. ÖĞRENCİ LOBİ EKRANI (STUDENT LOBBY)
// ----------------------------------------------------
function renderStudentLobbyView() {
  const s = state.student;

  return `
    <div class="flex-1 flex flex-col justify-between items-center p-6 max-w-md mx-auto w-full text-center">
      <div class="pt-4 w-full">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full">
          PIN: ${s.pin}
        </span>
        <h2 class="text-xl font-bold text-slate-900 mt-2.5">${s.quizTitle || 'QuizLem'}</h2>

        <!-- Öğretmen Canlı Ses Yayını Banner'ı -->
        ${renderStudentVoiceBanner()}
      </div>

      <div class="my-auto py-8">
        <div class="w-28 h-28 mx-auto rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-6xl shadow-premium mb-4 animate-bounce-short">
          ${s.avatar}
        </div>
        <h1 class="text-2xl font-brand font-black text-slate-900 mb-1.5">${s.nickname}</h1>
        <p class="text-xs text-emerald-600 font-bold mb-6 flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-circle-check"></i>
          <span>Yarışmaya Katıldın!</span>
        </p>

        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-premium animate-pulse-subtle">
          <i class="fa-solid fa-tv text-2xl text-indigo-600 mb-2 block"></i>
          <p class="text-xs text-slate-600 font-medium leading-relaxed">
            Öğretmeninizin ana ekrandan yarışmayı başlatması bekleniyor...
          </p>
        </div>
      </div>

      <div class="text-xs text-slate-400 font-medium pb-2">
        QuizLem &bull; Mobilden Cevapla
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// J. ÖĞRENCİ CEVAPLAMA EKRANI (STUDENT ANSWER)
// ----------------------------------------------------
function renderStudentAnswerView() {
  const q = state.student.currentQuestion;
  const hasAnswered = state.student.hasAnswered;
  const timer = state.student.timer;
  const qType = q ? (q.questionType || 'multiple') : 'multiple';

  if (hasAnswered) {
    return `
      <div class="flex-1 flex flex-col justify-between items-center p-6 max-w-md mx-auto w-full text-center">
        <div class="pt-4 flex items-center justify-between w-full">
          <span class="text-xs font-bold text-slate-500">Soru ${q.questionIndex + 1}</span>
          <span id="student-timer-display" class="font-brand font-black text-xl text-indigo-600">${timer.timeLeft}s</span>
        </div>

        <div class="my-auto py-8">
          <div class="w-24 h-24 mx-auto rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-4xl shadow-xl mb-6 animate-pop-in">
            <i class="fa-solid fa-check"></i>
          </div>
          <h2 class="text-2xl font-brand font-black text-slate-900 mb-1.5">Cevabın Alındı!</h2>
          <p class="text-xs text-slate-500">Diğer yarışmacılar ve sürenin bitmesi bekleniyor...</p>
          <div class="mt-6 inline-block">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i>
          </div>
        </div>

        <div class="text-xs text-slate-400 pb-2">
          Cevap kilitlendi
        </div>
      </div>
    `;
  }

  if (qType === 'fill_blank') {
    return `
      <div class="flex-1 flex flex-col justify-between p-4 max-w-md mx-auto w-full">
        <div class="flex items-center justify-between px-2 py-1 mb-2">
          <span class="text-xs font-bold uppercase text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            Soru ${q.questionIndex + 1} &bull; Boşluk Doldurma
          </span>
          <div class="flex items-center gap-1.5 font-brand font-black text-2xl text-indigo-600">
            <i class="fa-solid fa-stopwatch text-base"></i>
            <span id="student-timer-display">${timer.timeLeft}</span>
          </div>
        </div>

        <form id="form-student-fill-blank" class="my-auto py-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-premium space-y-4">
          <div class="text-center mb-2">
            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-2 border border-amber-200">
              <i class="fa-solid fa-pen-nib"></i>
            </div>
            <h3 class="font-bold text-slate-800 text-base">Cevabını Yaz</h3>
            <p class="text-xs text-slate-500">Tahtadaki soruya göre cevabını yazıp gönder</p>
          </div>

          <input 
            type="text" 
            id="input-student-blank" 
            placeholder="Cevabını buraya yaz..." 
            autocomplete="off" 
            autofocus
            required
            class="w-full text-center text-xl font-bold py-3.5 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />

          <button 
            type="submit" 
            class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-brand font-black text-lg py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer"
          >
            <span>Cevabı Gönder</span>
          </button>
        </form>

        <div class="text-center text-xs text-slate-400">
          Yazım ve imla hatalarına dikkat edin
        </div>
      </div>
    `;
  }

  if (qType === 'order') {
    const items = state.student.orderItems || [];

    return `
      <div class="flex-1 flex flex-col justify-between p-3 max-w-md mx-auto w-full">
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-xs font-bold uppercase text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            Soru ${q.questionIndex + 1} &bull; Sıralama
          </span>
          <div class="flex items-center gap-1.5 font-brand font-black text-2xl text-indigo-600">
            <i class="fa-solid fa-stopwatch text-base"></i>
            <span id="student-timer-display">${timer.timeLeft}</span>
          </div>
        </div>

        <div class="my-auto py-2 space-y-2">
          <p class="text-xs text-center text-slate-500 font-medium mb-1">
            Ok tuşlarını kullanarak maddeleri doğru sıraya dizin:
          </p>
          
          <div class="space-y-2" id="student-order-list">
            ${items.map((item, idx) => `
              <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 animate-pop-in">
                <div class="flex items-center gap-2.5 flex-1 min-w-0">
                  <span class="w-8 h-8 rounded-xl bg-purple-600 text-white font-brand font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    ${idx + 1}
                  </span>
                  <span class="font-bold text-slate-800 text-sm truncate">${item.text}</span>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" data-move-up="${idx}" class="btn-move-order w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}">
                    <i class="fa-solid fa-arrow-up"></i>
                  </button>
                  <button type="button" data-move-down="${idx}" class="btn-move-order w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs ${idx === items.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}">
                    <i class="fa-solid fa-arrow-down"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <button 
            type="button" 
            id="btn-confirm-order" 
            class="w-full mt-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-brand font-black text-lg py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer"
          >
            <span>✓ Sıralamayı Onayla</span>
          </button>
        </div>

        <div class="text-center text-xs text-slate-400">
          Doğru sıralamayı yaptıktan sonra onayla butonuna basın
        </div>
      </div>
    `;
  }

  if (qType === 'multiselect') {
    const selected = state.student.selectedIndices || [];

    return `
      <div class="flex-1 flex flex-col justify-between p-3 max-w-md mx-auto w-full touch-action-manipulation">
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-xs font-bold uppercase text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            Soru ${q.questionIndex + 1} &bull; Çoklu Seçim
          </span>
          <div class="flex items-center gap-1.5 font-brand font-black text-2xl text-indigo-600">
            <i class="fa-solid fa-stopwatch text-base"></i>
            <span id="student-timer-display">${timer.timeLeft}</span>
          </div>
        </div>

        <div class="flex-1 grid grid-cols-2 grid-rows-2 gap-3 py-2">
          ${[0, 1, 2, 3].map(idx => {
            const style = KAHOOT_OPTIONS[idx];
            const isChecked = selected.includes(idx);

            const optText = (q.options && q.options[idx]) ? q.options[idx] : null;

            return `
              <button 
                type="button" 
                data-toggle-option="${idx}" 
                class="btn-toggle-multiselect ${style.color} rounded-3xl flex flex-col items-center justify-center p-2.5 text-white relative active:scale-95 transition-transform duration-100 border-4 ${isChecked ? 'border-white ring-4 ring-emerald-400' : 'border-white/30'} text-center"
              >
                <span class="${optText ? 'text-3xl sm:text-4xl mb-1' : 'text-5xl sm:text-6xl mb-1'} drop-shadow-lg">
                  <i class="${style.icon}"></i>
                </span>
                ${optText ? `
                  <span class="font-brand font-bold text-xs sm:text-sm line-clamp-2 px-1 text-white/95 leading-tight">${optText}</span>
                ` : ''}
                ${isChecked ? `
                  <span class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center text-sm font-black shadow-md">
                    <i class="fa-solid fa-check"></i>
                  </span>
                ` : ''}
              </button>
            `;
          }).join('')}
        </div>

        <div class="pt-2">
          <button 
            type="button" 
            id="btn-submit-multiselect" 
            ${selected.length === 0 ? 'disabled' : ''}
            class="w-full py-3.5 rounded-2xl font-brand font-black text-lg transition-all shadow-lg ${selected.length > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white active:scale-98 shadow-emerald-500/25 cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}"
          >
            <span>✓ Seçimleri Gönder (${selected.length} Seçildi)</span>
          </button>
        </div>
      </div>
    `;
  }

  if (qType === 'image_choice' && q.imageOptions) {
    return `
      <div class="flex-1 flex flex-col justify-between p-3 max-w-md mx-auto w-full touch-action-manipulation">
        <div class="flex items-center justify-between px-2 py-1 mb-1">
          <span class="text-xs font-bold uppercase text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            Soru ${q.questionIndex + 1} &bull; Görsel Seçimi
          </span>
          <div class="flex items-center gap-1.5 font-brand font-black text-2xl text-indigo-600">
            <i class="fa-solid fa-stopwatch text-base"></i>
            <span id="student-timer-display">${timer.timeLeft}</span>
          </div>
        </div>

        <div class="flex-1 grid grid-cols-2 grid-rows-2 gap-3 py-2">
          ${q.imageOptions.map((opt, idx) => {
            const style = KAHOOT_OPTIONS[idx];
            const imgUrl = (typeof opt === 'object') ? opt.image : '';
            const textLabel = (typeof opt === 'object') ? opt.text : opt;

            return `
              <button 
                type="button" 
                data-student-option="${idx}" 
                class="btn-submit-answer rounded-3xl overflow-hidden relative border-4 border-white shadow-md active:scale-95 transition-transform flex flex-col justify-between bg-slate-100 text-left"
              >
                <div class="flex-1 w-full bg-slate-200 overflow-hidden relative">
                  ${imgUrl ? `
                    <img src="${imgUrl}" alt="${textLabel}" class="w-full h-full object-cover" />
                  ` : `
                    <div class="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">Görsel</div>
                  `}
                  <span class="absolute top-2 left-2 w-8 h-8 rounded-xl ${style.color} text-white flex items-center justify-center font-bold text-xs shadow">
                    <i class="${style.icon}"></i>
                  </span>
                </div>
                <div class="p-2 bg-white text-center font-bold text-slate-800 text-xs truncate w-full">
                  ${textLabel}
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const isMultiple = (qType !== 'boolean');
  return `
    <div class="flex-1 flex flex-col h-full w-full p-3 sm:p-4 touch-action-manipulation">
      
      <!-- Canlı Ses Yayını Banner'ı (Varsa) -->
      ${renderStudentVoiceBanner()}

      <!-- Üst Bar: Soru Sayısı ve Sayaç -->
      <div class="flex items-center justify-between px-2 py-1 mb-2">
        <span class="text-xs font-bold uppercase text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
          Soru ${q.questionIndex + 1} / ${q.totalQuestions}
        </span>
        <div class="flex items-center gap-1.5 font-brand font-black text-2xl text-indigo-600">
          <i class="fa-solid fa-stopwatch text-base"></i>
          <span id="student-timer-display">${timer.timeLeft}</span>
        </div>
      </div>

      <!-- Ayar: Öğrenci Ekranında Soru Metni ve Görseli Gösterme -->
      ${q.questionText ? `
        <div class="mb-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center animate-pop-in">
          ${q.imageUrl ? `
            <img src="${q.imageUrl}" class="max-h-24 sm:max-h-28 mx-auto rounded-xl object-contain mb-1.5 border border-slate-100 shadow-sm bg-slate-50" />
          ` : ''}
          <p class="font-bold text-slate-800 text-xs sm:text-sm leading-snug">${q.questionText}</p>
        </div>
      ` : ''}

      <!-- Şıklar / Seçenekler Buton Alanı (Gelişmiş Kahoot Izgarası) -->
      <div class="flex-1 grid ${isMultiple ? 'grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3.5' : 'grid-cols-1 grid-rows-2 gap-3'} w-full h-full min-h-[300px]">
        ${isMultiple ? q.options.map((opt, i) => {
          const style = KAHOOT_OPTIONS[i % 4];
          const textLabel = (state.hostGame && state.hostGame.settings && state.hostGame.settings.showOptionsTextOnStudent) 
            ? opt 
            : style.name;

          return `
            <button 
              type="button" 
              data-student-option="${i}" 
              class="btn-submit-answer ${style.color} rounded-3xl flex flex-col justify-between items-center text-white active:scale-95 transition-transform duration-100 border-4 border-white/30 overflow-hidden"
            >
              <div class="flex-1 flex items-center justify-center">
                <span class="text-4xl sm:text-5xl block drop-shadow-lg">
                  <i class="${style.icon}"></i>
                </span>
              </div>
              <div class="p-2 bg-white text-center font-bold text-slate-800 text-xs truncate w-full">
                ${textLabel}
              </div>
            </button>
          `;
        }).join('') : [
          { idx: 0, label: 'Doğru', style: KAHOOT_OPTIONS[1] },
          { idx: 1, label: 'Yanlış', style: KAHOOT_OPTIONS[0] }
        ].map(item => `
          <button 
            type="button" 
            data-student-option="${item.idx}" 
            class="btn-submit-answer ${item.style.color} rounded-3xl flex items-center justify-center text-white active:scale-95 transition-transform duration-100 border-4 border-white/30"
          >
            <div class="text-center">
              <span class="text-5xl sm:text-6xl block mb-2 drop-shadow-lg">
                <i class="${item.style.icon}"></i>
              </span>
              <span class="font-brand font-black text-3xl uppercase tracking-wider">${item.label}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// K. ÖĞRENCİ GERİ BİLDİRİM EKRANI
// ----------------------------------------------------
function renderStudentFeedbackView() {
  const res = state.student.lastResult;
  if (!res) return '';

  const isCorrect = res.isCorrect;

  return `
    <div class="flex-1 flex flex-col justify-between items-center p-6 max-w-md mx-auto w-full text-center">
      <div class="pt-4 w-full">
        <span class="text-xs font-bold uppercase tracking-widest text-slate-400">
          Soru Değerlendirmesi
        </span>
        ${renderStudentVoiceBanner()}
      </div>

      <div class="my-auto py-6 animate-pop-in w-full">
        <div class="w-28 h-28 mx-auto rounded-3xl ${isCorrect ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-tr from-rose-500 to-red-600 shadow-rose-500/30'} flex items-center justify-center text-6xl text-white shadow-xl mb-4">
          <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
        </div>

        <h1 class="text-3xl sm:text-4xl font-brand font-black text-slate-900 mb-2">
          ${isCorrect ? 'DOĞRU!' : 'YANLIŞ!'}
        </h1>

        <div class="inline-block bg-white border border-slate-200 px-6 py-2.5 rounded-2xl mb-3 shadow-sm">
          <span class="font-brand font-black text-2xl ${isCorrect ? 'text-emerald-600' : 'text-slate-500'}">
            ${isCorrect ? `+${res.earnedPoints}` : '+0'} Puan
          </span>
        </div>

        ${res.streak > 1 ? `
          <div class="text-xs font-bold text-amber-600 flex items-center justify-center gap-1 mb-2">
            <i class="fa-solid fa-fire text-amber-500"></i>
            <span>${res.streak} Doğru Seri Bonusu!</span>
          </div>
        ` : ''}

        ${!isCorrect && res.humanReadableCorrect ? `
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 mt-2 text-left">
            <span class="font-bold block text-[10px] text-amber-700 uppercase">Doğru Cevap:</span>
            <span>${res.humanReadableCorrect}</span>
          </div>
        ` : ''}
      </div>

      <div class="w-full bg-white rounded-2xl p-4 flex items-center justify-between text-left border border-slate-200 shadow-sm">
        <div>
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Şu Anki Sıran</span>
          <span class="font-brand font-black text-xl text-slate-900">
            ${res.rank}. <span class="text-xs font-normal text-slate-500">/ ${res.totalPlayers}</span>
          </span>
        </div>
        <div class="text-right">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Toplam Puanın</span>
          <span class="font-brand font-black text-xl text-indigo-600">${res.totalScore}</span>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// L. ÖĞRENCİ FİNAL PODYUM EKRANI
// ----------------------------------------------------
function renderStudentPodiumView() {
  const podium = state.student.podium;
  const myNick = state.student.nickname;
  let myRank = null;
  let myScore = 0;
  let totalPlayers = 1;

  if (podium && podium.allPlayers) {
    totalPlayers = podium.allPlayers.length;
    const found = podium.allPlayers.find(p => p.nickname === myNick);
    if (found) {
      myRank = found.rank;
      myScore = found.score;
    }
  }

  const isFirst = (myRank === 1);
  const isSecond = (myRank === 2);
  const isThird = (myRank === 3);
  const isTop3 = (isFirst || isSecond || isThird);

  let badgeTitle = 'Harika Yarıştın!';
  let glowEffect = 'shadow-premium';

  if (isFirst) {
    badgeTitle = 'BÜYÜK ŞAMPİYON!';
    glowEffect = 'shadow-[0_0_50px_rgba(245,158,11,0.5)]';
  } else if (isSecond) {
    badgeTitle = '2. SIRA - GÜMÜŞ KÜRSÜ!';
    glowEffect = 'shadow-[0_0_40px_rgba(203,213,225,0.4)]';
  } else if (isThird) {
    badgeTitle = '3. SIRA - BRONZ KÜRSÜ!';
    glowEffect = 'shadow-[0_0_40px_rgba(249,115,22,0.4)]';
  }

  return `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#060814] via-[#0d122b] to-[#04060f] text-white flex flex-col justify-between items-center p-6 text-center select-none">
      
      <!-- Üst Bilgi -->
      <div class="pt-6 relative z-10">
        <span class="text-xs font-black uppercase tracking-widest ${isFirst ? 'text-amber-400' : isSecond ? 'text-slate-300' : isThird ? 'text-orange-400' : 'text-indigo-400'} bg-white/10 px-4 py-1.5 rounded-full border border-white/15">
          ${isTop3 ? '🎉 Podyum Başarısı! 🎉' : 'Yarışma Tamamlandı'}
        </span>
        <h1 class="text-3xl sm:text-4xl font-brand font-black mt-3 ${isFirst ? 'text-yellow-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.6)]' : 'text-white'}">
          ${badgeTitle}
        </h1>
      </div>

      <!-- Orta Alan: Avatar & Sıralama Kartı -->
      <div class="my-auto py-6 w-full max-w-sm relative z-10">
        
        <!-- Avatar ve Taç/Madalya -->
        <div class="relative inline-block mb-4">
          ${isFirst ? `
            <div class="text-5xl mb-1 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.9)] animate-crown-drop">
              👑
            </div>
          ` : ''}
          <div class="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full ${isFirst ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 border-4 border-yellow-200 shadow-[0_0_40px_rgba(245,158,11,0.7)]' : isSecond ? 'bg-gradient-to-b from-slate-200 to-slate-500 border-4 border-white shadow-[0_0_30px_rgba(203,213,225,0.5)]' : isThird ? 'bg-gradient-to-b from-orange-400 to-amber-800 border-4 border-orange-200 shadow-[0_0_30px_rgba(249,115,22,0.5)]' : 'bg-slate-800 border-2 border-slate-700 shadow-xl'} flex items-center justify-center text-5xl sm:text-6xl animate-pop-in">
            ${state.student.avatar || '🐱'}
          </div>
          <div class="absolute -bottom-2 -right-1 bg-slate-900 border-2 border-white/30 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow">
            ${myRank ? `${myRank}. Sıra` : '-'}
          </div>
        </div>

        <h2 class="text-2xl font-brand font-black text-white mb-1">
          ${myNick}
        </h2>
        <p class="text-xs text-slate-400 font-medium mb-5">
          ${isFirst ? 'Zirvenin tek sahibisin! Tebrikler!' : isTop3 ? 'Kürsüye çıkmayı başardın, tebrikler!' : `${totalPlayers} yarışmacı arasında harika mücadele!`}
        </p>

        <!-- Puan ve Derece Cam Kartı -->
        <div class="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-white/10 ${glowEffect}">
          <div class="grid grid-cols-2 gap-4 divide-x divide-white/10 text-center">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sıralaman</span>
              <span class="font-brand font-black text-3xl ${isFirst ? 'text-amber-400' : isSecond ? 'text-slate-200' : isThird ? 'text-orange-400' : 'text-indigo-400'}">
                ${myRank ? `${myRank}.` : '-'}<span class="text-xs text-slate-400 font-normal"> / ${totalPlayers}</span>
              </span>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Toplam Puan</span>
              <span class="font-brand font-black text-3xl text-white">
                ${myScore}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- Alt Aksiyon Butonu -->
      <div class="w-full max-w-sm pb-4 relative z-10">
        <button id="btn-student-leave" class="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-brand font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/40 active:scale-98 transition-all cursor-pointer">
          <i class="fa-solid fa-arrow-rotate-left mr-2"></i>
          <span>Yeni Bir Oyuna Katıl</span>
        </button>
      </div>

    </div>
  `;
}

// ----------------------------------------------------
// 7. ETKİLEŞİM DİNLEYİCİLERİ
// ----------------------------------------------------
function attachViewListeners() {
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  if (btnToggleSound) {
    btnToggleSound.onclick = () => {
      const muted = sound.toggleMute();
      btnToggleSound.innerHTML = `<i class="fa-solid ${muted ? 'fa-volume-xmark text-rose-500' : 'fa-volume-high text-emerald-600'}"></i>`;
    };
  }

  // Öğretmen Paneline Geçiş Butonları
  const btnGotoTeacher = document.getElementById('btn-goto-teacher');
  const btnGotoTeacherLink = document.getElementById('btn-goto-teacher-link');
  const handleGotoTeacher = () => {
    if (state.token) {
      state.view = 'TEACHER_DASHBOARD';
      loadQuizzes();
      loadReports();
    } else {
      state.view = 'TEACHER_LOGIN';
      render();
    }
  };
  if (btnGotoTeacher) btnGotoTeacher.onclick = handleGotoTeacher;
  if (btnGotoTeacherLink) btnGotoTeacherLink.onclick = handleGotoTeacher;

  const btnGotoRegister = document.getElementById('btn-goto-register');
  if (btnGotoRegister) {
    btnGotoRegister.onclick = () => {
      state.view = 'TEACHER_REGISTER';
      render();
    };
  }

  const btnGotoLogin = document.getElementById('btn-goto-login');
  if (btnGotoLogin) {
    btnGotoLogin.onclick = () => {
      state.view = 'TEACHER_LOGIN';
      render();
    };
  }

  const btnBackHome = document.getElementById('btn-back-home');
  if (btnBackHome) {
    btnBackHome.onclick = () => {
      state.view = 'HOME';
      render();
    };
  }

  // Giriş Formu
  const formLogin = document.getElementById('form-teacher-login');
  if (formLogin) {
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();

      try {
        const data = await apiRequest('/api/auth/login', 'POST', { username, password });
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('quizlem_token', data.token);
        localStorage.setItem('quizlem_user', JSON.stringify(data.user));
        showToast('Giriş başarılı!', 'success');
        state.view = 'TEACHER_DASHBOARD';
        loadQuizzes();
        loadReports();
      } catch (err) {}
    };
  }

  // Kayıt Formu
  const formRegister = document.getElementById('form-teacher-register');
  if (formRegister) {
    formRegister.onsubmit = async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('reg-fullname').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value.trim();

      try {
        const data = await apiRequest('/api/auth/register', 'POST', { full_name, username, password });
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('quizlem_token', data.token);
        localStorage.setItem('quizlem_user', JSON.stringify(data.user));
        showToast('Kayıt başarılı! Hoş geldiniz.', 'success');
        state.view = 'TEACHER_DASHBOARD';
        loadQuizzes();
        loadReports();
      } catch (err) {}
    };
  }

  // Çıkış
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.onclick = () => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('quizlem_token');
      localStorage.removeItem('quizlem_user');
      showToast('Oturum kapatıldı.', 'info');
      state.view = 'HOME';
      render();
    };
  }

  // Avatar Seçimi
  const avatarBtns = document.querySelectorAll('.avatar-btn');
  avatarBtns.forEach(btn => {
    btn.onclick = () => {
      avatarBtns.forEach(b => {
        b.className = 'avatar-btn w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all bg-slate-50 border border-slate-200 hover:bg-slate-100';
      });
      btn.className = 'avatar-btn w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all bg-indigo-50 border-2 border-indigo-500 scale-110 shadow-sm';
      state.student.avatar = btn.getAttribute('data-avatar');
    };
  });

  // Öğrenci Katıl Formu
  const formStudentJoin = document.getElementById('form-student-join');
  if (formStudentJoin) {
    formStudentJoin.onsubmit = (e) => {
      e.preventDefault();
      const pin = document.getElementById('input-pin').value.trim();
      const nickname = document.getElementById('input-nickname').value.trim();

      if (!pin || !nickname) {
        showToast('Lütfen PIN kodu ve rumuzunuzu girin.', 'warning');
        return;
      }

      const submitBtn = document.getElementById('btn-student-join');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Bağlanılıyor...</span>`;
      }

      voiceReceiver.initAudioElement();
      voiceReceiver.unlockAudio();

      socket.emit('player:join', {
        pin,
        nickname,
        avatar: state.student.avatar
      });
    };
  }

  // Banner & Dashboard Test Oluştur Butonları
  const btnCreateQuiz = document.getElementById('btn-create-quiz') || document.getElementById('btn-create-quiz-empty');
  const btnBannerCreate = document.getElementById('btn-banner-create');
  const handleOpenEditor = () => {
    state.editingQuiz = null;
    state.view = 'QUIZ_EDITOR';
    render();
  };
  if (btnCreateQuiz) btnCreateQuiz.onclick = handleOpenEditor;
  if (btnBannerCreate) btnBannerCreate.onclick = handleOpenEditor;

  // Panel Sekmeleri (Testlerim vs. Raporlar & Analizler)
  const tabDashQuizzes = document.getElementById('tab-dashboard-quizzes');
  if (tabDashQuizzes) {
    tabDashQuizzes.onclick = () => {
      state.activeDashboardTab = 'quizzes';
      render();
    };
  }

  const tabDashReports = document.getElementById('tab-dashboard-reports');
  if (tabDashReports) {
    tabDashReports.onclick = () => {
      state.activeDashboardTab = 'reports';
      loadReports();
    };
  }

  const btnGotoQuizzesTab = document.getElementById('btn-goto-quizzes-tab');
  if (btnGotoQuizzesTab) {
    btnGotoQuizzesTab.onclick = () => {
      state.activeDashboardTab = 'quizzes';
      render();
    };
  }

  // Rapor Arama Inputu
  const inputSearchReports = document.getElementById('input-search-reports');
  if (inputSearchReports) {
    inputSearchReports.oninput = (e) => {
      state.searchReportQuery = e.target.value;
      render();
      const ref = document.getElementById('input-search-reports');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(ref.value.length, ref.value.length);
      }
    };
  }

  // Rapor Aksiyon Butonları (İncele, Excel İndir, Sil)
  const reportViewBtns = document.querySelectorAll('.btn-view-report');
  reportViewBtns.forEach(btn => {
    btn.onclick = () => {
      const rId = btn.getAttribute('data-report-id');
      viewReportDetail(rId);
    };
  });

  const reportExcelBtns = document.querySelectorAll('.btn-download-excel');
  reportExcelBtns.forEach(btn => {
    btn.onclick = () => {
      const rId = btn.getAttribute('data-report-id');
      downloadReportExcel(rId);
    };
  });

  const reportDeleteBtns = document.querySelectorAll('.btn-delete-report');
  reportDeleteBtns.forEach(btn => {
    btn.onclick = () => {
      const rId = btn.getAttribute('data-report-id');
      deleteReport(rId);
    };
  });

  // Rapor Detay Sayfası Dinleyicileri
  const btnReportBack = document.getElementById('btn-report-back-dashboard');
  if (btnReportBack) {
    btnReportBack.onclick = () => {
      state.view = 'TEACHER_DASHBOARD';
      state.activeDashboardTab = 'reports';
      loadReports();
    };
  }

  const btnExportExcelDetail = document.getElementById('btn-export-excel-detail');
  if (btnExportExcelDetail) {
    btnExportExcelDetail.onclick = () => {
      const rId = btnExportExcelDetail.getAttribute('data-report-id');
      downloadReportExcel(rId);
    };
  }

  // Rapor Detay Alt Sekmeleri
  const subRanking = document.getElementById('subtab-ranking');
  if (subRanking) {
    subRanking.onclick = () => {
      state.reportDetailSubTab = 'ranking';
      render();
    };
  }

  const subQuestions = document.getElementById('subtab-questions');
  if (subQuestions) {
    subQuestions.onclick = () => {
      state.reportDetailSubTab = 'questions';
      render();
    };
  }

  const subMatrix = document.getElementById('subtab-matrix');
  if (subMatrix) {
    subMatrix.onclick = () => {
      state.reportDetailSubTab = 'matrix';
      render();
    };
  }

  // Canlı Arama Inputu (Öğretmen Paneli)
  const inputSearch = document.getElementById('input-search-quizzes');
  if (inputSearch) {
    inputSearch.oninput = (e) => {
      state.searchQuery = e.target.value;
      render();
      // Arama inputunun odağını kaybetmemesi için geri odakla
      const refreshedInput = document.getElementById('input-search-quizzes');
      if (refreshedInput) {
        refreshedInput.focus();
        refreshedInput.setSelectionRange(refreshedInput.value.length, refreshedInput.value.length);
      }
    };
  }

  // Kategori Filtreleme Sekmeleri
  const filterTabs = document.querySelectorAll('.btn-filter-cat');
  filterTabs.forEach(tab => {
    tab.onclick = () => {
      state.selectedCategory = tab.getAttribute('data-category');
      render();
    };
  });

  // Testi Düzenle
  const editBtns = document.querySelectorAll('.btn-edit-quiz');
  editBtns.forEach(btn => {
    btn.onclick = async () => {
      const qId = btn.getAttribute('data-edit-quiz');
      try {
        const data = await apiRequest(`/api/quizzes/${qId}`);
        state.editingQuiz = {
          ...data.quiz,
          questions: data.questions
        };
        state.view = 'QUIZ_EDITOR';
        render();
      } catch (err) {}
    };
  });

  // Testi Sil
  const deleteBtns = document.querySelectorAll('.btn-delete-quiz');
  deleteBtns.forEach(btn => {
    btn.onclick = async () => {
      const qId = btn.getAttribute('data-delete-quiz');
      if (confirm('Bu testi silmek istediğinizden emin misiniz?')) {
        try {
          await apiRequest(`/api/quizzes/${qId}`, 'DELETE');
          showToast('Test başarıyla silindi.', 'success');
          loadQuizzes();
        } catch (err) {}
      }
    };
  });

  // Testi Oynat (Canlı Lobi)
  const playBtns = document.querySelectorAll('.btn-play-quiz');
  playBtns.forEach(btn => {
    btn.onclick = () => {
      const qId = btn.getAttribute('data-play-quiz');
      console.log('🎮 Hemen Oynat butonuna tıklandı, Test ID:', qId);
      socket.emit('host:create_game', {
        quizId: parseInt(qId),
        token: state.token
      });
    };
  });

  // Soru Ekle
  const btnAddQuestion = document.getElementById('btn-add-question');
  if (btnAddQuestion) {
    btnAddQuestion.onclick = () => {
      const container = document.getElementById('questions-container');
      const cards = container.querySelectorAll('.question-card');
      const newIndex = cards.length;

      const dummyQuestion = {
        question_text: '',
        question_type: 'multiple',
        options: ['', '', '', ''],
        correct_option: 0,
        image_url: '',
        time_limit: 20,
        points_multiplier: 1
      };

      const div = document.createElement('div');
      div.innerHTML = renderQuestionCard(dummyQuestion, newIndex);
      container.appendChild(div.firstElementChild);

      const countBadge = document.getElementById('question-count-badge');
      if (countBadge) countBadge.innerText = newIndex + 1;

      attachQuestionCardEvents();
    };
  }

  // Editörden Çıkış
  const btnCancelEditor = document.getElementById('btn-cancel-editor');
  if (btnCancelEditor) {
    btnCancelEditor.onclick = () => {
      state.editingQuiz = null;
      state.view = 'TEACHER_DASHBOARD';
      render();
    };
  }

  // Testi Kaydet
  const btnSaveQuiz = document.getElementById('btn-save-quiz');
  if (btnSaveQuiz) {
    btnSaveQuiz.onclick = async () => {
      const title = document.getElementById('quiz-title').value.trim();
      const description = document.getElementById('quiz-description').value.trim();
      const category = document.getElementById('quiz-category').value;

      if (!title) {
        showToast('Lütfen test başlığını giriniz.', 'warning');
        return;
      }

      const cards = document.querySelectorAll('.question-card');
      if (cards.length === 0) {
        showToast('En az 1 soru eklemelisiniz.', 'warning');
        return;
      }

      const questions = [];
      let hasError = false;

      cards.forEach((card, idx) => {
        const text = card.querySelector('.q-text').value.trim();
        const type = card.querySelector('.q-type').value;
        const time = parseInt(card.querySelector('.q-time').value) || 20;
        const multiplier = parseInt(card.querySelector('.q-multiplier').value) || 1;
        const imageUrl = card.querySelector('.q-image-url') ? card.querySelector('.q-image-url').value.trim() : '';

        if (!text) {
          showToast(`${idx + 1}. sorunun metnini yazınız.`, 'warning');
          hasError = true;
          return;
        }

        let options = [];
        let correctOption = 0;

        if (type === 'fill_blank') {
          const fillInput = card.querySelector('.q-fill-blank-input');
          const rawAnswers = fillInput ? fillInput.value.trim() : '';
          if (!rawAnswers) {
            showToast(`${idx + 1}. sorunun doğru cevabını yazınız.`, 'warning');
            hasError = true;
            return;
          }
          const acceptedWords = rawAnswers.split(',').map(s => s.trim()).filter(Boolean);
          options = [];
          correctOption = acceptedWords;
        } else if (type === 'order') {
          const stepInputs = card.querySelectorAll('.q-order-step');
          options = Array.from(stepInputs).map(inp => inp.value.trim());
          if (options.some(o => !o)) {
            showToast(`${idx + 1}. sıralama sorusunun tüm adımlarını doldurunuz.`, 'warning');
            hasError = true;
            return;
          }
          correctOption = [0, 1, 2, 3];
        } else if (type === 'multiselect') {
          const optInputs = card.querySelectorAll('.q-opt-input');
          options = Array.from(optInputs).map(inp => inp.value.trim());
          if (options.some(o => !o)) {
            showToast(`${idx + 1}. sorunun tüm şıklarını doldurunuz.`, 'warning');
            hasError = true;
            return;
          }
          const checkedBoxes = card.querySelectorAll('.q-multiselect-check:checked');
          if (checkedBoxes.length === 0) {
            showToast(`${idx + 1}. çoklu seçim sorusunda en az bir doğru şık işaretleyiniz.`, 'warning');
            hasError = true;
            return;
          }
          correctOption = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        } else if (type === 'image_choice') {
          const textInputs = card.querySelectorAll('.q-imgopt-text');
          const urlInputs = card.querySelectorAll('.q-imgopt-url');
          options = Array.from(textInputs).map((inp, i) => ({
            text: inp.value.trim(),
            image: urlInputs[i] ? urlInputs[i].value.trim() : ''
          }));
          const correctRadio = card.querySelector('.q-correct:checked');
          correctOption = correctRadio ? parseInt(correctRadio.value) : 0;
        } else {
          const optInputs = card.querySelectorAll('.q-opt-input');
          options = Array.from(optInputs).map(inp => inp.value.trim());
          if (type === 'multiple' && options.some(o => !o)) {
            showToast(`${idx + 1}. sorunun tüm şıklarını doldurunuz.`, 'warning');
            hasError = true;
            return;
          }
          const correctRadio = card.querySelector('.q-correct:checked');
          correctOption = correctRadio ? parseInt(correctRadio.value) : 0;
        }

        questions.push({
          question_text: text,
          question_type: type,
          options,
          correct_option: correctOption,
          image_url: imageUrl,
          time_limit: time,
          points_multiplier: multiplier
        });
      });

      if (hasError) return;

      try {
        if (state.editingQuiz && state.editingQuiz.id) {
          await apiRequest(`/api/quizzes/${state.editingQuiz.id}`, 'PUT', {
            title, description, category, questions
          });
          showToast('Test başarıyla güncellendi.', 'success');
        } else {
          await apiRequest('/api/quizzes', 'POST', {
            title, description, category, questions
          });
          showToast('Test başarıyla oluşturuldu.', 'success');
        }

        state.editingQuiz = null;
        state.view = 'TEACHER_DASHBOARD';
        loadQuizzes();
      } catch (err) {}
    };
  }

  // Host: PIN Kopyala
  const btnCopyPin = document.getElementById('btn-copy-pin');
  if (btnCopyPin) {
    btnCopyPin.onclick = () => {
      navigator.clipboard.writeText(state.hostGame.pin).then(() => {
        showToast('PIN kodu panoya kopyalandı!', 'success');
      });
    };
  }

  // Host: Oyunu Başlat
  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) {
    btnStartGame.onclick = () => {
      socket.emit('host:start_game', { pin: state.hostGame.pin });
    };
  }

  // Host: Oyunu İptal Et
  const btnCancelGame = document.getElementById('btn-cancel-game');
  if (btnCancelGame) {
    btnCancelGame.onclick = () => {
      if (confirm('Yarışmayı sonlandırmak istediğinize emin misiniz?')) {
        voiceBroadcast.stopAll();
        window.location.reload();
      }
    };
  }

  // Host: Canlı Ses Yayını Kontrolleri
  const btnHostToggleMic = document.getElementById('btn-host-toggle-mic');
  if (btnHostToggleMic) {
    btnHostToggleMic.onclick = async () => {
      await voiceBroadcast.toggleMicrophone();
      render();
    };
  }

  const btnHostMicQuick = document.getElementById('btn-host-mic-quick');
  if (btnHostMicQuick) {
    btnHostMicQuick.onclick = async () => {
      await voiceBroadcast.toggleMicrophone();
      render();
    };
  }

  const btnHostTogglePcSound = document.getElementById('btn-host-toggle-pc-sound');
  if (btnHostTogglePcSound) {
    btnHostTogglePcSound.onclick = async () => {
      await voiceBroadcast.togglePcAudio();
      render();
    };
  }

  const inputHostMusic = document.getElementById('input-host-music-file');
  if (inputHostMusic) {
    inputHostMusic.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await voiceBroadcast.playMusicFile(file);
        render();
      }
    };
  }

  const btnStopMusic = document.getElementById('btn-stop-music');
  if (btnStopMusic) {
    btnStopMusic.onclick = () => {
      voiceBroadcast.stopMusic();
      render();
    };
  }

  // Host: Gelişmiş Yarışma Ayarları
  const checkShowQ = document.getElementById('setting-show-questions');
  if (checkShowQ) {
    checkShowQ.onchange = (e) => {
      state.hostGame.settings.showQuestionsOnStudent = e.target.checked;
      socket.emit('host:update_settings', { pin: state.hostGame.pin, settings: state.hostGame.settings });
    };
  }

  const checkShowOpt = document.getElementById('setting-show-options');
  if (checkShowOpt) {
    checkShowOpt.onchange = (e) => {
      state.hostGame.settings.showOptionsTextOnStudent = e.target.checked;
      socket.emit('host:update_settings', { pin: state.hostGame.pin, settings: state.hostGame.settings });
    };
  }

  const checkShuffleQ = document.getElementById('setting-shuffle-questions');
  if (checkShuffleQ) {
    checkShuffleQ.onchange = (e) => {
      state.hostGame.settings.shuffleQuestions = e.target.checked;
      socket.emit('host:update_settings', { pin: state.hostGame.pin, settings: state.hostGame.settings });
    };
  }

  const checkShuffleOpt = document.getElementById('setting-shuffle-options');
  if (checkShuffleOpt) {
    checkShuffleOpt.onchange = (e) => {
      state.hostGame.settings.shuffleOptions = e.target.checked;
      socket.emit('host:update_settings', { pin: state.hostGame.pin, settings: state.hostGame.settings });
    };
  }

  // Öğrenci: Ses Yayını Dinleme Mute, Ses Kilidi Açma ve Ses Seviyesi Kontrolleri
  const btnStudentUnblockAudio = document.getElementById('btn-student-unblock-audio');
  if (btnStudentUnblockAudio) {
    btnStudentUnblockAudio.onclick = (e) => {
      e.stopPropagation();
      voiceReceiver.unlockAudio();
    };
  }

  if (state.view.startsWith('STUDENT_') && state.student.voice && state.student.voice.needClick) {
    const appEl = document.getElementById('app');
    if (appEl) {
      const oneTimeUnlock = () => {
        voiceReceiver.unlockAudio();
        appEl.removeEventListener('click', oneTimeUnlock);
      };
      appEl.addEventListener('click', oneTimeUnlock, { once: true });
    }
  }

  const btnStudentToggleMute = document.getElementById('btn-student-toggle-mute');
  if (btnStudentToggleMute) {
    btnStudentToggleMute.onclick = () => {
      const isMuted = voiceReceiver.toggleMute();
      state.student.voice.isMuted = isMuted;
      render();
    };
  }

  const inputStudentVol = document.getElementById('input-student-volume');
  if (inputStudentVol) {
    inputStudentVol.oninput = (e) => {
      voiceReceiver.setVolume(parseFloat(e.target.value));
    };
  }

  // Host: Sonraki Soru
  const btnNextQ = document.getElementById('btn-next-question');
  if (btnNextQ) {
    btnNextQ.onclick = () => {
      socket.emit('host:next_question', { pin: state.hostGame.pin });
    };
  }

  // Host: Panele Dön ve Podyum Kontrolleri
  const btnFinishToDash = document.getElementById('btn-finish-to-dashboard');
  if (btnFinishToDash) {
    btnFinishToDash.onclick = () => {
      clearPodiumTimers();
      state.view = 'TEACHER_DASHBOARD';
      loadQuizzes();
    };
  }

  const btnPodiumViewReport = document.getElementById('btn-podium-view-report');
  if (btnPodiumViewReport) {
    btnPodiumViewReport.onclick = () => {
      clearPodiumTimers();
      if (state.hostGame.sessionId) {
        viewReportDetail(state.hostGame.sessionId);
      } else {
        state.view = 'TEACHER_DASHBOARD';
        state.activeDashboardTab = 'reports';
        loadReports();
      }
    };
  }

  const btnSkipPodium = document.getElementById('btn-skip-podium');
  if (btnSkipPodium) {
    btnSkipPodium.onclick = () => {
      skipHostPodiumChoreography();
    };
  }

  const btnReplayPodium = document.getElementById('btn-replay-podium');
  if (btnReplayPodium) {
    btnReplayPodium.onclick = () => {
      startHostPodiumChoreography();
    };
  }

  // --- ÖĞRENCİ CEVAPLAMA DİNLEYİCİLERİ ---
  const answerBtns = document.querySelectorAll('.btn-submit-answer');
  answerBtns.forEach(btn => {
    btn.onclick = () => {
      const optIdx = parseInt(btn.getAttribute('data-student-option'));
      sound.playTick();
      socket.emit('player:submit_answer', {
        pin: state.student.pin,
        answer: optIdx
      });
    };
  });

  const formFillBlank = document.getElementById('form-student-fill-blank');
  if (formFillBlank) {
    formFillBlank.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('input-student-blank');
      const val = input ? input.value.trim() : '';
      if (!val) return;

      sound.playTick();
      socket.emit('player:submit_answer', {
        pin: state.student.pin,
        answer: val
      });
    };
  }

  const moveBtns = document.querySelectorAll('.btn-move-order');
  moveBtns.forEach(btn => {
    btn.onclick = () => {
      const upIdx = btn.getAttribute('data-move-up');
      const downIdx = btn.getAttribute('data-move-down');
      const items = state.student.orderItems;

      if (upIdx !== null) {
        const i = parseInt(upIdx);
        if (i > 0) {
          [items[i - 1], items[i]] = [items[i], items[i - 1]];
          render();
        }
      } else if (downIdx !== null) {
        const i = parseInt(downIdx);
        if (i < items.length - 1) {
          [items[i], items[i + 1]] = [items[i + 1], items[i]];
          render();
        }
      }
    };
  });

  const btnConfirmOrder = document.getElementById('btn-confirm-order');
  if (btnConfirmOrder) {
    btnConfirmOrder.onclick = () => {
      const chosenOrderIndices = state.student.orderItems.map(item => item.id);
      sound.playTick();
      socket.emit('player:submit_answer', {
        pin: state.student.pin,
        answer: chosenOrderIndices
      });
    };
  }

  const toggleBtns = document.querySelectorAll('.btn-toggle-multiselect');
  toggleBtns.forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-toggle-option'));
      const arr = state.student.selectedIndices;
      const existIdx = arr.indexOf(idx);

      if (existIdx >= 0) {
        arr.splice(existIdx, 1);
      } else {
        arr.push(idx);
      }

      sound.playTick();
      render();
    };
  });

  const btnSubmitMulti = document.getElementById('btn-submit-multiselect');
  if (btnSubmitMulti) {
    btnSubmitMulti.onclick = () => {
      if (state.student.selectedIndices.length === 0) return;

      sound.playTick();
      socket.emit('player:submit_answer', {
        pin: state.student.pin,
        answer: state.student.selectedIndices
      });
    };
  }

  const btnStudentLeave = document.getElementById('btn-student-leave');
  if (btnStudentLeave) {
    btnStudentLeave.onclick = () => {
      state.student.pin = '';
      state.student.submittedAnswer = null;
      state.student.hasAnswered = false;
      state.student.lastResult = null;
      state.student.podium = null;
      state.view = 'HOME';
      render();
    };
  }

  attachQuestionCardEvents();
}

function attachQuestionCardEvents() {
  const removeBtns = document.querySelectorAll('.btn-remove-question');
  removeBtns.forEach(btn => {
    btn.onclick = (e) => {
      const card = e.target.closest('.question-card');
      const container = document.getElementById('questions-container');
      if (container && container.querySelectorAll('.question-card').length <= 1) {
        showToast('Testte en az 1 soru bulunmalıdır.', 'warning');
        return;
      }
      if (card) {
        card.remove();
        const remainingCards = container.querySelectorAll('.question-card');
        remainingCards.forEach((c, idx) => {
          c.setAttribute('data-q-index', idx);
          const badge = c.querySelector('.font-brand');
          if (badge) badge.innerText = idx + 1;
        });
        const countBadge = document.getElementById('question-count-badge');
        if (countBadge) countBadge.innerText = remainingCards.length;
      }
    };
  });

  const typeSelects = document.querySelectorAll('.q-type');
  typeSelects.forEach(sel => {
    sel.onchange = (e) => {
      const card = e.target.closest('.question-card');
      const qIndex = parseInt(card.getAttribute('data-q-index'));
      const newType = e.target.value;
      const wrapper = card.querySelector('.options-wrapper');

      if (!wrapper) return;

      const dummy = {
        question_type: newType,
        options: ['', '', '', ''],
        correct_option: 0
      };

      wrapper.innerHTML = renderOptionsForType(dummy, qIndex);
      attachQuestionCardEvents();
    };
  });

  // Soru Görseli Dosya Yükleme (PNG, JPG, WEBP)
  const imageFileInputs = document.querySelectorAll('.q-image-file');
  imageFileInputs.forEach(input => {
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const card = e.target.closest('.question-card');
      if (!card) return;
      const urlInput = card.querySelector('.q-image-url');
      const previewBox = card.querySelector('.q-image-preview');
      const previewImg = card.querySelector('.preview-img');
      const clearBtn = card.querySelector('.btn-clear-image');

      handleImageFileUpload(file, (uploadedUrl) => {
        if (urlInput) urlInput.value = uploadedUrl;
        if (previewImg) previewImg.src = uploadedUrl;
        if (previewBox) previewBox.classList.remove('hidden');
        if (clearBtn) clearBtn.classList.remove('hidden');
      });
      // Input'u sıfırla ki aynı dosya tekrar seçilebilsin
      e.target.value = '';
    };
  });

  // Soru Görseli URL elle değişirse
  const imageUrlInputs = document.querySelectorAll('.q-image-url');
  imageUrlInputs.forEach(input => {
    input.oninput = (e) => {
      const card = e.target.closest('.question-card');
      const val = e.target.value.trim();
      const previewBox = card.querySelector('.q-image-preview');
      const previewImg = card.querySelector('.preview-img');
      const clearBtn = card.querySelector('.btn-clear-image');

      if (val) {
        if (previewImg) previewImg.src = val;
        if (previewBox) previewBox.classList.remove('hidden');
        if (clearBtn) clearBtn.classList.remove('hidden');
      } else {
        if (previewBox) previewBox.classList.add('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
      }
    };
  });

  // Soru Görselini Kaldır Butonu
  const clearImageBtns = document.querySelectorAll('.btn-clear-image');
  clearImageBtns.forEach(btn => {
    btn.onclick = (e) => {
      const card = e.target.closest('.question-card');
      const urlInput = card.querySelector('.q-image-url');
      const previewBox = card.querySelector('.q-image-preview');
      if (urlInput) urlInput.value = '';
      if (previewBox) previewBox.classList.add('hidden');
      btn.classList.add('hidden');
    };
  });

  // Görsel Seçmeli Şıklar: Dosya Yükleme
  const optFileInputs = document.querySelectorAll('.q-imgopt-file');
  optFileInputs.forEach(input => {
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const optContainer = e.target.closest('.p-3');
      if (!optContainer) return;
      const urlInput = optContainer.querySelector('.q-imgopt-url');
      const previewBox = optContainer.querySelector('.q-imgopt-preview');
      const previewImg = optContainer.querySelector('.preview-opt-img');

      handleImageFileUpload(file, (uploadedUrl) => {
        if (urlInput) urlInput.value = uploadedUrl;
        if (previewImg) previewImg.src = uploadedUrl;
        if (previewBox) previewBox.classList.remove('hidden');
      });
      e.target.value = '';
    };
  });

  // Görsel Seçmeli Şıklar: URL Elle Değişirse
  const optUrlInputs = document.querySelectorAll('.q-imgopt-url');
  optUrlInputs.forEach(input => {
    input.oninput = (e) => {
      const optContainer = e.target.closest('.p-3');
      const val = e.target.value.trim();
      const previewBox = optContainer.querySelector('.q-imgopt-preview');
      const previewImg = optContainer.querySelector('.preview-opt-img');

      if (val) {
        if (previewImg) previewImg.src = val;
        if (previewBox) previewBox.classList.remove('hidden');
      } else {
        if (previewBox) previewBox.classList.add('hidden');
      }
    };
  });
}

// ----------------------------------------------------
// 8. VERİ YÜKLEME VE İLK BAŞLATMA
// ----------------------------------------------------
async function loadQuizzes() {
  try {
    const data = await apiRequest('/api/quizzes');
    state.quizzes = data.quizzes || [];
    render();
    loadReports();
  } catch (err) {
    if (err.message && err.message.includes('Giriş')) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('quizlem_token');
      localStorage.removeItem('quizlem_user');
      state.view = 'TEACHER_LOGIN';
      render();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  state.view = 'HOME';
  render();
});
