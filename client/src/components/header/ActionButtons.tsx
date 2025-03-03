import React from 'react';
import { Headphones } from 'lucide-react';

interface ActionButtonsProps {
  onAudioClick: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAudioClick
}) => {
  return (
    <button 
      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      onClick={onAudioClick}
    >
      <Headphones className="w-5 h-5 mr-2" />
      Listen to Call
    </button>
  );
};

export default ActionButtons; 