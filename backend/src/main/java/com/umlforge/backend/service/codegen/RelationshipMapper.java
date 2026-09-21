package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlRelation;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RelationshipMapper {

    public String getClassAnnotations(UmlClass currentClass, List<UmlRelation> relations) {
        if (relations == null) return "";
        for (UmlRelation rel : relations) {
            if ("HERENCIA".equalsIgnoreCase(rel.tipo())) {
                if (rel.destino().equals(currentClass.id())) {
                    return "@Inheritance(strategy = InheritanceType.JOINED)\n";
                }
            }
        }
        return "";
    }

    public String getExtendsClause(UmlClass currentClass, List<UmlRelation> relations, List<UmlClass> allClasses) {
        if (relations == null) return "";
        for (UmlRelation rel : relations) {
            if ("HERENCIA".equalsIgnoreCase(rel.tipo())) {
                if (rel.origen().equals(currentClass.id())) {
                    UmlClass parent = findClassById(allClasses, rel.destino());
                    if (parent != null) {
                        return " extends " + toJavaClassName(parent.nombre());
                    }
                }
            }
        }
        return "";
    }

    public String generateFieldMapping(UmlClass currentClass, UmlRelation rel, UmlClass otherClass) {
        String tipo = rel.tipo();
        if ("DEPENDENCIA".equalsIgnoreCase(tipo) || "HERENCIA".equalsIgnoreCase(tipo)) {
            return "";
        }

        boolean isOrigin = rel.origen().equals(currentClass.id());
        
        String multOriginStr = rel.multiplicidadOrigen() != null ? rel.multiplicidadOrigen() : "1";
        String multDestStr = rel.multiplicidadDestino() != null ? rel.multiplicidadDestino() : "1";

        boolean originIsMany = isMany(multOriginStr);
        boolean destIsMany = isMany(multDestStr);

        boolean currentIsMany = isOrigin ? originIsMany : destIsMany;
        boolean otherIsMany = isOrigin ? destIsMany : originIsMany;

        String otherClassName = toJavaClassName(otherClass.nombre());
        String otherVarName = toJavaVarName(otherClassName);
        String currentClassName = toJavaClassName(currentClass.nombre());
        String currentVarName = toJavaVarName(currentClassName);

        StringBuilder sb = new StringBuilder();
        
        String cascade = "cascade = CascadeType.ALL";
        boolean isComposition = "COMPOSICION".equalsIgnoreCase(tipo);

        if (currentIsMany && otherIsMany) {
            if (isOrigin) {
                sb.append("    @ManyToMany\n");
                sb.append("    @JoinTable(\n");
                sb.append("     name=\"").append(currentClassName.toLowerCase()).append("_").append(otherClassName.toLowerCase()).append("\",\n");
                sb.append("     joinColumns=@JoinColumn(name=\"").append(currentClassName.toLowerCase()).append("_id\"),\n");
                sb.append("     inverseJoinColumns=@JoinColumn(name=\"").append(otherClassName.toLowerCase()).append("_id\")\n");
                sb.append("    )\n");
            } else {
                sb.append("    @ManyToMany(mappedBy=\"").append(currentVarName).append("s\")\n");
            }
            sb.append("    private List<").append(otherClassName).append("> ").append(otherVarName).append("s;\n\n");
        } else if (!currentIsMany && otherIsMany) {
            sb.append("    @OneToMany(\n");
            sb.append("        mappedBy = \"").append(currentVarName).append("\",\n");
            sb.append("        ").append(cascade);
            if (isComposition) {
                sb.append(",\n        orphanRemoval = true\n");
            } else {
                sb.append("\n");
            }
            sb.append("    )\n");
            sb.append("    private List<").append(otherClassName).append("> ").append(otherVarName).append("s;\n\n");
        } else if (currentIsMany && !otherIsMany) {
            sb.append("    @ManyToOne\n");
            sb.append("    @JoinColumn(name=\"").append(otherVarName).append("_id\")\n");
            sb.append("    private ").append(otherClassName).append(" ").append(otherVarName).append(";\n\n");
        } else {
            if (isOrigin) {
                sb.append("    @OneToOne\n");
                sb.append("    @JoinColumn(name=\"").append(otherVarName).append("_id\")\n");
            } else {
                sb.append("    @OneToOne(mappedBy=\"").append(currentVarName).append("\")\n");
            }
            sb.append("    private ").append(otherClassName).append(" ").append(otherVarName).append(";\n\n");
        }
        
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

    private String toJavaClassName(String umlName) {
        if (umlName == null || umlName.isEmpty()) return "UnknownClass";
        String name = umlName.replaceAll("\\s+", "");
        return name.substring(0, 1).toUpperCase() + name.substring(1);
    }
    
    private String toJavaVarName(String className) {
        if (className.toUpperCase().equals(className)) {
            return className.toLowerCase();
        }
        return className.substring(0, 1).toLowerCase() + className.substring(1);
    }
}
