package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import org.springframework.stereotype.Component;

@Component
public class RepositoryGenerator {

    public String generateRepository(UmlClass umlClass, String basePackage) {
        StringBuilder sb = new StringBuilder();
        String className = toJavaClassName(umlClass.nombre());
        
        sb.append("package ").append(basePackage).append(".repository;\n\n");
        
        sb.append("import ").append(basePackage).append(".entity.").append(className).append(";\n");
        sb.append("import org.springframework.data.jpa.repository.JpaRepository;\n");
        sb.append("import org.springframework.stereotype.Repository;\n\n");
        
        sb.append("@Repository\n");
        sb.append("public interface ").append(className).append("Repository extends JpaRepository<").append(className).append(", Long> {\n");
        sb.append("}\n");
        
        return sb.toString();
    }
    
    private String toJavaClassName(String umlName) {
        if (umlName == null || umlName.isEmpty()) return "UnknownClass";
        String name = umlName.replaceAll("\\s+", "");
        return name.substring(0, 1).toUpperCase() + name.substring(1);
    }
}
