package com.umlforge.backend.service.ia;

import com.umlforge.backend.dto.UmlModelDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
public class FallbackUmlProvider implements IAProvider {

    @Override
    public String getName() {
        return "fallback-local";
    }

    @Override
    public int getPriority() {
        return 100;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public IAProviderResult generate(String prompt) {
        log.info("Fallback UML local utilizado");
        String normalized = prompt.toLowerCase(Locale.ROOT);
        if (normalized.contains("biblioteca") || normalized.contains("libro") || normalized.contains("préstamo") || normalized.contains("prestamo")) {
            return new IAProviderResult(libraryModel(), 0);
        }
        if (normalized.contains("veterinaria") || normalized.contains("mascota") || normalized.contains("veterinario")) {
            return new IAProviderResult(veterinaryModel(), 0);
        }
        if (normalized.contains("universidad") || normalized.contains("universitario") || normalized.contains("estudiante") || normalized.contains("curso")) {
            return new IAProviderResult(universityModel(), 0);
        }
        if (normalized.contains("tienda") || normalized.contains("producto") || normalized.contains("venta")) {
            return new IAProviderResult(storeModel(), 0);
        }
        if (normalized.contains("clínica") || normalized.contains("clinica") || normalized.contains("paciente") || normalized.contains("médico") || normalized.contains("medico")) {
            return new IAProviderResult(clinicModel(), 0);
        }

        UmlModelDto.UmlClass systemClass = umlClass(
                "clase-sistema", "Sistema", 120, 100,
                List.of(attribute("attr-sistema-id", "id", "Long"))
        );
        return new IAProviderResult(new UmlModelDto(List.of(systemClass), List.of()), 0);
    }

    private UmlModelDto libraryModel() {
        List<UmlModelDto.UmlClass> classes = new ArrayList<>();
        classes.add(umlClass("clase-libro", "Libro", 80, 100, List.of(
                attribute("attr-libro-id", "id", "Long"),
                attribute("attr-libro-titulo", "titulo", "String"),
                attribute("attr-libro-isbn", "isbn", "String"),
                attribute("attr-libro-autor", "autor", "String"),
                attribute("attr-libro-disponible", "disponible", "Boolean")
        )));
        classes.add(umlClass("clase-usuario", "Usuario", 380, 100, List.of(
                attribute("attr-usuario-id", "id", "Long"),
                attribute("attr-usuario-nombre", "nombre", "String"),
                attribute("attr-usuario-correo", "correo", "String"),
                attribute("attr-usuario-telefono", "telefono", "String")
        )));
        classes.add(umlClass("clase-prestamo", "Prestamo", 230, 350, List.of(
                attribute("attr-prestamo-id", "id", "Long"),
                attribute("attr-prestamo-fecha", "fechaPrestamo", "LocalDate"),
                attribute("attr-prestamo-devolucion", "fechaDevolucion", "LocalDate"),
                attribute("attr-prestamo-estado", "estado", "String")
        )));

        List<UmlModelDto.UmlRelation> relations = List.of(
                new UmlModelDto.UmlRelation("rel-libro-prestamo", "clase-libro", "clase-prestamo",
                        "ASOCIACION", "prestamos", "1", "0..*"),
                new UmlModelDto.UmlRelation("rel-usuario-prestamo", "clase-usuario", "clase-prestamo",
                        "ASOCIACION", "realiza", "1", "0..*")
        );
        return new UmlModelDto(classes, relations);
    }

    private UmlModelDto veterinaryModel() {
        List<UmlModelDto.UmlClass> classes = List.of(
                umlClass("clase-mascota", "Mascota", 60, 80, List.of(
                        attribute("attr-mascota-id", "id", "Long"),
                        attribute("attr-mascota-nombre", "nombre", "String"),
                        attribute("attr-mascota-especie", "especie", "String"),
                        attribute("attr-mascota-raza", "raza", "String"),
                        attribute("attr-mascota-nacimiento", "fechaNacimiento", "LocalDate")
                )),
                umlClass("clase-dueno", "Dueño", 370, 80, List.of(
                        attribute("attr-dueno-id", "id", "Long"),
                        attribute("attr-dueno-nombre", "nombre", "String"),
                        attribute("attr-dueno-telefono", "telefono", "String"),
                        attribute("attr-dueno-correo", "correo", "String")
                )),
                umlClass("clase-veterinario", "Veterinario", 60, 370, List.of(
                        attribute("attr-veterinario-id", "id", "Long"),
                        attribute("attr-veterinario-nombre", "nombre", "String"),
                        attribute("attr-veterinario-especialidad", "especialidad", "String")
                )),
                umlClass("clase-consulta", "Consulta", 370, 370, List.of(
                        attribute("attr-consulta-id", "id", "Long"),
                        attribute("attr-consulta-fecha", "fecha", "LocalDate"),
                        attribute("attr-consulta-diagnostico", "diagnostico", "String"),
                        attribute("attr-consulta-tratamiento", "tratamiento", "String")
                ))
        );
        List<UmlModelDto.UmlRelation> relations = List.of(
                relation("rel-dueno-mascota", "clase-dueno", "clase-mascota", "tiene", "1", "0..*"),
                relation("rel-mascota-consulta", "clase-mascota", "clase-consulta", "consultas", "1", "0..*"),
                relation("rel-veterinario-consulta", "clase-veterinario", "clase-consulta", "atiende", "1", "0..*")
        );
        return new UmlModelDto(classes, relations);
    }

    private UmlModelDto universityModel() {
        List<UmlModelDto.UmlClass> classes = List.of(
                umlClass("clase-estudiante", "Estudiante", 60, 80, List.of(
                        attribute("attr-estudiante-id", "id", "Long"),
                        attribute("attr-estudiante-nombre", "nombre", "String"),
                        attribute("attr-estudiante-carnet", "carnet", "String"),
                        attribute("attr-estudiante-carrera", "carrera", "String")
                )),
                umlClass("clase-curso", "Curso", 370, 80, List.of(
                        attribute("attr-curso-id", "id", "Long"),
                        attribute("attr-curso-nombre", "nombre", "String"),
                        attribute("attr-curso-codigo", "codigo", "String"),
                        attribute("attr-curso-creditos", "creditos", "Integer")
                )),
                umlClass("clase-profesor", "Profesor", 60, 370, List.of(
                        attribute("attr-profesor-id", "id", "Long"),
                        attribute("attr-profesor-nombre", "nombre", "String"),
                        attribute("attr-profesor-especialidad", "especialidad", "String")
                )),
                umlClass("clase-inscripcion", "Inscripcion", 370, 370, List.of(
                        attribute("attr-inscripcion-id", "id", "Long"),
                        attribute("attr-inscripcion-fecha", "fecha", "LocalDate"),
                        attribute("attr-inscripcion-nota", "nota", "Double")
                ))
        );
        List<UmlModelDto.UmlRelation> relations = List.of(
                relation("rel-estudiante-inscripcion", "clase-estudiante", "clase-inscripcion", "inscripciones", "1", "0..*"),
                relation("rel-curso-inscripcion", "clase-curso", "clase-inscripcion", "inscripciones", "1", "0..*"),
                relation("rel-profesor-curso", "clase-profesor", "clase-curso", "imparte", "1", "0..*")
        );
        return new UmlModelDto(classes, relations);
    }

    private UmlModelDto storeModel() {
        List<UmlModelDto.UmlClass> classes = List.of(
                umlClass("clase-producto", "Producto", 60, 80, List.of(
                        attribute("attr-producto-id", "id", "Long"),
                        attribute("attr-producto-nombre", "nombre", "String"),
                        attribute("attr-producto-precio", "precio", "Double"),
                        attribute("attr-producto-stock", "stock", "Integer")
                )),
                umlClass("clase-cliente", "Cliente", 370, 80, List.of(
                        attribute("attr-cliente-id", "id", "Long"),
                        attribute("attr-cliente-nombre", "nombre", "String"),
                        attribute("attr-cliente-correo", "correo", "String"),
                        attribute("attr-cliente-telefono", "telefono", "String")
                )),
                umlClass("clase-venta", "Venta", 60, 370, List.of(
                        attribute("attr-venta-id", "id", "Long"),
                        attribute("attr-venta-fecha", "fecha", "LocalDate"),
                        attribute("attr-venta-total", "total", "Double")
                )),
                umlClass("clase-detalle-venta", "DetalleVenta", 370, 370, List.of(
                        attribute("attr-detalle-venta-id", "id", "Long"),
                        attribute("attr-detalle-venta-cantidad", "cantidad", "Integer"),
                        attribute("attr-detalle-venta-subtotal", "subtotal", "Double")
                ))
        );
        List<UmlModelDto.UmlRelation> relations = List.of(
                relation("rel-cliente-venta", "clase-cliente", "clase-venta", "compras", "1", "0..*"),
                relation("rel-venta-detalle", "clase-venta", "clase-detalle-venta", "detalles", "1", "0..*"),
                relation("rel-producto-detalle", "clase-producto", "clase-detalle-venta", "detalles", "1", "0..*")
        );
        return new UmlModelDto(classes, relations);
    }

    private UmlModelDto clinicModel() {
        List<UmlModelDto.UmlClass> classes = List.of(
                umlClass("clase-paciente", "Paciente", 60, 80, List.of(
                        attribute("attr-paciente-id", "id", "Long"),
                        attribute("attr-paciente-nombre", "nombre", "String"),
                        attribute("attr-paciente-nacimiento", "fechaNacimiento", "LocalDate"),
                        attribute("attr-paciente-telefono", "telefono", "String")
                )),
                umlClass("clase-medico", "Medico", 370, 80, List.of(
                        attribute("attr-medico-id", "id", "Long"),
                        attribute("attr-medico-nombre", "nombre", "String"),
                        attribute("attr-medico-especialidad", "especialidad", "String")
                )),
                umlClass("clase-cita", "Cita", 60, 370, List.of(
                        attribute("attr-cita-id", "id", "Long"),
                        attribute("attr-cita-fecha", "fecha", "LocalDate"),
                        attribute("attr-cita-motivo", "motivo", "String"),
                        attribute("attr-cita-estado", "estado", "String")
                )),
                umlClass("clase-historial", "HistorialMedico", 370, 370, List.of(
                        attribute("attr-historial-id", "id", "Long"),
                        attribute("attr-historial-descripcion", "descripcion", "String"),
                        attribute("attr-historial-actualizacion", "fechaActualizacion", "LocalDate")
                ))
        );
        List<UmlModelDto.UmlRelation> relations = List.of(
                relation("rel-paciente-cita", "clase-paciente", "clase-cita", "citas", "1", "0..*"),
                relation("rel-medico-cita", "clase-medico", "clase-cita", "atiende", "1", "0..*"),
                relation("rel-paciente-historial", "clase-paciente", "clase-historial", "historial", "1", "1")
        );
        return new UmlModelDto(classes, relations);
    }

    private UmlModelDto.UmlClass umlClass(
            String id, String name, double x, double y, List<UmlModelDto.UmlAttribute> attributes) {
        return new UmlModelDto.UmlClass(id, name, "entity", x, y, attributes, List.of());
    }

    private UmlModelDto.UmlAttribute attribute(String id, String name, String type) {
        return new UmlModelDto.UmlAttribute(id, name, type, "private");
    }

    private UmlModelDto.UmlRelation relation(
            String id, String source, String target, String name, String sourceMultiplicity, String targetMultiplicity) {
        return new UmlModelDto.UmlRelation(
                id, source, target, "ASOCIACION", name, sourceMultiplicity, targetMultiplicity
        );
    }
}
