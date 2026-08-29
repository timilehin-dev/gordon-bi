export interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecutePrompt: (promptText: string) => void;
}
