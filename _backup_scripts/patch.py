import re

with open(r'backend\src\main\java\com\umlforge\backend\service\XmiExportService.java', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('if (isAssociationClass) relationId = classIds.get(relation.claseAsociacion());', '// if (isAssociationClass) ...')
text = text.replace('sourceId, relationId, relation.rolOrigen', 'sourceId, isAssociationClass ? classIds.get(relation.claseAsociacion()) : relationId, relation.rolOrigen')
text = text.replace('targetId, relationId, relation.rolDestino', 'targetId, isAssociationClass ? classIds.get(relation.claseAsociacion()) : relationId, relation.rolDestino')
text = text.replace('extendedProperties.setAttribute(\"associationclass\", relationIds.get(association.id()));', 'extendedProperties.setAttribute(\"associationclass\", classIds.get(umlClass.id()));')

with open(r'backend\src\main\java\com\umlforge\backend\service\XmiExportService.java', 'w', encoding='utf-8') as f:
    f.write(text)
