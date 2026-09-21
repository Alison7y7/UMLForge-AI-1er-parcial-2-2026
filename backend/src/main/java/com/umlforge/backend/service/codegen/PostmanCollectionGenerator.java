package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import org.springframework.stereotype.Component;

@Component
public class PostmanCollectionGenerator {

    public String generateCollection(UmlModelDto modelDto) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"info\": {\n");
        sb.append("    \"name\": \"Generated API by UMLForge-AI\",\n");
        sb.append("    \"schema\": \"https://schema.getpostman.com/json/collection/v2.1.0/collection.json\"\n");
        sb.append("  },\n");
        sb.append("  \"item\": [\n");
        
        if (modelDto.clases() != null && !modelDto.clases().isEmpty()) {
            for (int i = 0; i < modelDto.clases().size(); i++) {
                UmlClass umlClass = modelDto.clases().get(i);
                sb.append(generateFolderForClass(umlClass));
                if (i < modelDto.clases().size() - 1) {
                    sb.append(",\n");
                }
            }
        }
        
        sb.append("\n  ]\n");
        sb.append("}\n");
        return sb.toString();
    }
    
    private String generateFolderForClass(UmlClass umlClass) {
        String className = umlClass.nombre().replaceAll("\\s+", "");
        String endpoint = className.toLowerCase() + "s";
        
        StringBuilder sb = new StringBuilder();
        sb.append("    {\n");
        sb.append("      \"name\": \"").append(className).append("\",\n");
        sb.append("      \"item\": [\n");
        
        // GET ALL
        sb.append("        {\n");
        sb.append("          \"name\": \"Obtener todos\",\n");
        sb.append("          \"request\": {\n");
        sb.append("            \"method\": \"GET\",\n");
        sb.append("            \"url\": {\n");
        sb.append("              \"raw\": \"http://localhost:8081/api/").append(endpoint).append("\",\n");
        sb.append("              \"protocol\": \"http\",\n");
        sb.append("              \"host\": [\"localhost\"],\n");
        sb.append("              \"port\": \"8081\",\n");
        sb.append("              \"path\": [\"api\", \"").append(endpoint).append("\"]\n");
        sb.append("            }\n");
        sb.append("          }\n");
        sb.append("        },\n");
        
        // GET BY ID
        sb.append("        {\n");
        sb.append("          \"name\": \"Obtener por ID\",\n");
        sb.append("          \"request\": {\n");
        sb.append("            \"method\": \"GET\",\n");
        sb.append("            \"url\": {\n");
        sb.append("              \"raw\": \"http://localhost:8081/api/").append(endpoint).append("/1\",\n");
        sb.append("              \"protocol\": \"http\",\n");
        sb.append("              \"host\": [\"localhost\"],\n");
        sb.append("              \"port\": \"8081\",\n");
        sb.append("              \"path\": [\"api\", \"").append(endpoint).append("\", \"1\"]\n");
        sb.append("            }\n");
        sb.append("          }\n");
        sb.append("        },\n");
        
        // POST
        sb.append("        {\n");
        sb.append("          \"name\": \"Crear nuevo\",\n");
        sb.append("          \"request\": {\n");
        sb.append("            \"method\": \"POST\",\n");
        sb.append("            \"header\": [{\"key\": \"Content-Type\", \"value\": \"application/json\"}],\n");
        sb.append("            \"body\": {\n");
        sb.append("              \"mode\": \"raw\",\n");
        sb.append("              \"raw\": \"").append(generateSampleJson(umlClass).replace("\"", "\\\"").replace("\n", "\\n")).append("\"\n");
        sb.append("            },\n");
        sb.append("            \"url\": {\n");
        sb.append("              \"raw\": \"http://localhost:8081/api/").append(endpoint).append("\",\n");
        sb.append("              \"protocol\": \"http\",\n");
        sb.append("              \"host\": [\"localhost\"],\n");
        sb.append("              \"port\": \"8081\",\n");
        sb.append("              \"path\": [\"api\", \"").append(endpoint).append("\"]\n");
        sb.append("            }\n");
        sb.append("          }\n");
        sb.append("        },\n");
        
        // PUT
        sb.append("        {\n");
        sb.append("          \"name\": \"Actualizar por ID\",\n");
        sb.append("          \"request\": {\n");
        sb.append("            \"method\": \"PUT\",\n");
        sb.append("            \"header\": [{\"key\": \"Content-Type\", \"value\": \"application/json\"}],\n");
        sb.append("            \"body\": {\n");
        sb.append("              \"mode\": \"raw\",\n");
        sb.append("              \"raw\": \"").append(generateSampleJson(umlClass).replace("\"", "\\\"").replace("\n", "\\n")).append("\"\n");
        sb.append("            },\n");
        sb.append("            \"url\": {\n");
        sb.append("              \"raw\": \"http://localhost:8081/api/").append(endpoint).append("/1\",\n");
        sb.append("              \"protocol\": \"http\",\n");
        sb.append("              \"host\": [\"localhost\"],\n");
        sb.append("              \"port\": \"8081\",\n");
        sb.append("              \"path\": [\"api\", \"").append(endpoint).append("\", \"1\"]\n");
        sb.append("            }\n");
        sb.append("          }\n");
        sb.append("        },\n");
        
        // DELETE
        sb.append("        {\n");
        sb.append("          \"name\": \"Eliminar por ID\",\n");
        sb.append("          \"request\": {\n");
        sb.append("            \"method\": \"DELETE\",\n");
        sb.append("            \"url\": {\n");
        sb.append("              \"raw\": \"http://localhost:8081/api/").append(endpoint).append("/1\",\n");
        sb.append("              \"protocol\": \"http\",\n");
        sb.append("              \"host\": [\"localhost\"],\n");
        sb.append("              \"port\": \"8081\",\n");
        sb.append("              \"path\": [\"api\", \"").append(endpoint).append("\", \"1\"]\n");
        sb.append("            }\n");
        sb.append("          }\n");
        sb.append("        }\n");
        
        sb.append("      ]\n");
        sb.append("    }");
        return sb.toString();
    }
    
    private String generateSampleJson(UmlClass umlClass) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        if (umlClass.atributos() != null) {
            for (int i = 0; i < umlClass.atributos().size(); i++) {
                UmlAttribute attr = umlClass.atributos().get(i);
                String name = attr.nombre().replaceAll("\\s+", "");
                String type = attr.tipo() != null ? attr.tipo().toLowerCase() : "string";
                
                sb.append("  \"").append(name).append("\": ");
                if (type.contains("int") || type.contains("long") || type.contains("double") || type.contains("float")) {
                    sb.append("1");
                } else if (type.contains("bool")) {
                    sb.append("true");
                } else {
                    sb.append("\"ejemplo\"");
                }
                
                if (i < umlClass.atributos().size() - 1) {
                    sb.append(",");
                }
                sb.append("\n");
            }
        }
        sb.append("}");
        return sb.toString();
    }
}
