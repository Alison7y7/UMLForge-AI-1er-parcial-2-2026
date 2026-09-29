const fs = require('fs');
let file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');

const target = `private boolean isUmlType(Element element, String expectedType) {
        return expectedType.equalsIgnoreCase(umlTypeName(element));
    }`;

const replacement = `private boolean isUmlType(Element element, String expectedType) {
        String actualType = umlTypeName(element);
        if ("AssociationClass".equalsIgnoreCase(actualType)) {
            return "Class".equalsIgnoreCase(expectedType) || "Association".equalsIgnoreCase(expectedType);
        }
        return expectedType.equalsIgnoreCase(actualType);
    }`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code, 'utf8');
