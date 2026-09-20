package com.umlforge.backend.service;

import com.umlforge.backend.dto.XmiImportResponse;
import com.umlforge.backend.exception.XmiExportException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class XmiExportService {

    private static final String XMI_NAMESPACE = "http://schema.omg.org/spec/XMI/2.1";
    private static final String UML_NAMESPACE = "http://schema.omg.org/spec/UML/2.1";
    private static final String PRIMITIVE_TYPES_URI =
        "http://www.sparxsystems.com/profiles/UML2.1/PrimitiveTypes.xmi#";
    private static final String EA_EXPORTER_VERSION = "6.5";
    private static final String EA_EXPORTER_ID = "1554";
    private static final Set<String> ASSOCIATION_TYPES = Set.of(
        "ASOCIACION", "AGREGACION", "COMPOSICION"
    );

    public byte[] exportar(String nombre, XmiImportResponse modelo) {
        validateModel(modelo);

        try {
            Document document = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
            Element root = document.createElementNS(XMI_NAMESPACE, "xmi:XMI");
            root.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns:xmi", XMI_NAMESPACE);
            root.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns:uml", UML_NAMESPACE);
            setXmiAttribute(root, "version", "2.1");
            document.appendChild(root);

            Element documentation = document.createElementNS(XMI_NAMESPACE, "xmi:Documentation");
            documentation.setAttribute("exporter", "Enterprise Architect");
            documentation.setAttribute("exporterVersion", EA_EXPORTER_VERSION);
            documentation.setAttribute("exporterID", EA_EXPORTER_ID);
            root.appendChild(documentation);

            String safeModelName = normalizedName(nombre, "Diagrama UML");
            String modelId = stableId("MODEL", safeModelName);
            String packageId = stablePackageId(safeModelName);
            String diagramId = stableId("DIAGRAM", safeModelName);

            Element umlModel = document.createElementNS(UML_NAMESPACE, "uml:Model");
            setXmiAttribute(umlModel, "id", modelId);
            umlModel.setAttribute("name", safeModelName);
            root.appendChild(umlModel);

            Element umlPackage = packagedElement(document, "uml:Package", packageId, safeModelName);
            umlModel.appendChild(umlPackage);

            Map<String, String> classIds = new LinkedHashMap<>();
            Map<String, String> classNames = new HashMap<>();
            Map<String, Element> classElements = new HashMap<>();
            for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
                String xmiId = stableId("CLASS", umlClass.id());
                classIds.put(umlClass.id(), xmiId);
                classNames.putIfAbsent(umlClass.nombre(), xmiId);
            }

            for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
                String xmiId = classIds.get(umlClass.id());
                Element classElement = packagedElement(
                    document,
                    "uml:Class",
                    xmiId,
                    normalizedName(umlClass.nombre(), "Clase")
                );
                classElement.setAttribute("visibility", "public");
                if (umlClass.estereotipo() != null && !umlClass.estereotipo().isBlank()) {
                    classElement.setAttribute("stereotype", umlClass.estereotipo().trim());
                }
                umlPackage.appendChild(classElement);
                classElements.put(umlClass.id(), classElement);

                appendAttributes(document, classElement, umlClass, classNames);
                appendMethods(document, classElement, umlClass, classNames);
            }

            Map<String, String> relationIds = appendRelations(
                document,
                umlPackage,
                modelo.relaciones(),
                classIds,
                classElements
            );
            appendEaExtension(
                document,
                root,
                safeModelName,
                packageId,
                diagramId,
                modelo,
                classIds,
                relationIds
            );

            return serialize(document);
        } catch (ParserConfigurationException | TransformerException exception) {
            throw new XmiExportException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "No se pudo generar el archivo XMI."
            );
        }
    }

    public String nombreArchivo(String nombre) {
        String base = normalizedName(nombre, "diagrama-uml")
            .replaceAll("[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+", "-")
            .replaceAll("^-+|-+$", "");
        return (base.isBlank() ? "diagrama-uml" : base) + ".xmi";
    }

    private void validateModel(XmiImportResponse modelo) {
        if (modelo == null || modelo.clases() == null || modelo.clases().isEmpty()) {
            throw new XmiExportException(HttpStatus.BAD_REQUEST, "No hay elementos UML para exportar.");
        }
        if (modelo.relaciones() == null) {
            throw invalidModel();
        }

        Set<String> classIds = new HashSet<>();
        for (XmiImportResponse.UmlClass umlClass : modelo.clases()) {
            if (umlClass == null || umlClass.id() == null || umlClass.id().isBlank()
                    || !classIds.add(umlClass.id()) || umlClass.atributos() == null
                    || umlClass.metodos() == null) {
                throw invalidModel();
            }
        }
        Set<String> relationIds = new HashSet<>();
        for (XmiImportResponse.UmlRelation relation : modelo.relaciones()) {
            if (relation == null || relation.id() == null || relation.id().isBlank()
                    || !relationIds.add(relation.id())
                    || !classIds.contains(relation.origen()) || !classIds.contains(relation.destino())) {
                throw invalidModel();
            }
            String type = normalizedRelationType(relation.tipo());
            if (!ASSOCIATION_TYPES.contains(type)
                    && !"HERENCIA".equals(type)
                    && !"GENERALIZACION".equals(type)
                    && !"DEPENDENCIA".equals(type)) {
                throw invalidModel();
            }
        }
    }

    private XmiExportException invalidModel() {
        return new XmiExportException(HttpStatus.BAD_REQUEST, "No se pudo generar el archivo XMI.");
    }

    private void appendAttributes(
            Document document,
            Element classElement,
            XmiImportResponse.UmlClass umlClass,
            Map<String, String> classNames) {
        for (int index = 0; index < umlClass.atributos().size(); index++) {
            XmiImportResponse.UmlAttribute attribute = umlClass.atributos().get(index);
            if (attribute == null) throw invalidModel();

            Element ownedAttribute = document.createElement("ownedAttribute");
            setXmiAttribute(ownedAttribute, "type", "uml:Property");
            setXmiAttribute(ownedAttribute, "id", stableId(
                "ATTRIBUTE",
                umlClass.id() + ":" + index + ":" + safeText(attribute.id())
            ));
            ownedAttribute.setAttribute("name", normalizedName(attribute.nombre(), "atributo" + (index + 1)));
            ownedAttribute.setAttribute("visibility", normalizedVisibility(attribute.visibilidad(), "private"));
            appendType(document, ownedAttribute, attribute.tipo(), "String", classNames);
            classElement.appendChild(ownedAttribute);
        }
    }

    private void appendMethods(
            Document document,
            Element classElement,
            XmiImportResponse.UmlClass umlClass,
            Map<String, String> classNames) {
        for (int methodIndex = 0; methodIndex < umlClass.metodos().size(); methodIndex++) {
            XmiImportResponse.UmlMethod method = umlClass.metodos().get(methodIndex);
            if (method == null || method.parametros() == null) throw invalidModel();

            String methodKey = umlClass.id() + ":" + methodIndex + ":" + safeText(method.id());
            Element operation = document.createElement("ownedOperation");
            setXmiAttribute(operation, "type", "uml:Operation");
            setXmiAttribute(operation, "id", stableId("OPERATION", methodKey));
            operation.setAttribute("name", normalizedName(method.nombre(), "metodo" + (methodIndex + 1)));
            operation.setAttribute("visibility", normalizedVisibility(method.visibilidad(), "public"));

            for (int parameterIndex = 0; parameterIndex < method.parametros().size(); parameterIndex++) {
                XmiImportResponse.UmlParameter parameter = method.parametros().get(parameterIndex);
                if (parameter == null) throw invalidModel();
                Element parameterElement = document.createElement("ownedParameter");
                setXmiAttribute(parameterElement, "type", "uml:Parameter");
                setXmiAttribute(parameterElement, "id", stableId(
                    "PARAMETER",
                    methodKey + ":" + parameterIndex
                ));
                parameterElement.setAttribute(
                    "name",
                    normalizedName(parameter.nombre(), "parametro" + (parameterIndex + 1))
                );
                parameterElement.setAttribute("direction", "in");
                appendType(document, parameterElement, parameter.tipo(), "String", classNames);
                operation.appendChild(parameterElement);
            }

            Element returnElement = document.createElement("ownedParameter");
            setXmiAttribute(returnElement, "type", "uml:Parameter");
            setXmiAttribute(returnElement, "id", stableId("RETURN", methodKey));
            returnElement.setAttribute("direction", "return");
            appendType(document, returnElement, method.tipoRetorno(), "void", classNames);
            operation.appendChild(returnElement);
            classElement.appendChild(operation);
        }
    }

    private Map<String, String> appendRelations(
            Document document,
            Element umlPackage,
            List<XmiImportResponse.UmlRelation> relations,
            Map<String, String> classIds,
            Map<String, Element> classElements) {
        Map<String, String> relationIds = new LinkedHashMap<>();

        for (XmiImportResponse.UmlRelation relation : relations) {
            String type = normalizedRelationType(relation.tipo());
            String relationId = stableId("RELATION", relation.id());
            relationIds.put(relation.id(), relationId);
            String sourceId = classIds.get(relation.origen());
            String targetId = classIds.get(relation.destino());

            if (ASSOCIATION_TYPES.contains(type)) {
                Element association = packagedElement(
                    document,
                    "uml:Association",
                    relationId,
                    relation.nombre() == null ? "" : relation.nombre().trim()
                );
                String sourceEndId = stableId("END_SOURCE", relation.id());
                String targetEndId = stableId("END_TARGET", relation.id());
                association.setAttribute("memberEnd", sourceEndId + " " + targetEndId);
                association.appendChild(associationEnd(
                    document,
                    sourceEndId,
                    sourceId,
                    relationId,
                    "",
                    relation.multiplicidadOrigen()
                ));
                association.appendChild(associationEnd(
                    document,
                    targetEndId,
                    targetId,
                    relationId,
                    switch (type) {
                        case "AGREGACION" -> "shared";
                        case "COMPOSICION" -> "composite";
                        default -> "";
                    },
                    relation.multiplicidadDestino()
                ));
                umlPackage.appendChild(association);
            } else if ("HERENCIA".equals(type) || "GENERALIZACION".equals(type)) {
                Element generalization = document.createElement("generalization");
                setXmiAttribute(generalization, "type", "uml:Generalization");
                setXmiAttribute(generalization, "id", relationId);
                generalization.setAttribute("general", targetId);
                classElements.get(relation.origen()).appendChild(generalization);
            } else if ("DEPENDENCIA".equals(type)) {
                Element dependency = packagedElement(
                    document,
                    "uml:Dependency",
                    relationId,
                    relation.nombre() == null ? "" : relation.nombre().trim()
                );
                dependency.setAttribute("client", sourceId);
                dependency.setAttribute("supplier", targetId);
                umlPackage.appendChild(dependency);
            }
        }
        return relationIds;
    }

    private Element associationEnd(
            Document document,
            String endId,
            String classId,
            String associationId,
            String aggregation,
            String multiplicity) {
        Element end = document.createElement("ownedEnd");
        setXmiAttribute(end, "type", "uml:Property");
        setXmiAttribute(end, "id", endId);
        end.setAttribute("type", classId);
        end.setAttribute("association", associationId);
        if (!aggregation.isBlank()) end.setAttribute("aggregation", aggregation);
        appendMultiplicity(document, end, multiplicity);
        return end;
    }

    private void appendMultiplicity(Document document, Element end, String multiplicity) {
        Multiplicity bounds = parseMultiplicity(multiplicity);
        if (bounds == null) return;

        Element lower = document.createElement("lowerValue");
        setXmiAttribute(lower, "type", "uml:LiteralInteger");
        setXmiAttribute(lower, "id", stableId("LOWER", xmiId(end)));
        lower.setAttribute("value", bounds.lower);
        end.appendChild(lower);

        Element upper = document.createElement("upperValue");
        setXmiAttribute(upper, "type", "uml:LiteralUnlimitedNatural");
        setXmiAttribute(upper, "id", stableId("UPPER", xmiId(end)));
        upper.setAttribute("value", bounds.upper);
        end.appendChild(upper);
    }

    private Multiplicity parseMultiplicity(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.replace(" ", "").replace("-1", "*");
        if (normalized.matches("\\d+|\\*")) return new Multiplicity(normalized, normalized);
        if (normalized.matches("\\d+\\.\\.(\\d+|\\*)")) {
            String[] parts = normalized.split("\\.\\.");
            return new Multiplicity(parts[0], parts[1]);
        }
        throw invalidModel();
    }

    private void appendType(
            Document document,
            Element owner,
            String requestedType,
            String fallback,
            Map<String, String> classNames) {
        String typeName = normalizedName(requestedType, fallback);
        String classId = classNames.get(typeName);
        if (classId != null) {
            owner.setAttribute("type", classId);
            return;
        }

        Element type = document.createElement("type");
        setXmiAttribute(type, "type", "uml:PrimitiveType");
        type.setAttribute("href", PRIMITIVE_TYPES_URI + typeName.replace(" ", "_"));
        owner.appendChild(type);
    }

    private void appendEaExtension(
            Document document,
            Element root,
            String modelName,
            String packageId,
            String diagramId,
            XmiImportResponse modelo,
            Map<String, String> classIds,
            Map<String, String> relationIds) {
        Element extension = document.createElementNS(XMI_NAMESPACE, "xmi:Extension");
        extension.setAttribute("extender", "Enterprise Architect");
        extension.setAttribute("extenderID", EA_EXPORTER_VERSION);
        root.appendChild(extension);

        Element elements = document.createElement("elements");
        elements.appendChild(eaPackageElement(document, modelName, packageId));

        Map<String, Integer> classLocalIds = new LinkedHashMap<>();
        for (int index = 0; index < modelo.clases().size(); index++) {
            XmiImportResponse.UmlClass umlClass = modelo.clases().get(index);
            int localId = index + 1;
            classLocalIds.put(umlClass.id(), localId);

            Element element = document.createElement("element");
            setXmiAttribute(element, "idref", classIds.get(umlClass.id()));
            setXmiAttribute(element, "type", "uml:Class");
            element.setAttribute("name", normalizedName(umlClass.nombre(), "Clase"));
            element.setAttribute("scope", "public");

            Element model = document.createElement("model");
            model.setAttribute("package", packageId);
            model.setAttribute("tpos", Integer.toString(index));
            model.setAttribute("ea_localid", Integer.toString(localId));
            model.setAttribute("ea_eleType", "element");
            element.appendChild(model);

            Element properties = document.createElement("properties");
            properties.setAttribute("isSpecification", "false");
            properties.setAttribute("sType", "Class");
            properties.setAttribute("nType", "0");
            properties.setAttribute("scope", "public");
            properties.setAttribute("isRoot", "false");
            properties.setAttribute("isAbstract", "false");
            properties.setAttribute("isLeaf", "false");
            if (umlClass.estereotipo() != null && !umlClass.estereotipo().isBlank()) {
                properties.setAttribute("stereotype", umlClass.estereotipo().trim());
            }
            element.appendChild(properties);

            elements.appendChild(element);
        }
        extension.appendChild(elements);

        Element connectors = document.createElement("connectors");
        for (int index = 0; index < modelo.relaciones().size(); index++) {
            XmiImportResponse.UmlRelation relation = modelo.relaciones().get(index);
            String type = normalizedRelationType(relation.tipo());
            Element connector = document.createElement("connector");
            setXmiAttribute(connector, "idref", relationIds.get(relation.id()));

            connector.appendChild(eaConnectorEnd(
                document,
                "source",
                classIds.get(relation.origen()),
                classLocalIds.get(relation.origen()),
                className(modelo, relation.origen()),
                safeText(relation.multiplicidadOrigen()),
                "none",
                false
            ));
            connector.appendChild(eaConnectorEnd(
                document,
                "target",
                classIds.get(relation.destino()),
                classLocalIds.get(relation.destino()),
                className(modelo, relation.destino()),
                safeText(relation.multiplicidadDestino()),
                switch (type) {
                case "AGREGACION" -> "shared";
                case "COMPOSICION" -> "composite";
                default -> "none";
                },
                true
            ));

            Element connectorModel = document.createElement("model");
            connectorModel.setAttribute("ea_localid", Integer.toString(index + 1));
            connector.appendChild(connectorModel);

            Element properties = document.createElement("properties");
            properties.setAttribute("name", safeText(relation.nombre()));
            properties.setAttribute("ea_type", eaRelationType(type));
            properties.setAttribute("direction", "Source -> Destination");
            connector.appendChild(properties);

            connector.appendChild(document.createElement("documentation"));

            Element appearance = document.createElement("appearance");
            appearance.setAttribute("linemode", "3");
            appearance.setAttribute("linecolor", "-1");
            appearance.setAttribute("linewidth", "0");
            appearance.setAttribute("seqno", Integer.toString(index + 1));
            appearance.setAttribute("headStyle", "0");
            appearance.setAttribute("lineStyle", "0");
            connector.appendChild(appearance);

            Element labels = document.createElement("labels");
            labels.setAttribute("mt", safeText(relation.nombre()));
            connector.appendChild(labels);
            connector.appendChild(document.createElement("extendedProperties"));
            connector.appendChild(document.createElement("style"));
            connector.appendChild(document.createElement("xrefs"));
            connector.appendChild(document.createElement("tags"));
            connectors.appendChild(connector);
        }
        extension.appendChild(connectors);

        appendEaDiagram(
            document,
            extension,
            modelName,
            packageId,
            diagramId,
            modelo,
            classIds,
            relationIds
        );
    }

    private Element eaPackageElement(Document document, String modelName, String packageId) {
        Element element = document.createElement("element");
        setXmiAttribute(element, "idref", packageId);
        setXmiAttribute(element, "type", "uml:Package");
        element.setAttribute("name", modelName);
        element.setAttribute("scope", "public");

        Element model = document.createElement("model");
        model.setAttribute("package2", packageElementId(packageId));
        model.setAttribute("tpos", "0");
        model.setAttribute("ea_localid", "1");
        model.setAttribute("ea_eleType", "package");
        element.appendChild(model);

        Element properties = document.createElement("properties");
        properties.setAttribute("isSpecification", "false");
        properties.setAttribute("sType", "Package");
        properties.setAttribute("nType", "0");
        properties.setAttribute("scope", "public");
        element.appendChild(properties);

        Element packageProperties = document.createElement("packageproperties");
        packageProperties.setAttribute("version", "1.0");
        element.appendChild(packageProperties);
        return element;
    }

    private Element eaConnectorEnd(
            Document document,
            String elementName,
            String classId,
            int localId,
            String className,
            String multiplicity,
            String aggregation,
            boolean navigable) {
        Element end = document.createElement(elementName);
        setXmiAttribute(end, "idref", classId);

        Element model = document.createElement("model");
        model.setAttribute("ea_localid", Integer.toString(localId));
        model.setAttribute("type", "Class");
        model.setAttribute("name", className);
        end.appendChild(model);

        Element role = document.createElement("role");
        role.setAttribute("visibility", "Public");
        role.setAttribute("targetScope", "instance");
        end.appendChild(role);

        Element type = document.createElement("type");
        type.setAttribute("aggregation", aggregation);
        type.setAttribute("containment", "Unspecified");
        type.setAttribute("multiplicity", multiplicity);
        end.appendChild(type);
        end.appendChild(document.createElement("constraints"));

        Element modifiers = document.createElement("modifiers");
        modifiers.setAttribute("isOrdered", "false");
        modifiers.setAttribute("changeable", "none");
        modifiers.setAttribute("isNavigable", Boolean.toString(navigable));
        end.appendChild(modifiers);

        Element style = document.createElement("style");
        style.setAttribute(
            "value",
            "Union=0;Derived=0;AllowDuplicates=0;Owned=0;Navigable="
                + (navigable ? "Navigable" : "Non-Navigable") + ";"
        );
        end.appendChild(style);
        end.appendChild(document.createElement("documentation"));
        end.appendChild(document.createElement("xrefs"));
        end.appendChild(document.createElement("tags"));
        return end;
    }

    private void appendEaDiagram(
            Document document,
            Element extension,
            String modelName,
            String packageId,
            String diagramId,
            XmiImportResponse modelo,
            Map<String, String> classIds,
            Map<String, String> relationIds) {
        Element diagrams = document.createElement("diagrams");
        Element diagram = document.createElement("diagram");
        setXmiAttribute(diagram, "id", diagramId);

        Element model = document.createElement("model");
        model.setAttribute("package", packageId);
        model.setAttribute("localID", "1");
        model.setAttribute("owner", packageId);
        diagram.appendChild(model);

        Element properties = document.createElement("properties");
        properties.setAttribute("name", modelName);
        properties.setAttribute("type", "Logical");
        diagram.appendChild(properties);

        Element style = document.createElement("style1");
        style.setAttribute(
            "value",
            "ShowPrivate=1;ShowProtected=1;ShowPublic=1;OpParams=1;"
                + "VisibleAttributeDetail=0;ShowOpRetType=1;HideAtts=0;HideOps=0;"
        );
        diagram.appendChild(style);

        Element style2 = document.createElement("style2");
        style2.setAttribute("value", "VisibleAttributeDetail=0;ShowOpRetType=1;");
        diagram.appendChild(style2);
        diagram.appendChild(document.createElement("extendedProperties"));

        double minX = modelo.clases().stream().mapToDouble(XmiImportResponse.UmlClass::posicionX).min().orElse(0);
        double minY = modelo.clases().stream().mapToDouble(XmiImportResponse.UmlClass::posicionY).min().orElse(0);
        Element diagramElements = document.createElement("elements");
        for (int index = 0; index < modelo.clases().size(); index++) {
            XmiImportResponse.UmlClass umlClass = modelo.clases().get(index);
            int left = (int) Math.round(umlClass.posicionX() - minX + 100);
            int top = (int) Math.round(umlClass.posicionY() - minY + 100);
            int height = Math.max(120, 75 + (umlClass.atributos().size() + umlClass.metodos().size()) * 18);

            Element diagramElement = document.createElement("element");
            diagramElement.setAttribute(
                "geometry",
                "Left=" + left + ";Top=" + top + ";Right=" + (left + 240)
                    + ";Bottom=" + (top + height) + ";"
            );
            diagramElement.setAttribute("subject", classIds.get(umlClass.id()));
            diagramElement.setAttribute("seqno", Integer.toString(index + 1));
            diagramElement.setAttribute("style", "DUID=" + stableDuid(umlClass.id()) + ";");
            diagramElements.appendChild(diagramElement);
        }
        diagram.appendChild(diagramElements);

        Element links = document.createElement("links");
        for (XmiImportResponse.UmlRelation relation : modelo.relaciones()) {
            Element link = document.createElement("link");
            link.setAttribute("connector", relationIds.get(relation.id()));
            link.setAttribute("geometry", "EDGE=3;SX=0;SY=0;EX=0;EY=0;");
            link.setAttribute(
                "style",
                "Mode=3;EOID=" + stableDuid(relation.destino())
                    + ";SOID=" + stableDuid(relation.origen())
                    + ";Color=-1;LWidth=0;"
            );
            links.appendChild(link);
        }
        diagram.appendChild(links);
        diagrams.appendChild(diagram);
        extension.appendChild(diagrams);
    }

    private Element packagedElement(Document document, String type, String id, String name) {
        Element element = document.createElement("packagedElement");
        setXmiAttribute(element, "type", type);
        setXmiAttribute(element, "id", id);
        element.setAttribute("name", name);
        return element;
    }

    private byte[] serialize(Document document) throws TransformerException {
        TransformerFactory factory = TransformerFactory.newInstance();
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
        Transformer transformer = factory.newTransformer();
        transformer.setOutputProperty(OutputKeys.ENCODING, StandardCharsets.UTF_8.name());
        transformer.setOutputProperty(OutputKeys.INDENT, "yes");
        transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        transformer.transform(new DOMSource(document), new StreamResult(output));
        return output.toByteArray();
    }

    private void setXmiAttribute(Element element, String name, String value) {
        element.setAttributeNS(XMI_NAMESPACE, "xmi:" + name, value);
    }

    private String xmiId(Element element) {
        return element.getAttributeNS(XMI_NAMESPACE, "id");
    }

    private String stableId(String prefix, String source) {
        UUID uuid = UUID.nameUUIDFromBytes(
            (prefix + ":" + safeText(source)).getBytes(StandardCharsets.UTF_8)
        );
        return "EAID_" + uuid.toString().replace('-', '_').toUpperCase(Locale.ROOT);
    }

    private String stablePackageId(String source) {
        UUID uuid = UUID.nameUUIDFromBytes(
            ("PACKAGE:" + safeText(source)).getBytes(StandardCharsets.UTF_8)
        );
        return "EAPK_" + uuid.toString().replace('-', '_').toUpperCase(Locale.ROOT);
    }

    private String packageElementId(String packageId) {
        return "EAID_" + packageId.substring("EAPK_".length());
    }

    private String stableDuid(String source) {
        UUID uuid = UUID.nameUUIDFromBytes(
            ("DUID:" + safeText(source)).getBytes(StandardCharsets.UTF_8)
        );
        return uuid.toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String className(XmiImportResponse model, String classId) {
        return model.clases().stream()
            .filter(umlClass -> umlClass.id().equals(classId))
            .map(XmiImportResponse.UmlClass::nombre)
            .findFirst()
            .map(name -> normalizedName(name, "Clase"))
            .orElse("Clase");
    }

    private String normalizedName(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String normalizedVisibility(String value, String fallback) {
        if (value == null) return fallback;
        String normalized = value.toLowerCase(Locale.ROOT).trim();
        return Set.of("public", "private", "protected").contains(normalized) ? normalized : fallback;
    }

    private String normalizedRelationType(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String eaRelationType(String type) {
        return switch (type) {
            case "HERENCIA", "GENERALIZACION" -> "Generalization";
            case "DEPENDENCIA" -> "Dependency";
            default -> "Association";
        };
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private record Multiplicity(String lower, String upper) {}
}
