package com.umlforge.backend.service;

import com.umlforge.backend.dto.XmiImportResponse;
import com.umlforge.backend.exception.XmiImportException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class XmiImportService {

    static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;

    private static final String XMI_NAMESPACE = "http://www.omg.org/spec/XMI/20131001";
    private static final Pattern GEOMETRY_VALUE = Pattern.compile(
        "(?:^|;)\\s*(left|right|top|bottom|cx|cy)\\s*=\\s*(-?\\d+(?:\\.\\d+)?)",
        Pattern.CASE_INSENSITIVE
    );
    private static final Set<String> SUPPORTED_VISIBILITIES = Set.of("public", "private", "protected");

    public XmiImportResponse importar(MultipartFile archivo) {
        validateFile(archivo);

        byte[] content;
        try {
            content = archivo.getBytes();
        } catch (IOException exception) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo XMI.");
        }

        if (content.length == 0 || isBlank(content)) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "El archivo XMI está vacío.");
        }

        Document document = parseSecurely(content);
        if (!isRecognizedXmi(document)) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "El formato XMI no es compatible.");
        }

        return convert(document);
    }

    private void validateFile(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "El archivo XMI está vacío.");
        }
        if (archivo.getSize() > MAX_FILE_SIZE) {
            throw new XmiImportException(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "El archivo XMI supera el tamaño máximo permitido de 10 MB."
            );
        }

        String filename = archivo.getOriginalFilename();
        if (filename == null) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "El archivo debe tener extensión .xmi o .xml.");
        }
        String lowercaseName = filename.toLowerCase(Locale.ROOT);
        if (!lowercaseName.endsWith(".xmi") && !lowercaseName.endsWith(".xml")) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "Solo se permiten archivos .xmi o .xml.");
        }
    }

    private boolean isBlank(byte[] content) {
        for (byte value : content) {
            if (!Character.isWhitespace((char) (value & 0xff))) return false;
        }
        return true;
    }

    private Document parseSecurely(byte[] content) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");

            DocumentBuilder builder = factory.newDocumentBuilder();
            builder.setEntityResolver((publicId, systemId) -> new InputSource(new StringReader("")));
            return builder.parse(new ByteArrayInputStream(content));
        } catch (ParserConfigurationException | SAXException | IOException exception) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "El archivo no contiene XML válido.");
        }
    }

    private boolean isRecognizedXmi(Document document) {
        Element root = document.getDocumentElement();
        if (root == null) return false;
        if ("XMI".equalsIgnoreCase(localName(root))) return true;
        if (!xmiAttribute(root, "version").isBlank()) return true;

        NamedNodeMap attributes = root.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            Node attribute = attributes.item(index);
            if (attribute.getNodeName().startsWith("xmlns")
                    && attribute.getNodeValue().toLowerCase(Locale.ROOT).contains("xmi")) {
                return true;
            }
        }

        for (Element element : allElements(document)) {
            if (!elementType(element).isBlank()) return true;
        }
        return false;
    }

    private XmiImportResponse convert(Document document) {
        List<Element> elements = allElements(document);
        Map<String, Element> elementsById = indexElementsById(elements);
        Map<String, String> typeNames = collectTypeNames(elements);
        List<ClassSource> classSources = collectClasses(elements, typeNames);

        if (classSources.isEmpty()) {
            throw new XmiImportException(HttpStatus.BAD_REQUEST, "No se encontraron clases UML compatibles.");
        }

        Map<String, String> idMap = new LinkedHashMap<>();
        for (int index = 0; index < classSources.size(); index++) {
            idMap.put(classSources.get(index).xmiId, "xmi-clase-" + (index + 1));
        }

        Map<String, String> stereotypes = collectStereotypes(elements, idMap.keySet());
        Map<String, Point> positions = normalizePositions(extractEaPositions(elements, idMap.keySet()));
        Counters counters = new Counters();
        List<XmiImportResponse.UmlClass> classes = new ArrayList<>();

        for (int index = 0; index < classSources.size(); index++) {
            ClassSource source = classSources.get(index);
            Point position = positions.getOrDefault(source.xmiId, fallbackPosition(index));
            List<XmiImportResponse.UmlAttribute> attributes = parseAttributes(
                source.element,
                typeNames,
                counters
            );
            List<XmiImportResponse.UmlMethod> methods = parseMethods(
                source.element,
                typeNames,
                counters
            );
            String stereotype = firstNonBlank(
                plainAttribute(source.element, "stereotype"),
                stereotypes.get(source.xmiId),
                ""
            );

            classes.add(new XmiImportResponse.UmlClass(
                idMap.get(source.xmiId),
                source.name,
                stereotype,
                position.x,
                position.y,
                attributes,
                methods
            ));
        }

        List<XmiImportResponse.UmlRelation> relations = parseRelations(
            elements,
            elementsById,
            classSources,
            idMap,
            counters
        );

        return new XmiImportResponse(List.copyOf(classes), List.copyOf(relations));
    }

    private List<ClassSource> collectClasses(List<Element> elements, Map<String, String> typeNames) {
        Map<String, ClassSource> classesByXmiId = new LinkedHashMap<>();

        for (Element element : elements) {
            if (!isSemanticUmlElement(element, "Class")) continue;
            String xmiId = xmiId(element);
            String name = firstNonBlank(
                plainAttribute(element, "name"),
                "Clase " + (classesByXmiId.size() + 1)
            );
            classesByXmiId.putIfAbsent(xmiId, new ClassSource(xmiId, name, element));
            typeNames.putIfAbsent(xmiId, name);
        }
        return List.copyOf(classesByXmiId.values());
    }

    private Map<String, Element> indexElementsById(List<Element> elements) {
        Map<String, Element> result = new HashMap<>();
        for (Element element : elements) {
            String id = xmiId(element);
            if (!id.isBlank()) result.putIfAbsent(id, element);
        }
        return result;
    }

    private Map<String, String> collectTypeNames(List<Element> elements) {
        Map<String, String> result = new HashMap<>();
        for (Element element : elements) {
            String type = umlTypeName(element);
            if (!Set.of("Class", "DataType", "PrimitiveType", "Enumeration", "Interface").contains(type)) {
                continue;
            }
            if (isInsideXmiExtension(element)) continue;
            String id = xmiId(element);
            String name = plainAttribute(element, "name");
            if (!id.isBlank() && !name.isBlank()) result.put(id, name);
        }
        return result;
    }

    private List<XmiImportResponse.UmlAttribute> parseAttributes(
            Element classElement,
            Map<String, String> typeNames,
            Counters counters) {
        List<XmiImportResponse.UmlAttribute> result = new ArrayList<>();
        for (Element child : childElements(classElement)) {
            if (!"ownedAttribute".equalsIgnoreCase(localName(child))) continue;
            if (!plainAttribute(child, "association").isBlank()) continue;
            String aggregation = plainAttribute(child, "aggregation");
            if ("shared".equalsIgnoreCase(aggregation) || "composite".equalsIgnoreCase(aggregation)) continue;

            result.add(new XmiImportResponse.UmlAttribute(
                "xmi-atributo-" + (++counters.attribute),
                firstNonBlank(plainAttribute(child, "name"), "atributo" + counters.attribute),
                resolvePropertyType(child, typeNames),
                normalizeVisibility(plainAttribute(child, "visibility"), "private")
            ));
        }
        return List.copyOf(result);
    }

    private List<XmiImportResponse.UmlMethod> parseMethods(
            Element classElement,
            Map<String, String> typeNames,
            Counters counters) {
        List<XmiImportResponse.UmlMethod> result = new ArrayList<>();
        for (Element child : childElements(classElement)) {
            if (!"ownedOperation".equalsIgnoreCase(localName(child))) continue;

            List<XmiImportResponse.UmlParameter> parameters = new ArrayList<>();
            String returnType = "void";
            for (Element parameter : childElements(child)) {
                if (!"ownedParameter".equalsIgnoreCase(localName(parameter))) continue;
                String direction = plainAttribute(parameter, "direction");
                if ("return".equalsIgnoreCase(direction)) {
                    returnType = resolveType(parameter, typeNames, "void");
                } else {
                    parameters.add(new XmiImportResponse.UmlParameter(
                        firstNonBlank(plainAttribute(parameter, "name"), "parametro" + (parameters.size() + 1)),
                        resolveType(parameter, typeNames, "String")
                    ));
                }
            }

            result.add(new XmiImportResponse.UmlMethod(
                "xmi-metodo-" + (++counters.method),
                firstNonBlank(plainAttribute(child, "name"), "metodo" + counters.method),
                returnType,
                normalizeVisibility(plainAttribute(child, "visibility"), "public"),
                List.copyOf(parameters)
            ));
        }
        return List.copyOf(result);
    }

    private List<XmiImportResponse.UmlRelation> parseRelations(
            List<Element> elements,
            Map<String, Element> elementsById,
            List<ClassSource> classSources,
            Map<String, String> idMap,
            Counters counters) {
        List<XmiImportResponse.UmlRelation> result = new ArrayList<>();
        Set<String> relationKeys = new HashSet<>();

        for (Element element : elements) {
            if (!isSemanticUmlElement(element, "Association")) continue;
            String relationKey = "ASOCIACION:" + xmiId(element);
            if (!relationKeys.add(relationKey)) continue;
            XmiImportResponse.UmlRelation relation = parseAssociation(
                element,
                elements,
                elementsById,
                idMap,
                counters
            );
            if (relation != null) result.add(relation);
        }

        for (ClassSource source : classSources) {
            for (Element child : childElements(source.element)) {
                if (!isUmlType(child, "Generalization")) continue;
                String parentId = normalizeReference(firstNonBlank(
                    plainAttribute(child, "general"),
                    childReference(child, "general")
                ));
                addGeneralization(result, relationKeys, source.xmiId, parentId, child, idMap, counters);
            }
        }

        for (Element element : elements) {
            if (isSemanticUmlElement(element, "Generalization")) {
                String childId = normalizeReference(plainAttribute(element, "specific"));
                String parentId = normalizeReference(firstNonBlank(
                    plainAttribute(element, "general"),
                    childReference(element, "general")
                ));
                addGeneralization(result, relationKeys, childId, parentId, element, idMap, counters);
            }

            if (isSemanticUmlElement(element, "Dependency")) {
                String client = firstReference(element, "client");
                String supplier = firstReference(element, "supplier");
                if (!idMap.containsKey(client) || !idMap.containsKey(supplier)) continue;
                String key = "DEPENDENCIA:" + firstNonBlank(xmiId(element), client + ":" + supplier);
                if (!relationKeys.add(key)) continue;

                result.add(new XmiImportResponse.UmlRelation(
                    "xmi-relacion-" + (++counters.relation),
                    idMap.get(client),
                    idMap.get(supplier),
                    "DEPENDENCIA",
                    plainAttribute(element, "name"),
                    "",
                    ""
                ));
            }
        }

        return result;
    }

    private XmiImportResponse.UmlRelation parseAssociation(
            Element association,
            List<Element> allElements,
            Map<String, Element> elementsById,
            Map<String, String> idMap,
            Counters counters) {
        String associationId = xmiId(association);
        LinkedHashMap<String, Element> endElements = new LinkedHashMap<>();

        for (Element child : childElements(association)) {
            String local = localName(child);
            if ("ownedEnd".equalsIgnoreCase(local) || "navigableOwnedEnd".equalsIgnoreCase(local)) {
                putEnd(endElements, child);
            } else if ("memberEnd".equalsIgnoreCase(local)) {
                String reference = normalizeReference(firstNonBlank(
                    xmiIdRef(child),
                    plainAttribute(child, "href")
                ));
                if (elementsById.containsKey(reference)) putEnd(endElements, elementsById.get(reference));
            }
        }

        for (String reference : splitReferences(plainAttribute(association, "memberEnd"))) {
            Element end = elementsById.get(reference);
            if (end != null) putEnd(endElements, end);
        }

        if (!associationId.isBlank()) {
            for (Element candidate : allElements) {
                if (associationId.equals(normalizeReference(plainAttribute(candidate, "association")))) {
                    putEnd(endElements, candidate);
                }
            }
        }

        List<EndInfo> ends = new ArrayList<>();
        for (Element endElement : endElements.values()) {
            EndInfo info = createEndInfo(endElement, idMap);
            if (info != null) ends.add(info);
        }
        if (ends.size() < 2) return null;

        EndInfo first = ends.get(0);
        EndInfo second = ends.stream()
            .skip(1)
            .filter(end -> !end.classId.equals(first.classId) || ends.size() == 2)
            .findFirst()
            .orElse(ends.get(1));

        EndInfo aggregateEnd = ends.stream()
            .filter(end -> "shared".equalsIgnoreCase(end.aggregation)
                || "composite".equalsIgnoreCase(end.aggregation))
            .findFirst()
            .orElse(null);

        EaConnectorMetadata connector = findEaConnectorMetadata(allElements, associationId);
        String type = "ASOCIACION";
        String sourceClass = first.classId;
        String targetClass = second.classId;

        if (aggregateEnd == null
                && connector != null
                && idMap.containsKey(connector.sourceClassId)
                && idMap.containsKey(connector.targetClassId)) {
            sourceClass = connector.sourceClassId;
            targetClass = connector.targetClassId;
        } else if (aggregateEnd != null) {
            type = "composite".equalsIgnoreCase(aggregateEnd.aggregation) ? "COMPOSICION" : "AGREGACION";
            String wholeClass = idMap.containsKey(aggregateEnd.ownerClassId)
                ? aggregateEnd.ownerClassId
                : aggregateEnd.classId;
            String partClass = !aggregateEnd.classId.equals(wholeClass)
                ? aggregateEnd.classId
                : ends.stream()
                    .map(end -> end.classId)
                    .filter(classId -> !classId.equals(wholeClass))
                    .findFirst()
                    .orElse(second.classId);
            sourceClass = partClass;
            targetClass = wholeClass;
        }

        if (!idMap.containsKey(sourceClass) || !idMap.containsKey(targetClass)) return null;

        return new XmiImportResponse.UmlRelation(
            "xmi-relacion-" + (++counters.relation),
            idMap.get(sourceClass),
            idMap.get(targetClass),
            type,
            firstNonBlank(
                plainAttribute(association, "name"),
                connector == null ? "" : connector.name
            ),
            multiplicityFor(ends, sourceClass),
            multiplicityFor(ends, targetClass)
        );
    }

    private EaConnectorMetadata findEaConnectorMetadata(List<Element> elements, String associationId) {
        if (associationId.isBlank()) return null;

        for (Element element : elements) {
            if (!"connector".equalsIgnoreCase(localName(element))) continue;
            if (!isInsideXmiExtension(element)) continue;
            String connectorId = normalizeReference(firstNonBlank(
                xmiIdRef(element),
                xmiId(element),
                plainAttribute(element, "connector")
            ));
            if (!associationId.equals(connectorId)) continue;

            String sourceClassId = "";
            String targetClassId = "";
            String name = "";
            for (Element child : childElements(element)) {
                String childName = localName(child);
                if ("source".equalsIgnoreCase(childName)) {
                    sourceClassId = elementReference(child);
                } else if ("target".equalsIgnoreCase(childName)) {
                    targetClassId = elementReference(child);
                } else if ("labels".equalsIgnoreCase(childName)) {
                    name = firstNonBlank(
                        plainAttribute(child, "mt"),
                        plainAttribute(child, "name"),
                        name
                    );
                } else if ("properties".equalsIgnoreCase(childName)) {
                    name = firstNonBlank(plainAttribute(child, "name"), name);
                }
            }
            return new EaConnectorMetadata(sourceClassId, targetClassId, name);
        }
        return null;
    }

    private String elementReference(Element element) {
        return normalizeReference(firstNonBlank(
            xmiIdRef(element),
            plainAttribute(element, "subject"),
            plainAttribute(element, "element")
        ));
    }

    private void addGeneralization(
            List<XmiImportResponse.UmlRelation> relations,
            Set<String> relationKeys,
            String childId,
            String parentId,
            Element element,
            Map<String, String> idMap,
            Counters counters) {
        if (!idMap.containsKey(childId) || !idMap.containsKey(parentId)) return;
        String key = "HERENCIA:" + firstNonBlank(xmiId(element), childId + ":" + parentId);
        if (!relationKeys.add(key)) return;

        relations.add(new XmiImportResponse.UmlRelation(
            "xmi-relacion-" + (++counters.relation),
            idMap.get(childId),
            idMap.get(parentId),
            "HERENCIA",
            plainAttribute(element, "name"),
            "",
            ""
        ));
    }

    private EndInfo createEndInfo(Element element, Map<String, String> idMap) {
        String classId = normalizeReference(firstNonBlank(
            plainAttribute(element, "type"),
            childReference(element, "type")
        ));
        if (!idMap.containsKey(classId)) return null;

        return new EndInfo(
            classId,
            findOwningClassId(element, idMap.keySet()),
            plainAttribute(element, "aggregation"),
            readMultiplicity(element)
        );
    }

    private String findOwningClassId(Element element, Set<String> classIds) {
        Node parent = element.getParentNode();
        while (parent instanceof Element parentElement) {
            String id = xmiId(parentElement);
            if (classIds.contains(id) && isUmlType(parentElement, "Class")) return id;
            parent = parent.getParentNode();
        }
        return "";
    }

    private void putEnd(Map<String, Element> endElements, Element end) {
        String key = firstNonBlank(xmiId(end), "elemento-" + System.identityHashCode(end));
        endElements.putIfAbsent(key, end);
    }

    private String multiplicityFor(List<EndInfo> ends, String classId) {
        return ends.stream()
            .filter(end -> end.classId.equals(classId))
            .map(end -> end.multiplicity)
            .filter(value -> !value.isBlank())
            .findFirst()
            .orElse("");
    }

    private String readMultiplicity(Element element) {
        String lower = plainAttribute(element, "lower");
        String upper = plainAttribute(element, "upper");
        for (Element child : childElements(element)) {
            if ("lowerValue".equalsIgnoreCase(localName(child))) {
                lower = firstNonBlank(plainAttribute(child, "value"), lower);
            } else if ("upperValue".equalsIgnoreCase(localName(child))) {
                upper = firstNonBlank(plainAttribute(child, "value"), upper);
            }
        }

        if ("-1".equals(upper)) upper = "*";
        if (lower.isBlank() && upper.isBlank()) return "";
        if (lower.isBlank()) return upper;
        if (upper.isBlank() || lower.equals(upper)) return lower;
        return lower + ".." + upper;
    }

    private String resolvePropertyType(Element ownedAttribute, Map<String, String> typeNames) {
        String directType = resolveTypeReference(plainAttribute(ownedAttribute, "type"), typeNames);
        if (!directType.isBlank()) return directType;

        for (Element child : childElements(ownedAttribute)) {
            if (!"type".equalsIgnoreCase(localName(child))) continue;
            String childType = resolveTypeReference(firstNonBlank(
                plainAttribute(child, "href"),
                xmiIdRef(child),
                plainAttribute(child, "type")
            ), typeNames);
            if (!childType.isBlank()) return childType;
        }
        return "String";
    }

    private String resolveType(Element element, Map<String, String> typeNames, String fallback) {
        String reference = firstNonBlank(
            plainAttribute(element, "type"),
            plainAttribute(element, "classifier"),
            childReference(element, "type")
        );
        String resolved = resolveTypeReference(reference, typeNames);
        return resolved.isBlank() ? fallback : resolved;
    }

    private String resolveTypeReference(String reference, Map<String, String> typeNames) {
        if (reference == null || reference.isBlank()) return "";

        String normalized = normalizeReference(reference);
        String resolved = typeNames.get(normalized);
        if (resolved != null && !resolved.isBlank()) return resolved;

        String readable = reference;
        int fragmentIndex = readable.lastIndexOf('#');
        if (fragmentIndex >= 0 && fragmentIndex + 1 < readable.length()) {
            readable = readable.substring(fragmentIndex + 1);
        }
        int pathIndex = Math.max(readable.lastIndexOf('/'), readable.lastIndexOf(':'));
        if (pathIndex >= 0 && pathIndex + 1 < readable.length()) {
            readable = readable.substring(pathIndex + 1);
        }
        readable = readable.trim();
        if (readable.equalsIgnoreCase("LiteralUnlimitedNatural")
                || readable.equalsIgnoreCase("LiteralInteger")) {
            return "";
        }

        for (String commonType : List.of(
                "String", "Integer", "int", "Long", "Boolean", "Double", "Float", "Date", "LocalDate", "void")) {
            if (readable.equalsIgnoreCase(commonType)
                    || readable.toLowerCase(Locale.ROOT).endsWith("_" + commonType.toLowerCase(Locale.ROOT))) {
                return commonType;
            }
        }
        return readable;
    }

    private String childReference(Element element, String childName) {
        for (Element child : childElements(element)) {
            if (!childName.equalsIgnoreCase(localName(child))) continue;
            return firstNonBlank(
                plainAttribute(child, "href"),
                xmiIdRef(child),
                plainAttribute(child, "type")
            );
        }
        return "";
    }

    private String firstReference(Element element, String name) {
        List<String> direct = splitReferences(plainAttribute(element, name));
        if (!direct.isEmpty()) return direct.get(0);
        return normalizeReference(childReference(element, name));
    }

    private List<String> splitReferences(String references) {
        if (references == null || references.isBlank()) return Collections.emptyList();
        List<String> result = new ArrayList<>();
        for (String reference : references.trim().split("\\s+")) {
            String normalized = normalizeReference(reference);
            if (!normalized.isBlank()) result.add(normalized);
        }
        return result;
    }

    private String normalizeReference(String reference) {
        if (reference == null) return "";
        String normalized = reference.trim();
        int fragmentIndex = normalized.lastIndexOf('#');
        if (fragmentIndex >= 0 && fragmentIndex + 1 < normalized.length()) {
            normalized = normalized.substring(fragmentIndex + 1);
        }
        return normalized;
    }

    private Map<String, String> collectStereotypes(List<Element> elements, Set<String> classIds) {
        Map<String, String> result = new HashMap<>();
        for (Element element : elements) {
            String baseClass = normalizeReference(firstNonBlank(
                plainAttribute(element, "base_Class"),
                plainAttribute(element, "base_Element")
            ));
            if (classIds.contains(baseClass)) {
                result.putIfAbsent(baseClass, localName(element));
            }

            String stereotype = plainAttribute(element, "stereotype");
            if (stereotype.isBlank()) continue;
            String referencedClass = findReferencedClass(element, classIds);
            if (!referencedClass.isBlank()) result.put(referencedClass, stereotype);
        }
        return result;
    }

    private String findReferencedClass(Element element, Set<String> classIds) {
        Node current = element;
        while (current instanceof Element currentElement) {
            for (String candidate : List.of(
                    xmiIdRef(currentElement),
                    plainAttribute(currentElement, "subject"),
                    plainAttribute(currentElement, "element"))) {
                String normalized = normalizeReference(candidate);
                if (classIds.contains(normalized)) return normalized;
            }
            current = current.getParentNode();
        }
        return "";
    }

    private Map<String, Point> extractEaPositions(List<Element> elements, Set<String> classIds) {
        Map<String, Point> result = new HashMap<>();
        for (Element element : elements) {
            if (!isInsideXmiExtension(element)) continue;
            String classId = findReferencedClass(element, classIds);
            if (classId.isBlank()) continue;
            Point point = readPoint(element);
            if (point != null) result.putIfAbsent(classId, point);
        }
        return result;
    }

    private Point readPoint(Element element) {
        Map<String, Double> values = new HashMap<>();
        NamedNodeMap attributes = element.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            Node attribute = attributes.item(index);
            String name = attribute.getNodeName().toLowerCase(Locale.ROOT);
            String value = attribute.getNodeValue();
            if (Set.of("left", "right", "top", "bottom", "cx", "cy").contains(name)) {
                parseDouble(value).ifPresent(number -> values.put(name, number));
            }
            if ("geometry".equals(name)) {
                Matcher matcher = GEOMETRY_VALUE.matcher(value);
                while (matcher.find()) {
                    parseDouble(matcher.group(2)).ifPresent(number -> values.put(
                        matcher.group(1).toLowerCase(Locale.ROOT),
                        number
                    ));
                }
            }
        }

        Double x = rectangleCoordinate(values.get("left"), values.get("right"), values.get("cx"));
        Double y = rectangleCoordinate(values.get("top"), values.get("bottom"), values.get("cy"));
        return x != null && y != null ? new Point(x, y) : null;
    }

    private Double rectangleCoordinate(Double start, Double end, Double center) {
        if (start != null && end != null) return (start + end) / 2.0;
        return firstNonNull(start, center, end);
    }

    private java.util.Optional<Double> parseDouble(String value) {
        try {
            return java.util.Optional.of(Double.parseDouble(value.trim()));
        } catch (NumberFormatException exception) {
            return java.util.Optional.empty();
        }
    }

    private Map<String, Point> normalizePositions(Map<String, Point> positions) {
        if (positions.isEmpty()) return positions;
        double minimumX = positions.values().stream().map(point -> point.x).min(Comparator.naturalOrder()).orElse(0.0);
        double minimumY = positions.values().stream().map(point -> point.y).min(Comparator.naturalOrder()).orElse(0.0);
        Map<String, Point> normalized = new HashMap<>();
        positions.forEach((id, point) -> normalized.put(
            id,
            new Point(point.x - minimumX + 80, point.y - minimumY + 80)
        ));
        return normalized;
    }

    private Point fallbackPosition(int index) {
        return new Point(80 + (index % 4) * 280, 80 + (index / 4) * 220);
    }

    private String normalizeVisibility(String visibility, String fallback) {
        String normalized = visibility == null ? "" : visibility.toLowerCase(Locale.ROOT).trim();
        return SUPPORTED_VISIBILITIES.contains(normalized) ? normalized : fallback;
    }

    private boolean isUmlType(Element element, String expectedType) {
        return expectedType.equalsIgnoreCase(umlTypeName(element));
    }

    private boolean isSemanticUmlElement(Element element, String expectedType) {
        return isUmlType(element, expectedType)
            && !isInsideXmiExtension(element)
            && !xmiId(element).isBlank();
    }

    private boolean isInsideXmiExtension(Element element) {
        Node current = element;
        while (current instanceof Element currentElement) {
            if ("Extension".equalsIgnoreCase(localName(currentElement))) return true;
            current = current.getParentNode();
        }
        return false;
    }

    private String umlTypeName(Element element) {
        String local = localName(element);
        String localType = switch (local.toLowerCase(Locale.ROOT)) {
            case "class" -> "Class";
            case "association" -> "Association";
            case "generalization" -> "Generalization";
            case "dependency" -> "Dependency";
            case "primitivetype" -> "PrimitiveType";
            case "datatype" -> "DataType";
            case "enumeration" -> "Enumeration";
            case "interface" -> "Interface";
            default -> "";
        };
        if (!localType.isBlank()) return localType;

        String type = elementType(element);
        if (type.isBlank()) return "";
        int separator = Math.max(type.lastIndexOf(':'), type.lastIndexOf('#'));
        return separator >= 0 ? type.substring(separator + 1) : type;
    }

    private String elementType(Element element) {
        String type = element.getAttributeNS(XMI_NAMESPACE, "type");
        if (type.isBlank()) type = element.getAttribute("xmi:type");
        if (type.isBlank() && "packagedElement".equalsIgnoreCase(localName(element))) {
            type = plainAttribute(element, "type");
        }
        return type;
    }

    private String xmiId(Element element) {
        String id = element.getAttributeNS(XMI_NAMESPACE, "id");
        if (id.isBlank()) id = element.getAttribute("xmi:id");
        if (id.isBlank()) id = plainAttribute(element, "id");
        return id.trim();
    }

    private String xmiIdRef(Element element) {
        String idRef = element.getAttributeNS(XMI_NAMESPACE, "idref");
        if (idRef.isBlank()) idRef = element.getAttribute("xmi:idref");
        if (idRef.isBlank()) idRef = plainAttribute(element, "idref");
        return idRef.trim();
    }

    private String xmiAttribute(Element element, String name) {
        String value = element.getAttributeNS(XMI_NAMESPACE, name);
        if (value.isBlank()) value = element.getAttribute("xmi:" + name);
        return value.trim();
    }

    private String plainAttribute(Element element, String name) {
        if (element == null) return "";
        String value = element.getAttribute(name);
        if (!value.isBlank()) return value.trim();

        NamedNodeMap attributes = element.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            Node attribute = attributes.item(index);
            if (attribute.getPrefix() == null && name.equalsIgnoreCase(attribute.getLocalName())) {
                return attribute.getNodeValue().trim();
            }
        }
        return "";
    }

    private List<Element> allElements(Document document) {
        List<Element> result = new ArrayList<>();
        NodeList nodes = document.getElementsByTagName("*");
        for (int index = 0; index < nodes.getLength(); index++) {
            if (nodes.item(index) instanceof Element element) result.add(element);
        }
        return result;
    }

    private List<Element> childElements(Element parent) {
        List<Element> result = new ArrayList<>();
        NodeList children = parent.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            if (children.item(index) instanceof Element element) result.add(element);
        }
        return result;
    }

    private String localName(Element element) {
        String local = element.getLocalName();
        if (local != null) return local;
        String nodeName = element.getNodeName();
        int separator = nodeName.indexOf(':');
        return separator >= 0 ? nodeName.substring(separator + 1) : nodeName;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "";
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) return value;
        }
        return null;
    }

    private static class Counters {
        private int attribute;
        private int method;
        private int relation;
    }

    private record ClassSource(String xmiId, String name, Element element) {}
    private record EndInfo(String classId, String ownerClassId, String aggregation, String multiplicity) {}
    private record EaConnectorMetadata(String sourceClassId, String targetClassId, String name) {}
    private record Point(double x, double y) {}
}
