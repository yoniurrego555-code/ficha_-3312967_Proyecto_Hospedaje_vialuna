const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/yoniu/OneDrive/Escritorio/Proyecto_Hospedaje_vialuna/frontend/public';
const files = ['habitaciones.html', 'servicios.html', 'paquetes.html'];
const asterisk = ' <span class="text-red-500">*</span>';

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  // Find all input/select/textarea with 'required'
  const regex = /<(input|select|textarea)[^>]*?id=[\"']([^\"']+)[\"'][^>]*?required[^>]*?>/gi;
  let match;
  const requiredIds = new Set();
  while ((match = regex.exec(content)) !== null) {
    requiredIds.add(match[2]);
  }
  
  console.log(`File: ${f}, Required IDs:`, Array.from(requiredIds));

  requiredIds.forEach(id => {
    // Find the corresponding label tag completely up to </label>
    const labelRegex = new RegExp('(<label[^>]*?for=[\"\']' + id + '[\"\'][^>]*?>.*?)(</label>)', 'is');
    const labelMatch = content.match(labelRegex);
    if (labelMatch) {
      if (!labelMatch[0].includes('text-red-500')) {
        content = content.replace(labelRegex, `$1${asterisk}$2`);
      }
    }
  });

  fs.writeFileSync(p, content);
  console.log(`Processed ${f}`);
});
