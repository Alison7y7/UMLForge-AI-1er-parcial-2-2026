package com.umlforge.backend.service.codegen.flutter;

import org.springframework.stereotype.Component;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;

@Component
public class FlutterScreenGenerator {

    public String generateListScreen(UmlClass umlClass) {
        String className = capitalize(umlClass.nombre());
        String lowerName = className.toLowerCase();
        
        return """
import 'package:flutter/material.dart';
import '../models/%s.dart';
import '../services/%s_service.dart';
import '%s_form_screen.dart';

class %sListScreen extends StatefulWidget {
  const %sListScreen({super.key});

  @override
  State<%sListScreen> createState() => _%sListScreenState();
}

class _%sListScreenState extends State<%sListScreen> {
  final %sService _service = %sService();
  late Future<List<%s>> _futureList;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    setState(() {
      _futureList = _service.getAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lista de %s'),
      ),
      body: FutureBuilder<List<%s>>(
        future: _futureList,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No hay registros'));
          }

          final items = snapshot.data!;
          return ListView.builder(
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                title: Text('ID: ${item.id ?? "N/A"}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit, color: Colors.blue),
                      onPressed: () async {
                        final result = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => %sFormScreen(item: item),
                          ),
                        );
                        if (result == true) _loadData();
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () async {
                        if (item.id != null) {
                          await _service.delete(item.id!);
                          _loadData();
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        child: const Icon(Icons.add),
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const %sFormScreen(),
            ),
          );
          if (result == true) _loadData();
        },
      ),
    );
  }
}
""".formatted(
            lowerName, lowerName, lowerName, 
            className, className, className, className,
            className, className, className, className, className,
            className, className, className, className
        );
    }

