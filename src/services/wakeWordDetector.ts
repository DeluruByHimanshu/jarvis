import { soundFx } from './soundFx';
import { voiceSystem } from './voiceController';

export type WakeWordState = 
  | 'STANDBY'                 // Off
  | 'STARTING'                // Initializing mic stream and recognition
  | 'LISTENING_FOR_WAKE_WORD' // Actively monitoring mic for "Jarvis"
  | 'WAKE_WORD_DETECTED'      // "Jarvis" detected, triggering response
  | 'CAPTURING_COMMAND'       // Listening for the subsequent command
  | 'PROCESSING'              // Command being executed
  | 'ERROR'                   // Permission error or recognition failure
  | 'UNSUPPORTED';            // Browser lacks speech/audio API

export interface WakeWordTriggerEvent {
  wakeWord: string;
  commandText?: string;
  timestamp: string;
  confidence?: number;
}

type StateListener = (state: WakeWordState, details?: string) => void;
type AudioLevelListener = (level: number) => void;
type TriggerListener = (event: WakeWordTriggerEvent) => void;

class WakeWordDetectorService {
  public state: WakeWordState = 'STANDBY';
  private recognition: any = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private shouldKeepListening: boolean = false;
  private isCapturingCommand: boolean = false;
  private commandTimeoutId: any = null;
  private lastDetectedText: string = '';
  private restartTimeoutId: any = null;

  private stateListeners: Set<StateListener> = new Set();
  private audioLevelListeners: Set<AudioLevelListener> = new Set();
  private triggerListeners: Set<TriggerListener> = new Set();

  constructor() {
    this.checkSupport();
  }

  public checkSupport(): boolean {
    if (typeof window === 'undefined') return false;
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasAudioCtx = !!(window.AudioContext || (window as any).webkitAudioContext);

    if (!hasSpeech || !hasGetUserMedia || !hasAudioCtx) {
      this.setState('UNSUPPORTED', 'Microphone or Web Speech Recognition not supported in this browser environment.');
      return false;
    }
    return true;
  }

  private setState(newState: WakeWordState, details?: string) {
    this.state = newState;
    this.stateListeners.forEach(listener => {
      try {
        listener(newState, details);
      } catch (err) {
        console.error('Error in wake word state listener:', err);
      }
    });
  }

  /**
   * Start wake word detection using the Microphone API and continuous Speech Recognition.
   */
  public async start(): Promise<boolean> {
    if (this.state === 'LISTENING_FOR_WAKE_WORD' || this.state === 'CAPTURING_COMMAND') {
      return true;
    }

    if (!this.checkSupport()) {
      return false;
    }

    this.setState('STARTING');
    this.shouldKeepListening = true;

    try {
      // 1. Initialize Microphone API stream (Web Audio API level metering)
      await this.initMicrophoneStream();

      // 2. Initialize continuous Speech Recognition tuned for wake-word
      this.initRecognition();

      this.setState('LISTENING_FOR_WAKE_WORD', 'Listening for wake-word "Jarvis"...');
      soundFx.playClick();
      return true;
    } catch (err: any) {
      console.warn('Failed to engage wake-word microphone stream:', err);
      this.shouldKeepListening = false;
      this.cleanupMedia();
      this.setState('ERROR', err.message || 'Microphone permission denied or device busy');
      return false;
    }
  }

  /**
   * Stop wake word detection and release microphone resources.
   */
  public stop() {
    this.shouldKeepListening = false;
    this.isCapturingCommand = false;
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }

