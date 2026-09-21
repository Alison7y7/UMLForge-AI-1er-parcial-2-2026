package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import com.umlforge.backend.dto.UmlModelDto.UmlRelation;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EntityGenerator {

    private final RelationshipMapper relationshipMapper;

    public EntityGenerator(RelationshipMapper relationshipMapper) {
        this.relationshipMapper = relationshipMapper;
    }

    public String generateEntity(UmlClass umlClass, UmlModelDto modelDto, String basePackage) {
        StringBuilder sb = new StringBuilder();
        String className = toJavaClassName(umlClass.nombre());
        
        // Package
        sb.append("package ").append(basePackage).append(".entity;\n\n");
        
        // Imports
        sb.append("import jakarta.persistence.*;\n");
        sb.append("import lombok.Data;\n");
        sb.append("import lombok.NoArgsConstructor;\n");
        sb.append("import lombok.AllArgsConstructor;\n");
        sb.append("import java.util.List;\n\n");
        
        // Annotations
        sb.append("@Data\n");
        sb.append("@NoArgsConstructor\n");
        sb.append("@AllArgsConstructor\n");
        sb.append("@Entity\n");
        sb.append("@Table(name = \"").append(className.toLowerCase()).append("\")\n");
        sb.append(relationshipMapper.getClassAnnotations(umlClass, modelDto.relaciones()));
        
        // Class definition
        String extendsClause = relationshipMapper.getExtendsClause(umlClass, modelDto.relaciones(), modelDto.clases());
        sb.append("public class ").append(className).append(extendsClause).append(" {\n\n");
        
        boolean hasId = false;
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                if (toJavaAttributeName(attr.nombre()).equalsIgnoreCase("id")) {
                    hasId = true;
                    break;
                }
            }
        }
        
        // Default ID
        if (!hasId) {
            sb.append("    @Id\n");
            sb.append("    @GeneratedValue(strategy = GenerationType.IDENTITY)\n");
            sb.append("    private Long id;\n\n");
        }
        
        // Attributes
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String type = mapType(attr.tipo());
                String name = toJavaAttributeName(attr.nombre());
                
                if (name.equalsIgnoreCase("id")) {
                    sb.append("    @Id\n");
                    sb.append("    @GeneratedValue(strategy = GenerationType.IDENTITY)\n");
                }
                
                sb.append("    private ").append(type).append(" ").append(name).append(";\n");
            }
            if (!umlClass.atributos().isEmpty()) {
                sb.append("\n");
            }
        }
        
        // Relations
        if (modelDto.relaciones() != null) {
            for (UmlRelation rel : modelDto.relaciones()) {
                boolean isOrigin = rel.origen().equals(umlClass.id());
                boolean isDestination = rel.destino().equals(umlClass.id());
                
                if (!isOrigin && !isDestination) continue;
                
                UmlClass otherClass = findClassById(modelDto.clases(), isOrigin ? rel.destino() : rel.origen());
                if (otherClass == null) continue;

                sb.append(relationshipMapper.generateFieldMapping(umlClass, rel, otherClass));
            }
        }
        
        sb.append("}\n");
        
        return sb.toString();
    }
    
    private UmlClass findClassById(List<UmlClass> clases, String id) {
        if (clases == null) return null;
        for (UmlClass c : clases) {
            if (c.id().equals(id)) return c;
        }
        return null;
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