    public String generateFormScreen(UmlClass umlClass) {
        StringBuilder sb = new StringBuilder();
        String className = capitalize(umlClass.nombre());
        String lowerName = className.toLowerCase();
        
        sb.append("import 'package:flutter/material.dart';\n");
        sb.append("import '../models/").append(lowerName).append(".dart';\n");
        sb.append("import '../services/").append(lowerName).append("_service.dart';\n\n");
        
        sb.append("class ").append(className).append("FormScreen extends StatefulWidget {\n");
        sb.append("  final ").append(className).append("? item;\n");
        sb.append("  const ").append(className).append("FormScreen({super.key, this.item});\n\n");
        sb.append("  @override\n");
        sb.append("  State<").append(className).append("FormScreen> createState() => _").append(className).append("FormScreenState();\n");
        sb.append("}\n\n");
        
        sb.append("class _").append(className).append("FormScreenState extends State<").append(className).append("FormScreen> {\n");
        sb.append("  final _formKey = GlobalKey<FormState>();\n");
        sb.append("  final ").append(className).append("Service _service = ").append(className).append("Service();\n\n");
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String attrName = normalizeAttributeName(attr.nombre());
                if (attrName.equals("id")) continue;
                String dartType = mapTypeToDart(attr.tipo());
                if (dartType.equals("bool")) {
                    sb.append("  bool _").append(attrName).append(" = false;\n");
                } else {
                    sb.append("  final TextEditingController _").append(attrName).append("Controller = TextEditingController();\n");
                }
            }
        }
        
        sb.append("\n  @override\n");
        sb.append("  void initState() {\n");
        sb.append("    super.initState();\n");
        sb.append("    if (widget.item != null) {\n");
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String attrName = normalizeAttributeName(attr.nombre());
                if (attrName.equals("id")) continue;
                String dartType = mapTypeToDart(attr.tipo());
                if (dartType.equals("bool")) {
                    sb.append("      _").append(attrName).append(" = widget.item!.").append(attrName).append(" ?? false;\n");
                } else {
                    sb.append("      _").append(attrName).append("Controller.text = widget.item!.").append(attrName).append("?.toString() ?? '';\n");
                }
            }
        }
        sb.append("    }\n");
        sb.append("  }\n\n");
        
        sb.append("  @override\n");
        sb.append("  void dispose() {\n");
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String dartType = mapTypeToDart(attr.tipo());
                if (!dartType.equals("bool")) {
                    String attrName = normalizeAttributeName(attr.nombre());
                    if (attrName.equals("id")) continue;
                    sb.append("    _").append(attrName).append("Controller.dispose();\n");
                }
            }
        }
        sb.append("    super.dispose();\n");
        sb.append("  }\n\n");
        
        sb.append("  Future<void> _save() async {\n");
        sb.append("    if (_formKey.currentState!.validate()) {\n");
        sb.append("      final newItem = ").append(className).append("(\n");
        sb.append("        id: widget.item?.id,\n");
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String attrName = normalizeAttributeName(attr.nombre());
                if (attrName.equals("id")) continue;
                String dartType = mapTypeToDart(attr.tipo());
                sb.append("        ").append(attrName).append(": ");
                if (dartType.equals("bool")) {
                    sb.append("_").append(attrName).append(",\n");
                } else if (dartType.equals("int")) {
                    sb.append("int.tryParse(_").append(attrName).append("Controller.text),\n");
                } else if (dartType.equals("double")) {
                    sb.append("double.tryParse(_").append(attrName).append("Controller.text),\n");
                } else {
                    sb.append("_").append(attrName).append("Controller.text,\n");
                }
            }
        }
        sb.append("      );\n\n");
        
        sb.append("      try {\n");
        sb.append("        if (widget.item == null) {\n");
        sb.append("          await _service.create(newItem);\n");
        sb.append("        } else {\n");
        sb.append("          await _service.update(widget.item!.id!, newItem);\n");
        sb.append("        }\n");
        sb.append("        if (mounted) Navigator.pop(context, true);\n");
        sb.append("      } catch (e) {\n");
        sb.append("        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));\n");
        sb.append("      }\n");
        sb.append("    }\n");
        sb.append("  }\n\n");
        
        sb.append("  @override\n");
        sb.append("  Widget build(BuildContext context) {\n");
        sb.append("    return Scaffold(\n");
        sb.append("      appBar: AppBar(\n");
        sb.append("        title: Text(widget.item == null ? 'Crear ").append(className).append("' : 'Editar ").append(className).append("'),\n");
        sb.append("      ),\n");
        sb.append("      body: Padding(\n");
        sb.append("        padding: const EdgeInsets.all(16.0),\n");
        sb.append("        child: Form(\n");
        sb.append("          key: _formKey,\n");
        sb.append("          child: ListView(\n");
        sb.append("            children: [\n");
        
        if (umlClass.atributos() != null) {
            for (UmlAttribute attr : umlClass.atributos()) {
                String attrName = normalizeAttributeName(attr.nombre());
                if (attrName.equals("id")) continue;
                String dartType = mapTypeToDart(attr.tipo());
                
                if (dartType.equals("bool")) {
                    sb.append("              SwitchListTile(\n");
                    sb.append("                title: const Text('").append(attrName).append("'),\n");
                    sb.append("                value: _").append(attrName).append(",\n");
                    sb.append("                onChanged: (val) => setState(() => _").append(attrName).append(" = val),\n");
                    sb.append("              ),\n");
                } else {
                    sb.append("              TextFormField(\n");
                    sb.append("                controller: _").append(attrName).append("Controller,\n");
                    sb.append("                decoration: const InputDecoration(labelText: '").append(attrName).append("'),\n");
                    if (dartType.equals("int") || dartType.equals("double")) {
                        sb.append("                keyboardType: TextInputType.number,\n");
                    }
                    sb.append("              ),\n");
                    sb.append("              const SizedBox(height: 16),\n");
                }
            }
        }
        
        sb.append("              ElevatedButton(\n");
        sb.append("                onPressed: _save,\n");
        sb.append("                child: const Text('Guardar'),\n");
        sb.append("              ),\n");
        sb.append("            ],\n");
        sb.append("          ),\n");
        sb.append("        ),\n");
        sb.append("      ),\n");
        sb.append("    );\n");
        sb.append("  }\n");
        sb.append("}\n");
        
        return sb.toString();
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
