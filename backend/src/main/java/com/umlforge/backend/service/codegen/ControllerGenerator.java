package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import org.springframework.stereotype.Component;

@Component
public class ControllerGenerator {

    public String generateController(UmlClass umlClass, String basePackage) {
        StringBuilder sb = new StringBuilder();
        String className = toJavaClassName(umlClass.nombre());
        String varName = className.substring(0, 1).toLowerCase() + className.substring(1);
        String endpoint = className.toLowerCase() + "s";
        
        sb.append("package ").append(basePackage).append(".controller;\n\n");
        
        sb.append("import ").append(basePackage).append(".entity.").append(className).append(";\n");
        sb.append("import ").append(basePackage).append(".dto.").append(className).append("Request;\n");
        sb.append("import ").append(basePackage).append(".dto.").append(className).append("Response;\n");
        sb.append("import ").append(basePackage).append(".service.").append(className).append("Service;\n");
        sb.append("import org.springframework.http.ResponseEntity;\n");
        sb.append("import org.springframework.web.bind.annotation.*;\n");
        sb.append("import jakarta.validation.Valid;\n");
        sb.append("import java.util.List;\n");
        sb.append("import java.util.stream.Collectors;\n\n");
        
        sb.append("@RestController\n");
        sb.append("@RequestMapping(\"/api/").append(endpoint).append("\")\n");
        sb.append("public class ").append(className).append("Controller {\n\n");
        
        sb.append("    private final ").append(className).append("Service service;\n\n");
        
        sb.append("    public ").append(className).append("Controller(").append(className).append("Service service) {\n");
        sb.append("        this.service = service;\n");
        sb.append("    }\n\n");
        
        // GET
        sb.append("    @GetMapping\n");
        sb.append("    public List<").append(className).append("Response> getAll() {\n");
        sb.append("        return service.findAll().stream()\n");
        sb.append("                .map(").append(className).append("Response::fromEntity)\n");
        sb.append("                .collect(Collectors.toList());\n");
        sb.append("    }\n\n");
        
        // GET by ID
        sb.append("    @GetMapping(\"/{id}\")\n");
        sb.append("    public ResponseEntity<").append(className).append("Response> getById(@PathVariable Long id) {\n");
        sb.append("        return service.findById(id)\n");
        sb.append("                .map(").append(className).append("Response::fromEntity)\n");
        sb.append("                .map(ResponseEntity::ok)\n");
        sb.append("                .orElse(ResponseEntity.notFound().build());\n");
        sb.append("    }\n\n");
        
        // POST
        sb.append("    @PostMapping\n");
        sb.append("    public ResponseEntity<").append(className).append("Response> create(@Valid @RequestBody ").append(className).append("Request request) {\n");
        sb.append("        ").append(className).append(" entity = new ").append(className).append("();\n");
        if (umlClass.atributos() != null) {
            for (com.umlforge.backend.dto.UmlModelDto.UmlAttribute attr : umlClass.atributos()) {
                String attrName = toJavaAttributeName(attr.nombre());
                if (attrName.equalsIgnoreCase("id")) continue;
                String capitalized = attrName.substring(0, 1).toUpperCase() + attrName.substring(1);
                sb.append("        entity.set").append(capitalized).append("(request.").append(attrName).append("());\n");
            }
        }
        sb.append("        ").append(className).append(" saved = service.save(entity);\n");
        sb.append("        return ResponseEntity.ok(").append(className).append("Response.fromEntity(saved));\n");
        sb.append("    }\n\n");
        
        // PUT
        sb.append("    @PutMapping(\"/{id}\")\n");
        sb.append("    public ResponseEntity<").append(className).append("Response> update(@PathVariable Long id, @Valid @RequestBody ").append(className).append("Request request) {\n");
        sb.append("        return service.findById(id)\n");
        sb.append("                .map(existing -> {\n");
        if (umlClass.atributos() != null) {
            for (com.umlforge.backend.dto.UmlModelDto.UmlAttribute attr : umlClass.atributos()) {
                String attrName = toJavaAttributeName(attr.nombre());
                if (attrName.equalsIgnoreCase("id")) continue;
                String capitalized = attrName.substring(0, 1).toUpperCase() + attrName.substring(1);
                sb.append("                    existing.set").append(capitalized).append("(request.").append(attrName).append("());\n");
            }
        }
        sb.append("                    return ResponseEntity.ok(").append(className).append("Response.fromEntity(service.save(existing)));\n");
        sb.append("                })\n");
        sb.append("                .orElse(ResponseEntity.notFound().build());\n");
        sb.append("    }\n\n");
        
        // DELETE
        sb.append("    @DeleteMapping(\"/{id}\")\n");
        sb.append("    public ResponseEntity<Void> delete(@PathVariable Long id) {\n");
        sb.append("        if (service.findById(id).isPresent()) {\n");
        sb.append("            service.deleteById(id);\n");
        sb.append("            return ResponseEntity.ok().build();\n");
        sb.append("        }\n");
        sb.append("        return ResponseEntity.notFound().build();\n");
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
}
