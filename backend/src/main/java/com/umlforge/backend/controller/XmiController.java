package com.umlforge.backend.controller;

import com.umlforge.backend.dto.XmiImportResponse;
import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.XmiImportService;
import com.umlforge.backend.service.UmlModelValidator;
import com.umlforge.backend.service.XmiUmlModelMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/xmi")
public class XmiController {

    private final XmiImportService xmiImportService;
    private final UmlModelValidator umlModelValidator;
    private final XmiUmlModelMapper xmiUmlModelMapper;

    public XmiController(
            XmiImportService xmiImportService,
            UmlModelValidator umlModelValidator,
            XmiUmlModelMapper xmiUmlModelMapper) {
        this.xmiImportService = xmiImportService;
        this.umlModelValidator = umlModelValidator;
        this.xmiUmlModelMapper = xmiUmlModelMapper;
    }

    @PostMapping(value = "/importar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UmlModelDto> importar(@RequestParam("archivo") MultipartFile archivo) {
        XmiImportResponse xmiModel = xmiImportService.importar(archivo);
        UmlModelDto model = xmiUmlModelMapper.toUmlModel(xmiModel);
        umlModelValidator.validate(model);
        return ResponseEntity.ok(model);
    }
}
