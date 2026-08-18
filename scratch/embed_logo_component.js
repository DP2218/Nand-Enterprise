const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\pdivy\\.gemini\\antigravity-ide\\brain\\231817b1-03a5-45f1-8c46-4a374d86e26d\\.user_uploaded\\media_1787032949181.png';
const logoTsxPath = path.join(__dirname, '..', 'components', 'ui', 'Logo.tsx');

const imgBuf = fs.readFileSync(srcPath);
const base64 = imgBuf.toString('base64');

const code = `'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
};

const LOGO_DATA_URI = 'data:image/png;base64,${base64}';

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  return (
    <div className={\`relative inline-flex items-center justify-center shrink-0 \${sizeMap[size]} \${className}\`}>
      <img
        src={LOGO_DATA_URI}
        alt="NAND Enterprise Logo"
        className="h-full w-auto max-w-full object-contain rounded-md"
      />
    </div>
  );
}
`;

fs.writeFileSync(logoTsxPath, code);
console.log('✅ Generated self-contained Logo.tsx with inline Data URI!');
