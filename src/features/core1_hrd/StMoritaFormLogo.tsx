import React, { useState } from 'react';

export const StMoritaFormLogo: React.FC = () => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <div className="flex flex-col items-center justify-center p-1">
        <img
          src="/logo.png"
          alt="PT. St. Morita Industries"
          className="max-h-14 w-auto object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center leading-tight py-1">
      <span className="text-lg font-black tracking-tight text-blue-900">ST. MORITA</span>
      <span className="text-[10px] font-semibold italic text-slate-700">
        PT. St. Morita Industries
      </span>
    </div>
  );
};

