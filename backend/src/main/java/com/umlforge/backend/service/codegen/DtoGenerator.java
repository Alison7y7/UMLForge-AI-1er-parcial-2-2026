package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import org.springframework.stereotype.Component;

@Component
public class DtoGenerator {

    public String generateRequestDto(UmlClass umlClass, String basePackage) {
        StringBuilder sb = new StringBuilder();
        String className = toJavaClassName(umlClass.nombre());
        
        sb.append("package ").append(basePackage).append(".dto;\n\n");
        sb.append("import jakarta.validation.constraints.NotNull;\n");
        sb.append("import jakarta.validation.constraints.NotBlank;\n\n");
        
        boolean hasId = false;
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                if (toJavaAttributeName(attr.nombre()).equalsIgnoreCase("id")) {
                    hasId = true;
                    break;
                }
            }
        }
        
        sb.append("public record ").append(className).append("Request(\n");
        
        if (umlClass.atributos() != null && !umlClass.atributos().isEmpty()) {
            boolean first = true;
            for (int i = 0; i < umlClass.atributos().size(); i++) {
                UmlAttribute attr = umlClass.atributos().get(i);
                String type = mapType(attr.tipo());
                String name = toJavaAttributeName(attr.nombre());
                
                if (name.equalsIgnoreCase("id")) continue;
                
                if (!first) {
                    sb.append(",\n");
                }
                first = false;
                
                if (type.equals("String")) {
                    sb.append("    @NotBlank(message = \"El campo ").append(name).append(" es obligatorio\")\n");
                } else {
                    sb.append("    @NotNull(message = \"El campo ").append(name).append(" es obligatorio\")\n");
                }
                
                sb.append("    ").append(type).append(" ").append(name);
            }
            if (!first) {
                sb.append("\n");
            }
        }
        
        sb.append(") {}\n");
        return sb.toString();
    }

    public String generateResponseDto(UmlClass umlClass, String basePackage) {
        StringBuilder sb = new StringBuilder();
        String className = toJavaClassName(umlClass.nombre());
        
        boolean hasId = false;
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                if (toJavaAttributeName(attr.nombre()).equalsIgnoreCase("id")) {
                    hasId = true;
                    break;
                }
            }
        }
        
        sb.append("package ").append(basePackage).append(".dto;\n\n");
        
        sb.append("public record ").append(className).append("Response(\n");
        
        boolean first = true;
        if (!hasId) {
            sb.append("    Long id");
            first = false;
        }
        
        if (umlClass.atributos() != null && !umlClass.atributos().isEmpty()) {
            for (int i = 0; i < umlClass.atributos().size(); i++) {
                UmlAttribute attr = umlClass.atributos().get(i);
                String type = mapType(attr.tipo());
                String name = toJavaAttributeName(attr.nombre());
                
                if (!first) {
                    sb.append(",\n");
                }
                first = false;
                
                sb.append("    ").append(type).append(" ").append(name);
            }
            if (!first) {
                sb.append("\n");
            }
        } else {
            if (!first) {
                sb.append("\n");
            }
        }
        
        sb.append(") {\n");
        
        // Factory method from Entity
        sb.append("    public static ").append(className).append("Response fromEntity(").append(basePackage).append(".entity.").append(className).append(" entity) {\n");
        sb.append("        if (entity == null) return null;\n");
        sb.append("        return new ").append(className).append("Response(\n");
        
        first = true;
        if (!hasId) {
            sb.append("            entity.getId()");
            first = false;
        }
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String name = toJavaAttributeName(attr.nombre());
                String getter = "get" + name.substring(0, 1).toUpperCase() + name.substring(1);
                
                if (!first) {
                    sb.append(",\n");
                }
                first = false;
                
                sb.append("            entity.").append(getter).append("()");
            }
        }
        sb.append("\n        );\n");
        sb.append("    }\n");
        
        sb.append("}\n");
        return sb.toString();
    }

    private String toJavaClassName(String umlName) {
        if (umlName == null || umlName.isEmpty()) return "UnknownClass";
        String name = umlName.replaceAll("\\s+", "");
        return name.substring(0, 1).toUpperCase() + name.substring(1);
    }
    
    private String toJavaAttributeName(String umlName) {
        if (umlName == null || umlName.isEmpty()) return "unknownAttribute";
        String name = umlName.replaceAll("\\s+", "");
        if (name.toUpperCase().equals(name)) {
            return name.toLowerCase();
        }
        return name.substring(0, 1).toLowerCase() + name.substring(1);
    }
    
    private String mapType(String umlType) {
        if (umlType == null) return "String";
        return switch (umlType.toLowerCase()) {
            case "int", "integer" -> "Integer";
            case "long", "longdate" -> "Long";
            case "boolean", "bool" -> "Boolean";
            case "double", "float", "real" -> "Double";
            case "date", "datetime" -> "java.time.LocalDateTime";
            case "bigdecimal" -> "java.math.BigDecimal";
            default -> "String";
        };
    }
}
