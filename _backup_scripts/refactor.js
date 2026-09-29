const fs = require('fs');
const files = [
    'frontend/src/pages/Dashboard.tsx',
    'frontend/src/pages/Usuarios.tsx',
    'frontend/src/pages/Roles.tsx',
    'frontend/src/pages/Bitacora.tsx',
    'frontend/src/pages/Proyectos.tsx',
    'frontend/src/pages/ProjectDiagrams.tsx'
];
files.forEach(filepath => {
    let content = fs.readFileSync(filepath, 'utf8');
    if (!content.includes('import Layout')) {
        content = content.replace(/(import .* from 'lucide-react';)/, '$1\nimport Layout from "../components/Layout";');
    }
    let match = content.match(/<\/header>([\s\S]*?)<\/div>\s*<\/main>/) || content.match(/<\/header>([\s\S]*?)<\/main>/);
    if (match) {
        let inner_content = match[1].trim();
        if (inner_content.endsWith('</div>')) {
            inner_content = inner_content.slice(0, -6).trim();
        }
        let return_start = content.indexOf('return (');
        let modals_match = content.match(/<\/main>([\s\S]*?)\s*<\/div>\s*\);\s*}/);
        let modals = modals_match ? modals_match[1].trim() : '';
        let new_return = `return (
    <Layout>
      ${inner_content}
      ${modals}
    </Layout>
  );
}`;
        content = content.slice(0, return_start) + new_return;
        fs.writeFileSync(filepath, content, 'utf8');
        console.log('Refactored ' + filepath);
    } else {
        console.log('Could not find match in ' + filepath);
    }
});
