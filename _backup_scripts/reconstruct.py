import re

def process_file(filename):
    lines = []
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        for line in content.splitlines():
            m = re.match(r'^\d+:\s(.*)$', line)
            if m:
                lines.append(m.group(1))
            elif re.match(r'^\d+:$', line):
                lines.append('')
    return lines

lines1 = process_file('transcript_match.txt')
lines2 = process_file('transcript_match2.txt')

all_lines = lines1 + lines2
# Filter out duplicates if any (line 800 is in both)
final_lines = []
for i, line in enumerate(all_lines):
    if i > 0 and i == len(lines1):
        if line == lines1[-1]:
            continue # skip duplicate line 800
    final_lines.append(line)

text = '\n'.join(final_lines)

text = text.replace('if (isAssociationClass) relationId = classIds.get(relation.claseAsociacion());', '// if (isAssociationClass) ...')
text = text.replace('sourceId,\n                    relationId,\n                    relation.rolOrigen()', 'sourceId,\n                    isAssociationClass ? classIds.get(relation.claseAsociacion()) : relationId,\n                    relation.rolOrigen()')
text = text.replace('targetId,\n                    relationId,\n                    relation.rolDestino()', 'targetId,\n                    isAssociationClass ? classIds.get(relation.claseAsociacion()) : relationId,\n                    relation.rolDestino()')
text = text.replace('extendedProperties.setAttribute("associationclass", relationIds.get(association.id()));', 'extendedProperties.setAttribute("associationclass", classIds.get(umlClass.id()));')

with open(r'backend\src\main\java\com\umlforge\backend\service\XmiExportService.java', 'w', encoding='utf-8') as f:
    f.write(text)
