const fs = require('fs');
const path = require('path');

function checkImports(dir) {
    let errors = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === 'public' || file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            errors = errors.concat(checkImports(fullPath));
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const requires = [...content.matchAll(/require\(['"]([^'"]+)['"]\)/g)];
            const imports = [...content.matchAll(/import.*?from\s+['"]([^'"]+)['"]/g)];
            
            for (const match of [...requires, ...imports]) {
                const importPath = match[1];
                if (!importPath.startsWith('.')) continue; // Skip node_modules
                
                let targetPath = path.resolve(path.dirname(fullPath), importPath);
                
                // Tratar de resolver .js si no tiene extensión
                if (!fs.existsSync(targetPath)) {
                    if (fs.existsSync(targetPath + '.js')) targetPath += '.js';
                    else if (fs.existsSync(path.join(targetPath, 'index.js'))) targetPath = path.join(targetPath, 'index.js');
                }
                
                if (fs.existsSync(targetPath)) {
                    // Verificar case sensitivity (Windows vs Linux)
                    const dirName = path.dirname(targetPath);
                    const baseName = path.basename(targetPath);
                    const actualFiles = fs.readdirSync(dirName);
                    if (!actualFiles.includes(baseName)) {
                        errors.push(`CASE MISMATCH en ${fullPath}: Importa '${importPath}', pero el archivo real se llama distinto (Linux fallará).`);
                    }
                } else {
                    errors.push(`NOT FOUND en ${fullPath}: Importa '${importPath}' pero no existe.`);
                }
            }
        }
    }
    return errors;
}

const backendErrs = checkImports(path.join(__dirname, 'backend', 'src'));
console.log("BACKEND ERRORS:", backendErrs);
