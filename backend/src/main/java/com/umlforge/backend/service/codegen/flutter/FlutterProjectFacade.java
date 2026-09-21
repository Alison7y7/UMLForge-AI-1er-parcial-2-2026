package com.umlforge.backend.service.codegen.flutter;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.service.codegen.ZipUtils;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class FlutterProjectFacade {

    private final FlutterStructureGenerator structureGenerator;
    private final FlutterModelGenerator modelGenerator;
    private final FlutterServiceGenerator serviceGenerator;
    private final FlutterScreenGenerator screenGenerator;

    public FlutterProjectFacade(FlutterStructureGenerator structureGenerator,
                                FlutterModelGenerator modelGenerator,
                                FlutterServiceGenerator serviceGenerator,
                                FlutterScreenGenerator screenGenerator) {
        this.structureGenerator = structureGenerator;
        this.modelGenerator = modelGenerator;
        this.serviceGenerator = serviceGenerator;
        this.screenGenerator = screenGenerator;
    }

    public byte[] generateMobileApp(UmlModelDto modelDto) {
        Map<String, String> files = new HashMap<>();
        
        // Base structure
        files.put("pubspec.yaml", structureGenerator.generatePubspec());
        files.put("README.md", structureGenerator.generateReadme());
        files.put("lib/api_config.dart", structureGenerator.generateApiConfig());
        files.put("lib/main.dart", structureGenerator.generateMain(modelDto.clases() != null ? modelDto.clases() : java.util.List.of()));
        
        if (modelDto.clases() != null) {
            for (UmlClass umlClass : modelDto.clases()) {
                String className = umlClass.nombre().replaceAll("\\s+", "").toLowerCase();
                
                // Models
                String modelCode = modelGenerator.generateModel(umlClass, modelDto);
                files.put("lib/models/" + className + ".dart", modelCode);
                
                // Services
                String serviceCode = serviceGenerator.generateService(umlClass);
                files.put("lib/services/" + className + "_service.dart", serviceCode);
                
                // Screens
                String listScreenCode = screenGenerator.generateListScreen(umlClass);
                files.put("lib/screens/" + className + "_list_screen.dart", listScreenCode);
                
                String formScreenCode = screenGenerator.generateFormScreen(umlClass);
                files.put("lib/screens/" + className + "_form_screen.dart", formScreenCode);
            }
        }
        
        return ZipUtils.createZip(files);
    }
}
