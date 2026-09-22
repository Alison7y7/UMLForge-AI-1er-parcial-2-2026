package com.umlforge.backend.controller;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.codegen.flutter.FlutterProjectFacade;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/generate")
public class MobileGeneratorController {

    private final FlutterProjectFacade flutterProjectFacade;
    private final com.umlforge.backend.service.BitacoraService bitacoraService;
    private final com.umlforge.backend.repository.UsuarioRepository usuarioRepository;

    public MobileGeneratorController(FlutterProjectFacade flutterProjectFacade,
                                     com.umlforge.backend.service.BitacoraService bitacoraService,
                                     com.umlforge.backend.repository.UsuarioRepository usuarioRepository) {
        this.flutterProjectFacade = flutterProjectFacade;
        this.bitacoraService = bitacoraService;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/mobile")
    public ResponseEntity<byte[]> generateMobileApp(@RequestBody UmlModelDto modelDto, org.springframework.security.core.Authentication authentication) {
        try {
            byte[] zipData = flutterProjectFacade.generateMobileApp(modelDto);
            
            if (authentication != null) {
                usuarioRepository.findByCorreo(authentication.getName()).ifPresent(usuario -> 
                    bitacoraService.registrarAccion(usuario, null, "GENERAR_MOBILE", "Generó aplicación Flutter desde UML")
                );
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.valueOf("application/zip"));
            headers.setContentDispositionFormData("attachment", "umlforge-generated-mobile.zip");
            
            return new ResponseEntity<>(zipData, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
