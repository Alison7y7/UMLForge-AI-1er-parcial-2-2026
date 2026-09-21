package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import org.springframework.stereotype.Component;

@Component
public class ServiceGenerator {

    public String generateService(UmlClass umlClass, String basePackage) {
        StringBuilder sb = new StringBuilder();
        String className = toJavaClassName(umlClass.nombre());
        String varName = className.substring(0, 1).toLowerCase() + className.substring(1);
        
        sb.append("package ").append(basePackage).append(".service;\n\n");
        
        sb.append("import ").append(basePackage).append(".entity.").append(className).append(";\n");
        sb.append("import ").append(basePackage).append(".repository.").append(className).append("Repository;\n");
        sb.append("import org.springframework.stereotype.Service;\n");
        sb.append("import org.springframework.beans.factory.annotation.Autowired;\n");
        sb.append("import java.util.List;\n");
        sb.append("import java.util.Optional;\n\n");
        
        sb.append("@Service\n");
        sb.append("public class ").append(className).append("Service {\n\n");
        
        sb.append("    private final ").append(className).append("Repository repository;\n\n");
        
        sb.append("    @Autowired\n");
        sb.append("    public ").append(className).append("Service(").append(className).append("Repository repository) {\n");
        sb.append("        this.repository = repository;\n");
        sb.append("    }\n\n");
        
        // findAll
        sb.append("    public List<").append(className).append("> findAll() {\n");
        sb.append("        return repository.findAll();\n");
        sb.append("    }\n\n");
        
        // findById
        sb.append("    public Optional<").append(className).append("> findById(Long id) {\n");
        sb.append("        return repository.findById(id);\n");
        sb.append("    }\n\n");
        
        // save
        sb.append("    public ").append(className).append(" save(").append(className).append(" ").append(varName).append(") {\n");
        sb.append("        return repository.save(").append(varName).append(");\n");
        sb.append("    }\n\n");
        
        // deleteById
        sb.append("    public void deleteById(Long id) {\n");
        sb.append("        repository.deleteById(id);\n");
        sb.append("    }\n");
        
        sb.append("}\n");
        
        return sb.toString();
    }
    
    private String toJavaClassName(String umlName) {
        if (umlName == null || umlName.isEmpty()) return "UnknownClass";
        String name = umlName.replaceAll("\\s+", "");
        return name.substring(0, 1).toUpperCase() + name.substring(1);
    }
}
