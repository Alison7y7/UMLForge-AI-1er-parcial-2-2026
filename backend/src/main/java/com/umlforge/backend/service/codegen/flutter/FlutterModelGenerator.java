package com.umlforge.backend.service.codegen.flutter;

import org.springframework.stereotype.Component;
import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import com.umlforge.backend.dto.UmlModelDto.UmlRelation;

import java.util.List;
import java.util.ArrayList;

@Component
public class FlutterModelGenerator {

    public String generateModel(UmlClass umlClass, UmlModelDto modelDto) {
        StringBuilder sb = new StringBuilder();
        String className = capitalize(umlClass.nombre());
        
        // Find related classes for imports
        java.util.Set<String> imports = new java.util.HashSet<>();
        
        // Find parent if HERENCIA
        String extendsClause = "";
        if (modelDto.relaciones() != null) {
            for (UmlRelation rel : modelDto.relaciones()) {
                if ("HERENCIA".equalsIgnoreCase(rel.tipo()) && rel.origen().equals(umlClass.id())) {
                    UmlClass parent = findClassById(modelDto.clases(), rel.destino());
                    if (parent != null) {
                        extendsClause = " extends " + capitalize(parent.nombre());
                        imports.add(parent.nombre().replaceAll("\\s+", "").toLowerCase() + ".dart");
                    }
                } else if (!"DEPENDENCIA".equalsIgnoreCase(rel.tipo()) && !"HERENCIA".equalsIgnoreCase(rel.tipo())) {
                    boolean isOrigin = rel.origen().equals(umlClass.id());
                    boolean isDestination = rel.destino().equals(umlClass.id());
                    if (isOrigin || isDestination) {
                        UmlClass otherClass = findClassById(modelDto.clases(), isOrigin ? rel.destino() : rel.origen());
                        if (otherClass != null) {
                            imports.add(otherClass.nombre().replaceAll("\\s+", "").toLowerCase() + ".dart");
                        }
                    }
                }
            }
        }
        
        for (String imp : imports) {
            sb.append("import '").append(imp).append("';\n");
        }
        if (!imports.isEmpty()) {
            sb.append("\n");
        }
        
        sb.append("class ").append(className).append(extendsClause).append(" {\n");
        if (extendsClause.isEmpty()) {
            sb.append("  final int? id;\n");
        } else {
            sb.append("  final int? id; // Inherited logic might require adjustments\n"); // simplistic for now
        }
        
        List<String> fields = new ArrayList<>();
        List<String> relationsFields = new ArrayList<>();
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String attrName = normalizeAttributeName(attr.nombre());
                if (attrName.equals("id")) continue;
                String dartType = mapTypeToDart(attr.tipo());
                sb.append("  final ").append(dartType).append("? ").append(attrName).append(";\n");
                fields.add(attrName);
            }
        }
        
        // Add relationship fields
        if (modelDto.relaciones() != null) {
            for (UmlRelation rel : modelDto.relaciones()) {
                String tipo = rel.tipo();
                if ("DEPENDENCIA".equalsIgnoreCase(tipo) || "HERENCIA".equalsIgnoreCase(tipo)) continue;
                
                boolean isOrigin = rel.origen().equals(umlClass.id());
                boolean isDestination = rel.destino().equals(umlClass.id());
                
                if (!isOrigin && !isDestination) continue;
                
                UmlClass otherClass = findClassById(modelDto.clases(), isOrigin ? rel.destino() : rel.origen());
                if (otherClass == null) continue;
                
                String otherClassName = capitalize(otherClass.nombre());
                String otherVarName = normalizeAttributeName(otherClassName);
                
                String multOriginStr = rel.multiplicidadOrigen() != null ? rel.multiplicidadOrigen() : "1";
                String multDestStr = rel.multiplicidadDestino() != null ? rel.multiplicidadDestino() : "1";

                boolean originIsMany = isMany(multOriginStr);
                boolean destIsMany = isMany(multDestStr);

                boolean currentIsMany = isOrigin ? originIsMany : destIsMany;
                boolean otherIsMany = isOrigin ? destIsMany : originIsMany;
                
                if (otherIsMany) {
                    sb.append("  final List<").append(otherClassName).append(">? ").append(otherVarName).append("s;\n");
                    relationsFields.add(otherVarName + "s");
                } else {
                    sb.append("  final ").append(otherClassName).append("? ").append(otherVarName).append(";\n");
                    relationsFields.add(otherVarName);
                }
            }
        }
        
        sb.append("\n  ").append(className).append("({this.id");
        for (String f : fields) {
            sb.append(", this.").append(f);
        }
        for (String rf : relationsFields) {
            sb.append(", this.").append(rf);
        }
        sb.append("});\n\n");
        
        // fromJson
        sb.append("  factory ").append(className).append(".fromJson(Map<String, dynamic> json) {\n");
        sb.append("    return ").append(className).append("(\n");
        sb.append("      id: json['id'],\n");
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String attrName = normalizeAttributeName(attr.nombre());
                if (attrName.equals("id")) continue;
                String dartType = mapTypeToDart(attr.tipo());
                
                sb.append("      ").append(attrName).append(": ");
                if (dartType.equals("double")) {
                    sb.append("json['").append(attrName).append("'] != null ? (json['").append(attrName).append("'] as num).toDouble() : null");
                } else {
                    sb.append("json['").append(attrName).append("']");
                }
                sb.append(",\n");
            }
        }
        
        // Parse relations in fromJson
        // (Just null for now or basic map if we wanted deep parsing, but standard REST usually just sends IDs or nested objects.
        // We will just do a basic map for now to prevent breaking, or parse if it's a list)
        // For simplicity, we just do null or ignore in fromJson to keep it stable, or map it.
        // Let's map it cleanly if present:
        if (modelDto.relaciones() != null) {
            for (UmlRelation rel : modelDto.relaciones()) {
                if ("DEPENDENCIA".equalsIgnoreCase(rel.tipo()) || "HERENCIA".equalsIgnoreCase(rel.tipo())) continue;
                boolean isOrigin = rel.origen().equals(umlClass.id());
                boolean isDestination = rel.destino().equals(umlClass.id());
                if (!isOrigin && !isDestination) continue;
                
                UmlClass otherClass = findClassById(modelDto.clases(), isOrigin ? rel.destino() : rel.origen());
                if (otherClass == null) continue;
                
                String otherClassName = capitalize(otherClass.nombre());
                String otherVarName = normalizeAttributeName(otherClassName);
                
                String multOriginStr = rel.multiplicidadOrigen() != null ? rel.multiplicidadOrigen() : "1";
                String multDestStr = rel.multiplicidadDestino() != null ? rel.multiplicidadDestino() : "1";
                boolean otherIsMany = isOrigin ? isMany(multDestStr) : isMany(multOriginStr);
                
                if (otherIsMany) {
                    sb.append("      ").append(otherVarName).append("s: json['").append(otherVarName).append("s'] != null ? (json['").append(otherVarName).append("s'] as List).map((i) => ").append(otherClassName).append(".fromJson(i)).toList() : null,\n");
                } else {
                    sb.append("      ").append(otherVarName).append(": json['").append(otherVarName).append("'] != null ? ").append(otherClassName).append(".fromJson(json['").append(otherVarName).append("']) : null,\n");
                }
            }
        }
        
        sb.append("    );\n");
        sb.append("  }\n\n");
        
        // toJson
        sb.append("  Map<String, dynamic> toJson() {\n");
        sb.append("    final Map<String, dynamic> data = {};\n");
        sb.append("    if (id != null) data['id'] = id;\n");
        for (String f : fields) {
            sb.append("    if (").append(f).append(" != null) data['").append(f).append("'] = ").append(f).append(";\n");
        }
        // Exclude deep relationship serialization for now to avoid circular JSON, or just do IDs
        // Simplest is to not serialize relations back, or serialize as nested.
        // We'll serialize nested for consistency.
        if (modelDto.relaciones() != null) {
            for (UmlRelation rel : modelDto.relaciones()) {
                if ("DEPENDENCIA".equalsIgnoreCase(rel.tipo()) || "HERENCIA".equalsIgnoreCase(rel.tipo())) continue;
                boolean isOrigin = rel.origen().equals(umlClass.id());
                boolean isDestination = rel.destino().equals(umlClass.id());
                if (!isOrigin && !isDestination) continue;
                UmlClass otherClass = findClassById(modelDto.clases(), isOrigin ? rel.destino() : rel.origen());
                if (otherClass == null) continue;
                
                String otherClassName = capitalize(otherClass.nombre());
                String otherVarName = normalizeAttributeName(otherClassName);
                boolean otherIsMany = isOrigin ? isMany(rel.multiplicidadDestino() != null ? rel.multiplicidadDestino() : "1") : isMany(rel.multiplicidadOrigen() != null ? rel.multiplicidadOrigen() : "1");
                
                if (otherIsMany) {
                    sb.append("    if (").append(otherVarName).append("s != null) data['").append(otherVarName).append("s'] = ").append(otherVarName).append("s?.map((v) => v.toJson()).toList();\n");
                } else {
                    sb.append("    if (").append(otherVarName).append(" != null) data['").append(otherVarName).append("'] = ").append(otherVarName).append("?.toJson();\n");
                }
            }
        }

        sb.append("    return data;\n");
        sb.append("  }\n");
        
        sb.append("}\n");
        
        return sb.toString();
    }
    
    private boolean isMany(String m) {
        String lower = m.toLowerCase();
        return lower.contains("*") || lower.contains("n");
    }
    
    private UmlClass findClassById(List<UmlClass> clases, String id) {
        if (clases == null) return null;
        for (UmlClass c : clases) {
            if (c.id().equals(id)) return c;
        }
        return null;
    }

    private String normalizeAttributeName(String umlName) {
        if (umlName == null || umlName.isEmpty()) return "unknownAttribute";
        String name = umlName.replaceAll("\\s+", "");
        if (name.toUpperCase().equals(name)) {
            return name.toLowerCase();
        }
        return name.substring(0, 1).toLowerCase() + name.substring(1);
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        String name = str.replaceAll("\\s+", "");
        return name.substring(0, 1).toUpperCase() + name.substring(1);
    }

    private String mapTypeToDart(String umlType) {
        if (umlType == null) return "String";
        return switch (umlType.toLowerCase()) {
            case "int", "integer", "long", "longdate" -> "int";
            case "boolean", "bool" -> "bool";
            case "double", "float", "real", "bigdecimal" -> "double";
            default -> "String";
        };
    }
}
