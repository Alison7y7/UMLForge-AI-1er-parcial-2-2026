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

    public MobileGeneratorController(FlutterProjectFacade flutterProjectFacade) {
        this.flutterProjectFacade = flutterProjectFacade;
    }

    @PostMapping("/mobile")
    public ResponseEntity<byte[]> generateMobileApp(@RequestBody UmlModelDto modelDto) {
        try {
            byte[] zipData = flutterProjectFacade.generateMobileApp(modelDto);
            
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
