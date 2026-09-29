const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// Use regex to avoid whitespace issues
content = content.replace(
    /<header className="h-14 bg-white\/95 backdrop-blur-md border-b border-lila-light\/50 flex items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 overflow-x-auto">\s*<div className="flex items-center gap-4 shrink-0">/,
    `<header className="h-auto min-h-[3.5rem] py-2 bg-white/95 backdrop-blur-md border-b border-lila-light/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 overflow-x-auto w-full">
        <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-4 shrink-0">`
);

content = content.replace(
    /<div className="flex items-center gap-4 shrink-0">\s*<div className="flex items-center gap-2 border-r border-gray-200 pr-4">/,
    `<div className="flex items-center gap-2 md:gap-4 shrink-0 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">`
);

content = content.replace(
    /<aside className="w-14 lg:w-48 bg-white\/95 backdrop-blur-md border-r border-lila-light\/50 flex flex-col py-4 z-40 shadow-\[4px_0_24px_rgba\(139,92,246,0\.03\)\] overflow-y-auto shrink-0">/,
    `<aside className="w-14 lg:w-48 bg-white/95 backdrop-blur-md border-r border-lila-light/50 flex flex-col py-4 z-40 shadow-[4px_0_24px_rgba(139,92,246,0.03)] overflow-y-auto shrink-0 h-full">`
);

content = content.replace(
    /<aside className="absolute inset-y-0 right-0 w-80 max-w-\[calc\(100%_-_3\.5rem\)\] lg:static lg:max-w-none bg-white\/95 backdrop-blur-md border-l border-lila-light\/50 shadow-\[-4px_0_24px_rgba\(139,92,246,0\.03\)\] flex flex-col z-40 overflow-hidden shrink-0">/,
    `<aside className="hidden lg:flex absolute inset-y-0 right-0 w-80 max-w-[calc(100%_-_3.5rem)] lg:static lg:max-w-none bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex-col z-40 overflow-hidden shrink-0">`
);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', content, 'utf8');