    this.cleanupRecognition();
    this.cleanupMedia();
    this.setState('STANDBY');
    soundFx.playClick();
  }

  public toggle(): Promise<boolean> {
    if (this.state === 'STANDBY' || this.state === 'ERROR' || this.state === 'UNSUPPORTED') {
      return this.start();
    } else {
      this.stop();
      return Promise.resolve(false);
    }
  }

  /**
   * Acquire Microphone stream via navigator.mediaDevices.getUserMedia and connect AnalyserNode.
   */
  private async initMicrophoneStream(): Promise<void> {
    this.cleanupMedia();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.mediaStream = stream;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.6;
    source.connect(this.analyser);

    this.startAudioLevelLoop();
  }

  private startAudioLevelLoop() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.analyser || !this.shouldKeepListening) return;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      // Normalize to 0 - 1 range
      const normalized = Math.min(1, Math.max(0, avg / 128));

      this.audioLevelListeners.forEach(listener => {
        try {
          listener(normalized);
        } catch (e) {
          // ignore
        }
      });

      this.animFrameId = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  /**
   * Setup continuous Speech Recognition with regex-based wake word parsing.
   */
  private initRecognition() {
    this.cleanupRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      const activeText = (finalTranscript || interimTranscript).trim();
      if (!activeText) return;

      this.handleTranscribedSpeech(activeText, !!finalTranscript);
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' is common when silent; do not abort
      if (event.error !== 'no-speech') {
        console.warn('Wake word recognition event error:', event.error);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart while active so wake-word sentry stays continuously armed
      if (this.shouldKeepListening) {
        this.restartTimeoutId = setTimeout(() => {
          if (this.shouldKeepListening) {
            try {
              this.recognition?.start();
            } catch (err) {
              // Recognition might already be started or restarting
            }
          }
        }, 150);
      }
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('Initial recognition start error:', err);
    }
  }

  /**
   * Evaluates transcribed text for the "Jarvis" wake-word or captures ensuing command.
   */
  private handleTranscribedSpeech(text: string, isFinal: boolean) {
    const cleanText = text.trim();
    if (!cleanText || cleanText === this.lastDetectedText) return;

    // Wake-word pattern matching:
    // Matches "Jarvis", "Hey Jarvis", "Ok Jarvis", "Hi Jarvis", "Jarvis, create task..."
    const wakeWordRegex = /(?:^|\s)(?:hey\s+|ok\s+|hi\s+|yo\s+)?(jarvis|jarves|javis|jarvys)(?:[,\s.!?]+(.*))?$/i;

    if (!this.isCapturingCommand) {
      const match = cleanText.match(wakeWordRegex);
      if (match) {
        this.lastDetectedText = cleanText;
        const wakeWordMatched = match[1];
        const directCommand = match[2]?.trim();

        this.triggerWakeWord(wakeWordMatched, directCommand);
      }
    } else {
      // Already in command capture window
      if (isFinal && cleanText) {
        this.lastDetectedText = cleanText;
        this.completeCommandCapture(cleanText);
      }
    }
  }

  /**
   * Action triggered when user says "Jarvis"
   */
  private triggerWakeWord(wakeWordMatched: string, immediateCommand?: string) {
    this.setState('WAKE_WORD_DETECTED', `Wake word "${wakeWordMatched}" recognized!`);
    soundFx.playWakeWordActivated();

    const timestamp = new Date().toISOString();

    if (immediateCommand && immediateCommand.length > 2) {
      // Immediate command provided in the same phrase (e.g. "Jarvis, run diagnostics")
      this.triggerListeners.forEach(listener => {
        listener({
          wakeWord: wakeWordMatched,
          commandText: immediateCommand,
          timestamp
        });
      });

      this.setState('PROCESSING', `Executing: "${immediateCommand}"`);

      // Briefly return to listening for wake-word after processing
      setTimeout(() => {
        if (this.shouldKeepListening) {
          this.setState('LISTENING_FOR_WAKE_WORD');
        }
      }, 2000);
    } else {
      // Only "Jarvis" was uttered. Transition into dedicated command capture window
      this.isCapturingCommand = true;
      this.setState('CAPTURING_COMMAND', 'Listening for your command, sir...');

      // Speak quick acknowledgement
      voiceSystem.speak('At your service, sir.', 'jarvis');

      // Set timeout window (7 seconds) to capture speech before reverting to standby sentry
      if (this.commandTimeoutId) clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = setTimeout(() => {
        if (this.isCapturingCommand) {
          this.isCapturingCommand = false;
          if (this.shouldKeepListening) {
            this.setState('LISTENING_FOR_WAKE_WORD', 'Ready. Say "Jarvis" to wake.');
          }
        }
      }, 7000);

      this.triggerListeners.forEach(listener => {
        listener({
          wakeWord: wakeWordMatched,
          timestamp
        });
      });
    }
  }

  private completeCommandCapture(commandText: string) {
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
    this.isCapturingCommand = false;

    // Strip any leading "Jarvis" if repeated
    const sanitizedCommand = commandText.replace(/^(hey\s+|ok\s+)?jarvis[,.]?\s*/i, '').trim();

    if (sanitizedCommand) {
      this.setState('PROCESSING', `Dispatching: "${sanitizedCommand}"`);
      this.triggerListeners.forEach(listener => {
        listener({
          wakeWord: 'Jarvis',
          commandText: sanitizedCommand,
          timestamp: new Date().toISOString()
        });
      });
    }

    setTimeout(() => {
      if (this.shouldKeepListening) {
        this.setState('LISTENING_FOR_WAKE_WORD', 'Standby sentry active. Say "Jarvis"...');
      }
    }, 2200);
  }

  private cleanupRecognition() {
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
  }

  private cleanupMedia() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    // reset level
    this.audioLevelListeners.forEach(l => l(0));
  }

  // Event subscription API
  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public onAudioLevel(listener: AudioLevelListener): () => void {
    this.audioLevelListeners.add(listener);
    return () => this.audioLevelListeners.delete(listener);
  }

  public onWakeTrigger(listener: TriggerListener): () => void {
    this.triggerListeners.add(listener);
    return () => this.triggerListeners.delete(listener);
  }
}

export const wakeWordDetector = new WakeWordDetectorService();
