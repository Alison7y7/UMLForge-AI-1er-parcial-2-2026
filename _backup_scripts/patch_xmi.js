const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

// 1. isUnique and isOrdered in attributes
code = code.replace(
    /ownedAttribute\.setAttribute\("name", normalizedName\(attribute\.nombre\(\), "atributo" \+ \(index \+ 1\)\)\);/,
    `ownedAttribute.setAttribute("name", normalizedName(attribute.nombre(), "atributo" + (index + 1)));
            ownedAttribute.setAttribute("isOrdered", "false");
            ownedAttribute.setAttribute("isUnique", "true");`
);

// 2. EDGE=3 to EDGE=2
code = code.replace(
    /link\.setAttribute\("geometry", "EDGE=3;SX=0;SY=0;EX=0;EY=0;"\);/g,
    'link.setAttribute("geometry", "EDGE=2;SX=0;SY=0;EX=0;EY=0;");'
);

// 3. roles in relations
code = code.replace(
    /association\.appendChild\(associationEnd\(\s*document,\s*sourceEndId,\s*sourceId,\s*relationId,\s*"",\s*relation\.multiplicidadOrigen\(\)\s*\)\);/s,
    `association.appendChild(associationEnd(
                    document,
                    sourceEndId,
                    sourceId,
                    relationId,
                    "",
                    relation.multiplicidadOrigen(),
                    relation.rolOrigen()
                ));`
);

code = code.replace(
    /association\.appendChild\(associationEnd\(\s*document,\s*targetEndId,\s*targetId,\s*relationId,\s*switch \(type\) \{\s*case "AGREGACION" -> "shared";\s*case "COMPOSICION" -> "composite";\s*default -> "";\s*},\s*relation\.multiplicidadDestino\(\)\s*\)\);/s,
    `association.appendChild(associationEnd(
                    document,
                    targetEndId,
                    targetId,
                    relationId,
                    switch (type) {
                        case "AGREGACION" -> "shared";
                        case "COMPOSICION" -> "composite";
                        default -> "";
                    },
                    relation.multiplicidadDestino(),
                    relation.rolDestino()
                ));`
);

code = code.replace(
    /private Element associationEnd\(\s*Document document,\s*String endId,\s*String classId,\s*String associationId,\s*String aggregation,\s*String multiplicity\)\s*\{/s,
    `private Element associationEnd(
            Document document,
            String endId,
            String classId,
            String associationId,
            String aggregation,
            String multiplicity,
            String roleName) {`
);

code = code.replace(
    /end\.setAttribute\("association", associationId\);/g,
    `end.setAttribute("association", associationId);
        if (roleName != null && !roleName.isBlank()) end.setAttribute("name", roleName.trim());`
);

// Update EA connector ends roles
code = code.replace(
    /connector\.appendChild\(eaConnectorEnd\(\s*document,\s*"source",\s*classIds\.get\(relation\.origen\(\)\),\s*classLocalIds\.get\(relation\.origen\(\)\),\s*className\(modelo, relation\.origen\(\)\),\s*safeText\(relation\.multiplicidadOrigen\(\)\),\s*"none",\s*false\s*\)\);/s,
    `connector.appendChild(eaConnectorEnd(
                document,
                "source",
                classIds.get(relation.origen()),
                classLocalIds.get(relation.origen()),
                className(modelo, relation.origen()),
                safeText(relation.multiplicidadOrigen()),
                "none",
                false,
                relation.rolOrigen()
            ));`
);

code = code.replace(
    /connector\.appendChild\(eaConnectorEnd\(\s*document,\s*"target",\s*classIds\.get\(relation\.destino\(\)\),\s*classLocalIds\.get\(relation\.destino\(\)\),\s*className\(modelo, relation\.destino\(\)\),\s*safeText\(relation\.multiplicidadDestino\(\)\),\s*switch \(type\) \{\s*case "AGREGACION" -> "shared";\s*case "COMPOSICION" -> "composite";\s*default -> "none";\s*},\s*true\s*\)\);/s,
    `connector.appendChild(eaConnectorEnd(
                document,
                "target",
                classIds.get(relation.destino()),
                classLocalIds.get(relation.destino()),
                className(modelo, relation.destino()),
                safeText(relation.multiplicidadDestino()),
                switch (type) {
                case "AGREGACION" -> "shared";
                case "COMPOSICION" -> "composite";
                default -> "none";
                },
                true,
                relation.rolDestino()
            ));`
);

code = code.replace(
    /private Element eaConnectorEnd\(\s*Document document,\s*String elementName,\s*String classId,\s*int localId,\s*String className,\s*String multiplicity,\s*String aggregation,\s*boolean navigable\)\s*\{/s,
    `private Element eaConnectorEnd(
            Document document,
            String elementName,
            String classId,
            int localId,
            String className,
            String multiplicity,
            String aggregation,
            boolean navigable,
            String roleName) {`
);

code = code.replace(
    /Element role = document\.createElement\("role"\);\s*role\.setAttribute\("visibility", "Public"\);\s*role\.setAttribute\("targetScope", "instance"\);/s,
    `Element role = document.createElement("role");
        role.setAttribute("visibility", "Public");
        role.setAttribute("targetScope", "instance");
        if (roleName != null && !roleName.isBlank()) {
            role.setAttribute("name", roleName.trim());
        }`
);

fs.writeFileSync(file, code, 'utf8');
