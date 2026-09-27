import { AgentId, VoicePersonality } from '../types';
import { soundFx } from './soundFx';

export const AI_PERSONALITIES: Record<string, VoicePersonality> = {
  jarvis: {
    id: 'jarvis',
    name: 'J.A.R.V.I.S.',
    agentId: 'jarvis',
    pitch: 0.95,
    rate: 0.98,
    voiceNameHint: 'en-GB|Daniel|Oliver|George|English United Kingdom',
    description: 'Crisp British cadence, analytical, unflappable, composed.'
  },
  friday: {
    id: 'friday',
    name: 'F.R.I.D.A.Y.',
    agentId: 'friday',
    pitch: 1.15,
    rate: 1.05,
    voiceNameHint: 'Irish|Moira|Karen|Samantha|en-IE|en-US',
    description: 'Energetic, warm, swift research synthesizer.'
  },
  ultron: {
    id: 'ultron',
    name: 'U.L.T.R.O.N.',
    agentId: 'ultron',
    pitch: 0.72,
    rate: 0.92,
    voiceNameHint: 'Fred|Ralph|Microsoft David|Google US English',
    description: 'Deep synthetic resonance, cold architectural precision.'
  },
  edith: {
    id: 'edith',
    name: 'E.D.I.T.H.',
    agentId: 'edith',
    pitch: 1.08,
    rate: 1.12,
    voiceNameHint: 'Victoria|Zira|Google UK English Female',
    description: 'Tactical defense protocol, rapid military clarity.'
  },
  oracle: {
    id: 'oracle',
    name: 'CYBER-ORACLE',
    agentId: 'nebula',
    pitch: 1.25,
    rate: 0.88,
    voiceNameHint: 'Fiona|Tessa|Google UK English Female',
    description: 'Ethereal telemetry streamer, ambient and rhythmic.'
  }
};

type VoiceCommandHandler = (command: {
  raw: string;
  action: string;
  parameter?: string;
  agent?: AgentId;
}) => void;

class VoiceSystemController {
  private recognition: any = null;
  public isListening: boolean = false;
  public isSpeaking: boolean = false;
  public currentPersonality: VoicePersonality = AI_PERSONALITIES.jarvis;
  private commandListeners: VoiceCommandHandler[] = [];
  public ttsEnabled: boolean = true;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initSpeechSynthesis();
  }

  private initSpeechSynthesis() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public setPersonality(id: string) {
    if (AI_PERSONALITIES[id]) {
      this.currentPersonality = AI_PERSONALITIES[id];
      soundFx.playJarvisChirp();
    }
  }

  public speak(text: string, personalityId?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return resolve();
      }

      window.speechSynthesis.cancel();

      // Clean markdown tags from speech text
      const cleanText = text
        .replace(/[*#`_]/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .substring(0, 300); // limit spoken length for responsiveness

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const personality = (personalityId && AI_PERSONALITIES[personalityId]) || this.currentPersonality;

      utterance.pitch = personality.pitch;
      utterance.rate = personality.rate;

      // Select best matching voice
      if (this.voices.length > 0 && personality.voiceNameHint) {
        const hints = personality.voiceNameHint.split('|');
        const matchedVoice = this.voices.find(v => 
          hints.some(hint => v.name.toLowerCase().includes(hint.toLowerCase()) || v.lang.toLowerCase().includes(hint.toLowerCase()))
        );
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public startListening(
    onInterim?: (text: string) => void,
    onResult?: (finalText: string) => void
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition is not supported in this browser.');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        soundFx.playJarvisChirp();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript && onInterim) {
          onInterim(interimTranscript);
        }

        if (finalTranscript) {
          if (onResult) onResult(finalTranscript);
          this.parseAndDispatchCommand(finalTranscript);
        }
      };

      this.recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        if (err.error !== 'no-speech') {
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      this.isListening = false;
      return false;
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
      soundFx.playClick();
    }
  }

  public onCommand(handler: VoiceCommandHandler) {
    this.commandListeners.push(handler);
    return () => {
      this.commandListeners = this.commandListeners.filter(h => h !== handler);
    };
  }

  private parseAndDispatchCommand(text: string) {
    const lower = text.toLowerCase().trim();
    let action = 'UNKNOWN';
    let parameter: string | undefined = undefined;
    let agent: AgentId = 'jarvis';

    if (lower.includes('friday')) agent = 'friday';
    else if (lower.includes('ultron')) agent = 'ultron';
    else if (lower.includes('edith')) agent = 'edith';

    if (lower.includes('create task') || lower.includes('add task') || lower.includes('new task')) {
      action = 'CREATE_TASK';
      parameter = text.replace(/.*(create task|add task|new task)\s*/i, '').trim();
    } else if (lower.includes('diagnostics') || lower.includes('system status') || lower.includes('report')) {
      action = 'SYSTEM_DIAGNOSTICS';
    } else if (lower.includes('clear logs') || lower.includes('purge logs')) {
      action = 'CLEAR_LOGS';
    } else if (lower.includes('security audit') || lower.includes('scan')) {
      action = 'SECURITY_AUDIT';
    } else if (lower.includes('switch personality to') || lower.includes('activate personality')) {
      action = 'SWITCH_PERSONALITY';
      const target = lower.split('personality to')[1] || lower.split('activate')[1];
      if (target) parameter = target.trim();
    } else {
      action = 'CHAT_QUERY';
      parameter = text;
    }

    const commandObj = { raw: text, action, parameter, agent };
    this.commandListeners.forEach(listener => listener(commandObj));
  }
}

export const voiceSystem = new VoiceSystemController();
