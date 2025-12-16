/// <reference types="vite/client" />

// Web Speech API type definitions (since the npm package doesn't exist)
interface SpeechSynthesisUtterance {
  new(text?: string): SpeechSynthesisUtterance;
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;
}

interface Window {
  SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
}

// Declare the type globally
declare var SpeechSynthesisUtterance: {
  prototype: SpeechSynthesisUtterance;
  new(text?: string): SpeechSynthesisUtterance;
};
