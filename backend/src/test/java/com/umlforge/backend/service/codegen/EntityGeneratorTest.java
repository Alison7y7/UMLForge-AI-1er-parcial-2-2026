package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlRelation;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EntityGeneratorTest {

    @Test
    void testOneToManyRelation() {
        EntityGenerator generator = new EntityGenerator(new RelationshipMapper());
        
        UmlClass cliente = new UmlClass("c1", "Cliente", null, 0, 0, List.of(), List.of());
        UmlClass pedido = new UmlClass("c2", "Pedido", null, 0, 0, List.of(), List.of());
        
        // Cliente 1 ---- * Pedido
        UmlRelation relacion = new UmlRelation("r1", "c1", "c2", "ASOCIACION", "", "1", "*");
        
        UmlModelDto modelDto = new UmlModelDto(List.of(cliente, pedido), List.of(relacion));
        
        String clienteCode = generator.generateEntity(cliente, modelDto, "com.test");
        String pedidoCode = generator.generateEntity(pedido, modelDto, "com.test");
        
        assertTrue(clienteCode.contains("@OneToMany("), "Cliente debe tener @OneToMany");
        assertTrue(clienteCode.contains("mappedBy = \"cliente\""), "Cliente debe tener mappedBy=\"cliente\"");
        assertTrue(clienteCode.contains("private List<Pedido> pedidos;"), "Cliente debe tener lista de pedidos");
        
        assertTrue(pedidoCode.contains("@ManyToOne"), "Pedido debe tener @ManyToOne");
        assertTrue(pedidoCode.contains("@JoinColumn(name=\"cliente_id\")"), "Pedido debe tener @JoinColumn(name=\"cliente_id\")");
        assertTrue(pedidoCode.contains("private Cliente cliente;"), "Pedido debe tener la referencia al cliente");
    }

    @Test
    void testAttributeNormalizationAndTypes() {
        EntityGenerator generator = new EntityGenerator(new RelationshipMapper());
        
        UmlAttribute attr1 = new UmlAttribute("a1", "ID", "Long", "public");
        UmlAttribute attr2 = new UmlAttribute("a2", "Fecha", "LongDate", "public");
        UmlAttribute attr3 = new UmlAttribute("a3", "Total", "BigDecimal", "public");
        
        UmlClass pedido = new UmlClass("c1", "Pedido", null, 0, 0, List.of(attr1, attr2, attr3), List.of());
        
        UmlModelDto modelDto = new UmlModelDto(List.of(pedido), List.of());
        
        String code = generator.generateEntity(pedido, modelDto, "com.test");
        
        assertTrue(code.contains("private Long id;"), "Debe generar 'private Long id;' pero generó: " + code);
        assertTrue(code.contains("private Long fecha;"), "Debe generar 'private Long fecha;' pero generó: " + code);
        assertTrue(code.contains("private java.math.BigDecimal total;"), "Debe generar 'private java.math.BigDecimal total;' pero generó: " + code);
    }
}
