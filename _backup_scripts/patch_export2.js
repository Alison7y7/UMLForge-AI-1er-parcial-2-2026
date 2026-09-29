const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

// 1. In exportar(), we need to know which classes are Association Classes
const mapAssocClasses = `Map<String, String> relationAssocClassMap = new HashMap<>();
            for (XmiImportResponse.UmlRelation relation : modelo.relaciones()) {
                if (relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank()) {
                    relationAssocClassMap.put(relation.claseAsociacion(), relation.id());
                }
            }

            for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {`;
code = code.replace(`for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {`, mapAssocClasses);

// 2. In the first loop of exportar() (where standard UML Class is output), we MUST change xmi:type to uml:AssociationClass
// and append the memberEnds and ownedEnds!
const classLoopStart = `for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
                String xmiId = classIds.get(umlClass.id());

                Element classElement = packagedElement(document, "uml:Class", xmiId, umlClass.nombre());`;

const classLoopNew = `for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
                String xmiId = classIds.get(umlClass.id());
                
                boolean isAssocClass = relationAssocClassMap.containsKey(umlClass.id());
                String elementType = isAssocClass ? "uml:AssociationClass" : "uml:Class";

                Element classElement = packagedElement(document, elementType, xmiId, umlClass.nombre());
                
                if (isAssocClass) {
                    // Find the relation
                    String relId = relationAssocClassMap.get(umlClass.id());
                    XmiImportResponse.UmlRelation relation = modelo.relaciones().stream()
                        .filter(r -> r.id().equals(relId)).findFirst().orElse(null);
                        
                    if (relation != null) {
                        String relationId = stableId("RELATION", relation.id());
                        String sourceId = classIds.get(relation.origen());
                        String targetId = classIds.get(relation.destino());
                        String sourceEndId = stableId("END_SOURCE", relation.id());
                        String targetEndId = stableId("END_TARGET", relation.id());
                        
                        classElement.setAttribute("memberEnd", sourceEndId + " " + targetEndId);
                        classElement.appendChild(associationEnd(
                            document,
                            sourceEndId,
                            sourceId,
                            xmiId, // The association is the class itself!
                            "",
                            relation.multiplicidadOrigen(),
                            relation.rolOrigen()
                        ));
                        classElement.appendChild(associationEnd(
                            document,
                            targetEndId,
                            targetId,
                            xmiId, // The association is the class itself!
                            "ASOCIACION".equals(normalizedRelationType(relation.tipo())) ? "none" : ("AGREGACION".equals(normalizedRelationType(relation.tipo())) ? "shared" : "composite"),
                            relation.multiplicidadDestino(),
                            relation.rolDestino()
                        ));
                    }
                }`;

code = code.replace(classLoopStart, classLoopNew);

// 3. In appendRelations, we MUST SKIP generating the standard UML Association for the relation, because it's already in the AssociationClass!
const relLoopStart = `for (XmiImportResponse.UmlRelation relation : relations) {
            String type = normalizedRelationType(relation.tipo());
            String relationId = stableId("RELATION", relation.id());
            relationIds.put(relation.id(), relationId);
            String sourceId = classIds.get(relation.origen());
            String targetId = classIds.get(relation.destino());

            if (ASSOCIATION_TYPES.contains(type)) {`;

const relLoopNew = `for (XmiImportResponse.UmlRelation relation : relations) {
            String type = normalizedRelationType(relation.tipo());
            String relationId = stableId("RELATION", relation.id());
            relationIds.put(relation.id(), relationId);
            String sourceId = classIds.get(relation.origen());
            String targetId = classIds.get(relation.destino());

            if (ASSOCIATION_TYPES.contains(type)) {
                if (relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank()) {
                    // It is an Association Class. We ALREADY generated standard UML for it in the Class loop.
                    // We just skip standard UML generation here, but relationIds has the EAID_RELATION for EA extensions!
                    continue;
                }`;

code = code.replace(relLoopStart, relLoopNew);

// 4. In EA extension elements, for the Class, add extendedProperties associationclass="EAID_RELATION"
const eaElementProp = `properties.setAttribute("isLeaf", "false");
            if (umlClass.estereotipo() != null && !umlClass.estereotipo().isBlank()) {
                properties.setAttribute("stereotype", umlClass.estereotipo().trim());
            }
            element.appendChild(properties);`;

const eaElementPropNew = `properties.setAttribute("isLeaf", "false");
            if (umlClass.estereotipo() != null && !umlClass.estereotipo().isBlank()) {
                properties.setAttribute("stereotype", umlClass.estereotipo().trim());
            }
            element.appendChild(properties);
            
            // Link to the connector
            if (relationIds.values().contains(stableId("RELATION", relationAssocClassMap.get(umlClass.id())))) {
                Element extProps = document.createElement("extendedProperties");
                extProps.setAttribute("associationclass", stableId("RELATION", relationAssocClassMap.get(umlClass.id())));
                element.appendChild(extProps);
            }`;

code = code.replace(eaElementProp, eaElementPropNew);

// 5. In EA extension connectors, add extendedProperties associationclass="EAID_CLASS"
const eaConnProp = `connector.appendChild(document.createElement("extendedProperties"));
            connector.appendChild(document.createElement("style"));`;

const eaConnPropNew = `Element extProps = document.createElement("extendedProperties");
            if (relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank()) {
                extProps.setAttribute("associationclass", classIds.get(relation.claseAsociacion()));
            }
            connector.appendChild(extProps);
            connector.appendChild(document.createElement("style"));`;

code = code.replace(eaConnProp, eaConnPropNew);

// Fix relationAssocClassMap visibility in appendEaExtension
const eaExtSigOld = `private void appendEaExtension(
            Document document,
            Element root,
            String modelName,
            String packageId,
            String diagramId,
            XmiImportResponse modelo,
            Map<String, String> classIds,
            Map<String, String> relationIds) {`;

const eaExtSigNew = `private void appendEaExtension(
            Document document,
            Element root,
            String modelName,
            String packageId,
            String diagramId,
            XmiImportResponse modelo,
            Map<String, String> classIds,
            Map<String, String> relationIds,
            Map<String, String> relationAssocClassMap) {`;

code = code.replace(eaExtSigOld, eaExtSigNew);
code = code.replace(`appendEaExtension(
                document,
                root,
                safeModelName,
                packageId,
                diagramId,
                modelo,
                classIds,
                relationIds
            );`, `appendEaExtension(
                document,
                root,
                safeModelName,
                packageId,
                diagramId,
                modelo,
                classIds,
                relationIds,
                relationAssocClassMap
            );`);

fs.writeFileSync(file, code, 'utf8');
