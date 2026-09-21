package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.BackendGenerationRequest;
import com.umlforge.backend.dto.DatabaseConfig;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class BackendGeneratorFacade {

    private final EntityGenerator entityGenerator;
    private final RepositoryGenerator repositoryGenerator;
    private final ServiceGenerator serviceGenerator;
    private final ControllerGenerator controllerGenerator;
    private final ProjectStructureGenerator projectStructureGenerator;
    private final DtoGenerator dtoGenerator;
    private final PostmanCollectionGenerator postmanCollectionGenerator;

    public BackendGeneratorFacade(EntityGenerator entityGenerator,
                                  RepositoryGenerator repositoryGenerator,
                                  ServiceGenerator serviceGenerator,
                                  ControllerGenerator controllerGenerator,
                                  ProjectStructureGenerator projectStructureGenerator,
                                  DtoGenerator dtoGenerator,
                                  PostmanCollectionGenerator postmanCollectionGenerator) {
        this.entityGenerator = entityGenerator;
        this.repositoryGenerator = repositoryGenerator;
        this.serviceGenerator = serviceGenerator;
        this.controllerGenerator = controllerGenerator;
        this.projectStructureGenerator = projectStructureGenerator;
        this.dtoGenerator = dtoGenerator;
        this.postmanCollectionGenerator = postmanCollectionGenerator;
    }

    public byte[] generateBackend(BackendGenerationRequest request) {
        UmlModelDto modelDto = request.umlModel();
        DatabaseConfig dbConfig = request.databaseConfig();
        
        Map<String, String> files = new HashMap<>();
        String basePackage = "com.generated.backend";
        String basePath = "src/main/java/com/generated/backend/";
        
        // Root config
        files.put("pom.xml", projectStructureGenerator.generatePomXml("generated-backend"));
        
        if (dbConfig != null) {
            files.put("src/main/resources/application.properties", projectStructureGenerator.generateApplicationProperties(
                    dbConfig.host(), dbConfig.port(), dbConfig.databaseName(), dbConfig.username()
            ));
            files.put("README.md", projectStructureGenerator.generateReadme(dbConfig.databaseName()));
        } else {
            files.put("src/main/resources/application.properties", projectStructureGenerator.generateApplicationProperties(
                    "localhost", 5432, "generated_db", "postgres"
            ));
            files.put("README.md", projectStructureGenerator.generateReadme("generated_db"));
        }
        
        files.put("database/README.md", projectStructureGenerator.generateDatabaseReadme());
        
        files.put(basePath + "BackendApplication.java", projectStructureGenerator.generateMainApplication(basePackage));
        files.put(basePath + "config/CorsConfig.java", projectStructureGenerator.generateCorsConfig(basePackage));
        files.put(basePath + "exception/GlobalExceptionHandler.java", projectStructureGenerator.generateGlobalExceptionHandler(basePackage));
        
        // Postman collection
        files.put("postman/generated-api-collection.json", postmanCollectionGenerator.generateCollection(modelDto));
        
        if (modelDto.clases() != null) {
            for (UmlClass umlClass : modelDto.clases()) {
                String className = capitalize(umlClass.nombre().replaceAll("\\s+", ""));
                
                // Entity
                String entityCode = entityGenerator.generateEntity(umlClass, modelDto, basePackage);
                files.put(basePath + "entity/" + className + ".java", entityCode);
                
                // DTOs
                String reqDto = dtoGenerator.generateRequestDto(umlClass, basePackage);
                files.put(basePath + "dto/" + className + "Request.java", reqDto);
                String resDto = dtoGenerator.generateResponseDto(umlClass, basePackage);
                files.put(basePath + "dto/" + className + "Response.java", resDto);
                
                // Repository
                String repositoryCode = repositoryGenerator.generateRepository(umlClass, basePackage);
                files.put(basePath + "repository/" + className + "Repository.java", repositoryCode);
                
                // Service
                String serviceCode = serviceGenerator.generateService(umlClass, basePackage);
                files.put(basePath + "service/" + className + "Service.java", serviceCode);
                
                // Controller
                String controllerCode = controllerGenerator.generateController(umlClass, basePackage);
                files.put(basePath + "controller/" + className + "Controller.java", controllerCode);
            }
        }
        
        return ZipUtils.createZip(files);
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}
