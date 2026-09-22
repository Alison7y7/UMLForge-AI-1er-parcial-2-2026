package com.umlforge.backend.controller;

import com.umlforge.backend.dto.BackendGenerationRequest;
import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.XmiExportRequest;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.BitacoraService;
import com.umlforge.backend.service.XmiExportService;
import com.umlforge.backend.service.XmiImportService;
import com.umlforge.backend.service.UmlModelValidator;
import com.umlforge.backend.service.XmiUmlModelMapper;
import com.umlforge.backend.service.codegen.BackendGeneratorFacade;
import com.umlforge.backend.service.codegen.flutter.FlutterProjectFacade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
public class BitacoraEventsTest {

    @Mock
    private BitacoraService bitacoraService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private Authentication authentication;

    private Usuario mockUsuario;

    @BeforeEach
    void setUp() {
        mockUsuario = new Usuario();
        mockUsuario.setCorreo("test@test.com");
    }

    @Test
    void testBackendGeneratorLogsEvent() {
        BackendGeneratorFacade facade = mock(BackendGeneratorFacade.class);
        BackendGeneratorController controller = new BackendGeneratorController(facade, bitacoraService, usuarioRepository);

        when(authentication.getName()).thenReturn("test@test.com");
        when(usuarioRepository.findByCorreo("test@test.com")).thenReturn(Optional.of(mockUsuario));
        when(facade.generateBackend(any())).thenReturn(new byte[0]);

        controller.generateBackend(new BackendGenerationRequest(new UmlModelDto(List.of(), List.of()), null), authentication);

        verify(bitacoraService).registrarAccion(eq(mockUsuario), eq(null), eq("GENERAR_BACKEND"), eq("Generó aplicación Spring Boot desde UML"));
    }

    @Test
    void testMobileGeneratorLogsEvent() {
        FlutterProjectFacade facade = mock(FlutterProjectFacade.class);
        MobileGeneratorController controller = new MobileGeneratorController(facade, bitacoraService, usuarioRepository);

        when(authentication.getName()).thenReturn("test@test.com");
        when(usuarioRepository.findByCorreo("test@test.com")).thenReturn(Optional.of(mockUsuario));
        when(facade.generateMobileApp(any())).thenReturn(new byte[0]);

        controller.generateMobileApp(new UmlModelDto(List.of(), List.of()), authentication);

        verify(bitacoraService).registrarAccion(eq(mockUsuario), eq(null), eq("GENERAR_MOBILE"), eq("Generó aplicación Flutter desde UML"));
    }

    @Test
    void testXmiExportLogsEvent() {
        XmiExportService service = mock(XmiExportService.class);
        XmiExportController controller = new XmiExportController(service, bitacoraService, usuarioRepository);

        when(authentication.getName()).thenReturn("test@test.com");
        when(usuarioRepository.findByCorreo("test@test.com")).thenReturn(Optional.of(mockUsuario));
        when(service.exportar(any(), any())).thenReturn(new byte[0]);
        when(service.nombreArchivo(any())).thenReturn("file.xml");

        com.umlforge.backend.dto.XmiImportResponse mockXmiResponse = mock(com.umlforge.backend.dto.XmiImportResponse.class);
        controller.exportar(new XmiExportRequest("file", mockXmiResponse), authentication);

        verify(bitacoraService).registrarAccion(eq(mockUsuario), eq(null), eq("EXPORTAR_XMI"), eq("Exportó el diagrama a XMI: file"));
    }

    @Test
    void testXmiImportLogsEvent() {
        XmiImportService importService = mock(XmiImportService.class);
        UmlModelValidator validator = mock(UmlModelValidator.class);
        XmiUmlModelMapper mapper = mock(XmiUmlModelMapper.class);
        XmiController controller = new XmiController(importService, validator, mapper, bitacoraService, usuarioRepository);

        when(authentication.getName()).thenReturn("test@test.com");
        when(usuarioRepository.findByCorreo("test@test.com")).thenReturn(Optional.of(mockUsuario));
        
        org.springframework.web.multipart.MultipartFile file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("test.xmi");
        
        com.umlforge.backend.dto.XmiImportResponse mockResponse = mock(com.umlforge.backend.dto.XmiImportResponse.class);
        when(importService.importar(file)).thenReturn(mockResponse);
        when(mapper.toUmlModel(mockResponse)).thenReturn(new UmlModelDto(List.of(), List.of()));

        controller.importar(file, authentication);

        verify(bitacoraService).registrarAccion(eq(mockUsuario), eq(null), eq("IMPORTAR_XMI"), eq("Importó el archivo XMI: test.xmi"));
    }

    @Test
    void testAuthLogsEvents() {
        org.springframework.security.authentication.AuthenticationManager authManager = mock(org.springframework.security.authentication.AuthenticationManager.class);
        com.umlforge.backend.security.JwtUtil jwtUtil = mock(com.umlforge.backend.security.JwtUtil.class);
        com.umlforge.backend.repository.RolRepository rolRepo = mock(com.umlforge.backend.repository.RolRepository.class);
        org.springframework.security.crypto.password.PasswordEncoder encoder = mock(org.springframework.security.crypto.password.PasswordEncoder.class);
        
        AuthController controller = new AuthController(authManager, jwtUtil, usuarioRepository, rolRepo, encoder, bitacoraService);

        // test login
        org.springframework.security.core.userdetails.UserDetails userDetails = mock(org.springframework.security.core.userdetails.UserDetails.class);
        when(authManager.authenticate(any())).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(usuarioRepository.findByCorreo("test@test.com")).thenReturn(Optional.of(mockUsuario));
        
        com.umlforge.backend.dto.LoginRequest loginReq = new com.umlforge.backend.dto.LoginRequest();
        loginReq.setCorreo("test@test.com");
        loginReq.setPassword("pass");
        controller.login(loginReq);
        
        verify(bitacoraService).registrarAccion(eq(mockUsuario), eq(null), eq("LOGIN"), eq("Usuario inició sesión"));
        
        // test register
        com.umlforge.backend.dto.RegisterRequest req = new com.umlforge.backend.dto.RegisterRequest();
        req.setNombre("name");
        req.setApellido("last");
        req.setCorreo("new@test.com");
        req.setPassword("pass");
        req.setRol("ANFITRION");
        
        com.umlforge.backend.entity.Rol mockRol = new com.umlforge.backend.entity.Rol();
        mockRol.setNombre("ANFITRION");
        when(rolRepo.findByNombre("ANFITRION")).thenReturn(Optional.of(mockRol));
        when(encoder.encode("pass")).thenReturn("encoded");
        
        controller.register(req);
        
        verify(bitacoraService).registrarAccion(any(Usuario.class), eq(null), eq("REGISTER"), eq("Usuario registrado exitosamente"));
    }
}
