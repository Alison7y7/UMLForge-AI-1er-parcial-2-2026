import os
import re

files_to_refactor = [
    "frontend/src/pages/Dashboard.tsx",
    "frontend/src/pages/Usuarios.tsx",
    "frontend/src/pages/Roles.tsx",
    "frontend/src/pages/Bitacora.tsx",
    "frontend/src/pages/Proyectos.tsx",
    "frontend/src/pages/ProjectDiagrams.tsx"
]

for filepath in files_to_refactor:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for Layout
    if "import Layout" not in content:
        content = re.sub(r"(import .* from 'lucide-react';)", r"\1\nimport Layout from '../components/Layout';", content)
    
    match = re.search(r'</header>(.*?)</div>\s*</main>', content, re.DOTALL)
    if not match:
        match = re.search(r'</header>(.*?)</main>', content, re.DOTALL)
        
    if match:
        inner_content = match.group(1).strip()
        if inner_content.endswith('</div>'):
             inner_content = inner_content[:-6].strip() # remove extra div closing tag for max-w-7xl
        
        return_start = content.find('return (')
        
        modals_match = re.search(r'</main>(.*?)\s*</div>\s*\);\s*}', content, re.DOTALL)
        modals = ""
        if modals_match:
            modals = modals_match.group(1).strip()
        
        new_return = f"""return (
    <Layout>
      {inner_content}
      {modals}
    </Layout>
  );
}}"""
        content = content[:return_start] + new_return
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored {filepath}")
    else:
        print(f"Could not find match in {filepath}")
