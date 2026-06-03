const fs = require('fs');

function replaceClasses(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace inputs in usuarios.js and clientes.js
    content = content.split('class="min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"').join('class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"');
    
    // Replace selects in usuarios.js and clientes.js
    content = content.split('class="min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"').join('class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer"');
    
    // Replace inputs in roles-permisos.js
    content = content.split('class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold"').join('class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"');
    
    // Replace textareas in roles-permisos.js
    content = content.split('class="p-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/20 text-xs font-semibold resize-none"').join('class="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all resize-y"');
    
    // Replace selects in roles-permisos.js
    content = content.split('class="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none text-xs font-semibold cursor-pointer"').join('class="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:bg-white focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer"');
    
    fs.writeFileSync(file, content);
}

replaceClasses('dashboard/modules/usuarios.js');
replaceClasses('dashboard/modules/clientes.js');
replaceClasses('dashboard/modules/roles-permisos.js');
console.log('Styles updated.');
