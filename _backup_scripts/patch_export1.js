const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

// Update map generation
const startLoopClass = 'for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {';
const newLoopClass = `Map<String, String> relationAssocClassMap = new java.util.HashMap<>();
            for (XmiImportResponse.UmlRelation relation : modelo.relaciones()) {
                if (relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank()) {
                    relationAssocClassMap.put(relation.claseAsociacion(), relation.id());
                }
            }

            for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
                String xmiId;
                if (relationAssocClassMap.containsKey(umlClass.id())) {
                    xmiId = stableId("RELATION", relationAssocClassMap.get(umlClass.id()));
                } else {
                    xmiId = stableId("CLASS", umlClass.id());
                }
                classIds.put(umlClass.id(), xmiId);
                classNames.putIfAbsent(umlClass.nombre(), xmiId);
            }

            for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
                if (relationAssocClassMap.containsKey(umlClass.id())) continue;`;

code = code.replace(`for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {\n                String xmiId = stableId("CLASS", umlClass.id());\n                classIds.put(umlClass.id(), xmiId);\n                classNames.putIfAbsent(umlClass.nombre(), xmiId);\n            }\n\n            for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {`, newLoopClass);

// Update appendRelations call
code = code.replace(`Map<String, String> relationIds = appendRelations(\n                document,\n                umlPackage,\n                modelo.relaciones(),`, `Map<String, String> relationIds = appendRelations(\n                document,\n                umlPackage,\n                modelo,\n                classNames,`);

code = code.replace(`private Map<String, String> appendRelations(\n            Document document,\n            Element umlPackage,\n            List<XmiImportResponse.UmlRelation> relations,\n            Map<String, String> classIds,\n            Map<String, Element> classElements) {`, `private Map<String, String> appendRelations(\n            Document document,\n            Element umlPackage,\n            XmiImportResponse modelo,\n            Map<String, String> classNames,\n            Map<String, String> classIds,\n            Map<String, Element> classElements) {`);

// Update appendRelations body
const oldAssoc = `if (ASSOCIATION_TYPES.contains(type)) {
                Element association = packagedElement(
                    document,
                    "uml:Association",
                    relationId,
                    relation.nombre() == null ? "" : relation.nombre().trim()
                );`;
const newAssoc = `if (ASSOCIATION_TYPES.contains(type)) {
                boolean isAssocClass = relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank();
                String elemType = isAssocClass ? "uml:AssociationClass" : "uml:Association";
                
                String assocName = relation.nombre() == null ? "" : relation.nombre().trim();
                XmiImportResponse.UmlClass assocClass = null;
                if (isAssocClass) {
                    assocClass = modelo.clases().stream().filter(c -> c.id().equals(relation.claseAsociacion())).findFirst().orElse(null);
                    if (assocClass != null && assocName.isEmpty()) {
                        assocName = assocClass.nombre();
                    }
                }

                Element association = packagedElement(
                    document,
                    elemType,
                    relationId,
                    assocName
                );
                
                if (isAssocClass && assocClass != null) {
                    appendAttributes(document, association, assocClass, classNames);
                    appendMethods(document, association, assocClass, classNames);
                }`;

code = code.replace(oldAssoc, newAssoc);
code = code.replace(`for (XmiImportResponse.UmlRelation relation : relations) {`, `for (XmiImportResponse.UmlRelation relation : modelo.relaciones()) {`);

fs.writeFileSync(file, code, 'utf8');
