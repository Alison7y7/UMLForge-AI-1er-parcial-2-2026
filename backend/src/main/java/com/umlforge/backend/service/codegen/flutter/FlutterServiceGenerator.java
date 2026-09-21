package com.umlforge.backend.service.codegen.flutter;

import org.springframework.stereotype.Component;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;

@Component
public class FlutterServiceGenerator {

    public String generateService(UmlClass umlClass) {
        StringBuilder sb = new StringBuilder();
        String className = capitalize(umlClass.nombre());
        String endpoint = className.toLowerCase() + "s";
        
        sb.append("import 'dart:convert';\n");
        sb.append("import 'package:http/http.dart' as http;\n");
        sb.append("import '../api_config.dart';\n");
        sb.append("import '../models/").append(className.toLowerCase()).append(".dart';\n\n");
        
        sb.append("class ").append(className).append("Service {\n");
        sb.append("  final String _baseUrl = '${ApiConfig.baseUrl}/").append(endpoint).append("';\n\n");
        
        // GET ALL
        sb.append("  Future<List<").append(className).append(">> getAll() async {\n");
        sb.append("    final response = await http.get(Uri.parse(_baseUrl));\n");
        sb.append("    if (response.statusCode == 200) {\n");
        sb.append("      Iterable l = json.decode(response.body);\n");
        sb.append("      return List<").append(className).append(">.from(l.map((model) => ").append(className).append(".fromJson(model)));\n");
        sb.append("    } else {\n");
        sb.append("      throw Exception('Failed to load ").append(className.toLowerCase()).append("s');\n");
        sb.append("    }\n");
        sb.append("  }\n\n");
        
        // GET BY ID
        sb.append("  Future<").append(className).append("> getById(int id) async {\n");
        sb.append("    final response = await http.get(Uri.parse('$_baseUrl/$id'));\n");
        sb.append("    if (response.statusCode == 200) {\n");
        sb.append("      return ").append(className).append(".fromJson(json.decode(response.body));\n");
        sb.append("    } else {\n");
        sb.append("      throw Exception('Failed to load ").append(className.toLowerCase()).append("');\n");
        sb.append("    }\n");
        sb.append("  }\n\n");
        
        // POST
        sb.append("  Future<").append(className).append("> create(").append(className).append(" item) async {\n");
        sb.append("    final response = await http.post(\n");
        sb.append("      Uri.parse(_baseUrl),\n");
        sb.append("      headers: {'Content-Type': 'application/json'},\n");
        sb.append("      body: json.encode(item.toJson()),\n");
        sb.append("    );\n");
        sb.append("    if (response.statusCode == 200 || response.statusCode == 201) {\n");
        sb.append("      return ").append(className).append(".fromJson(json.decode(response.body));\n");
        sb.append("    } else {\n");
        sb.append("      throw Exception('Failed to create ").append(className.toLowerCase()).append("');\n");
        sb.append("    }\n");
        sb.append("  }\n\n");
        
        // PUT
        sb.append("  Future<").append(className).append("> update(int id, ").append(className).append(" item) async {\n");
        sb.append("    final response = await http.put(\n");
        sb.append("      Uri.parse('$_baseUrl/$id'),\n");
        sb.append("      headers: {'Content-Type': 'application/json'},\n");
        sb.append("      body: json.encode(item.toJson()),\n");
        sb.append("    );\n");
        sb.append("    if (response.statusCode == 200) {\n");
        sb.append("      return ").append(className).append(".fromJson(json.decode(response.body));\n");
        sb.append("    } else {\n");
        sb.append("      throw Exception('Failed to update ").append(className.toLowerCase()).append("');\n");
        sb.append("    }\n");
        sb.append("  }\n\n");
        
        // DELETE
        sb.append("  Future<void> delete(int id) async {\n");
        sb.append("    final response = await http.delete(Uri.parse('$_baseUrl/$id'));\n");
        sb.append("    if (response.statusCode != 200 && response.statusCode != 204) {\n");
        sb.append("      throw Exception('Failed to delete ").append(className.toLowerCase()).append("');\n");
        sb.append("    }\n");
        sb.append("  }\n");
        
        sb.append("}\n");
        
        return sb.toString();
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        String name = str.replaceAll("\\s+", "");
        return name.substring(0, 1).toUpperCase() + name.substring(1);
    }
}
