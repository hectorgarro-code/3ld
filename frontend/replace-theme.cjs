const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { search: /bg-surface-card/g, replace: 'bg-white card-shadow' },
  { search: /border-surface-elevated/g, replace: 'border-slate-100' },
  { search: /bg-surface-elevated/g, replace: 'bg-slate-50' },
  { search: /text-gray-400/g, replace: 'text-slate-500' },
  { search: /text-gray-500/g, replace: 'text-slate-400' },
  { search: /text-gray-300/g, replace: 'text-slate-400' },
  { search: /text-gray-200/g, replace: 'text-slate-800' },
  { search: /bg-surface/g, replace: 'bg-slate-50/50' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      replacements.forEach(r => {
        content = content.replace(r.search, r.replace);
      });

      // Special handling for text-white
      // We want to replace text-white with text-slate-800 IF it is NOT inside a button-like element that has bg-primary, bg-secondary, etc.
      // A simple heuristic: if the line contains bg-primary, bg-secondary, bg-accent, bg-brand-purple, bg-brand-green, bg-red-500, bg-gradient, we KEEP text-white.
      // Otherwise, we replace text-white with text-slate-800.
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('text-white')) {
          if (!lines[i].match(/bg-(primary|secondary|accent|brand-purple|brand-green|red|gradient|green|blue|slate-900)/)) {
            lines[i] = lines[i].replace(/text-white/g, 'text-slate-800');
          }
        }
      }
      content = lines.join('\n');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Theme replacement complete.');
