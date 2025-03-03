import React from 'react';

interface MiniChartProps {
  data: number[];
  color: string;
  normalize?: boolean;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, normalize = false }) => {
  const getPath = () => {
    return data.map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      let y;
      if (normalize) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        y = 20 - (((value - min) / (max - min)) * 20);
      } else {
        y = 20 - (value * 20);
      }
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="h-8 flex items-center">
      <svg className="w-full h-6" viewBox="0 0 100 20">
        <path
          d={getPath()}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

export default MiniChart; 