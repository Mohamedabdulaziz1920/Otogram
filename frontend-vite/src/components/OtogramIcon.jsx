import React from 'react';
import './OtogramIcon.css';

const OtogramIcon = ({ size = 60, className = "" }) => {
  return (
    <div 
      className={`otogram-logo-container ${className}`}
      style={{ 
        width: size, 
        height: size 
      }}
    >
      {/* استخدام favicon.svg - الأفضل للتكبير */}
      <img 
        src="/favicon.svg" 
        alt="Otogram" 
        className="otogram-logo-main"
      />
      <img 
        src="/favicon.svg" 
        alt="" 
        className="otogram-logo-glow"
        aria-hidden="true"
      />
    </div>
  );
};


export default OtogramIcon;
