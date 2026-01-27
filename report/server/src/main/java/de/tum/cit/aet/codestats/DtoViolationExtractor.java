package de.tum.cit.aet.codestats;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import com.github.javaparser.ast.type.Type;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;

/**
 * Static source code analyzer for DTO violations using JavaParser.
 * No runtime dependencies needed - parses source files directly.
 * FULL COVERAGE - analyzes ALL source files.
 */
public class DtoViolationExtractor {

    // Module mapping based on package paths - ALL 20 Artemis modules
    private static final Map<String, String> PACKAGE_TO_MODULE = new LinkedHashMap<>();
    static {
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.assessment", "assessment");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.athena", "athena");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.atlas", "atlas");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.buildagent", "buildagent");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.communication", "communication");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.config", "config");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.core", "core");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.exam", "exam");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.exercise", "exercise");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.fileupload", "fileupload");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.hyperion", "hyperion");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.iris", "iris");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.lecture", "lecture");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.lti", "lti");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.modeling", "modeling");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.nebula", "nebula");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.plagiarism", "plagiarism");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.programming", "programming");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.quiz", "quiz");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.text", "text");
        PACKAGE_TO_MODULE.put("de.tum.cit.aet.artemis.tutorialgroup", "tutorialgroup");
    }

    // REST mapping annotations
    private static final Set<String> REST_MAPPING_ANNOTATIONS = Set.of(
        "GetMapping", "PostMapping", "PutMapping", "DeleteMapping", "PatchMapping", "RequestMapping"
    );

    // Collected data
    private final Set<String> entityClasses = new HashSet<>();
    private final Map<String, String> entitySimpleToFull = new HashMap<>();
    private final Map<String, List<Map<String, Object>>> moduleReturnViolations = new HashMap<>();
    private final Map<String, List<Map<String, Object>>> moduleInputViolations = new HashMap<>();
    private final Map<String, List<Map<String, Object>>> moduleFieldViolations = new HashMap<>();

    private final JavaParser parser;
    {
        ParserConfiguration config = new ParserConfiguration();
        config.setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21);
        parser = new JavaParser(config);
    }
    private Path sourceRoot;
    private int filesAnalyzed = 0;
    private int controllersFound = 0;
    private int dtosFound = 0;

    public static void main(String[] args) throws Exception {
        String sourcePath = System.getProperty("artemis.source", "../../artemis/src/main/java");
        String outputPath = System.getProperty("output.file", "violations.json");

        System.out.println("=== DTO Violation Extractor (Static Analysis) ===");
        System.out.println("Source: " + sourcePath);
        System.out.println("Output: " + outputPath);

        DtoViolationExtractor extractor = new DtoViolationExtractor();
        extractor.analyze(Path.of(sourcePath), Path.of(outputPath));
    }

    public void analyze(Path sourcePath, Path outputPath) throws Exception {
        this.sourceRoot = sourcePath;

        if (!Files.exists(sourcePath)) {
            System.err.println("ERROR: Source directory not found: " + sourcePath.toAbsolutePath());
            System.exit(1);
        }

        // Phase 1: Find all @Entity classes
        System.out.println("\n--- Phase 1: Finding @Entity classes ---");
        findEntityClasses(sourcePath);
        System.out.println("Found " + entityClasses.size() + " entity classes");

        // Phase 2: Analyze REST controllers for violations
        System.out.println("\n--- Phase 2: Analyzing REST controllers ---");
        analyzeControllers(sourcePath);
        System.out.println("Analyzed " + controllersFound + " REST controllers");

        // Phase 3: Analyze DTOs for entity field references
        System.out.println("\n--- Phase 3: Analyzing DTO classes ---");
        analyzeDtoClasses(sourcePath);
        System.out.println("Analyzed " + dtosFound + " DTO classes");

        // Phase 4: Write output
        System.out.println("\n--- Phase 4: Writing results ---");
        writeOutput(outputPath);
    }

    private void findEntityClasses(Path sourcePath) throws IOException {
        try (Stream<Path> files = Files.walk(sourcePath)) {
            files.filter(p -> p.toString().endsWith(".java"))
                 .forEach(this::checkForEntity);
        }
    }

    private void checkForEntity(Path file) {
        try {
            ParseResult<CompilationUnit> result = parser.parse(file);
            if (!result.isSuccessful() || result.getResult().isEmpty()) return;

            CompilationUnit cu = result.getResult().get();
            String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getNameAsString())
                .orElse("");

            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(cls -> {
                if (hasAnnotation(cls, "Entity") || hasAnnotation(cls, "MappedSuperclass")) {
                    String fullName = packageName + "." + cls.getNameAsString();
                    entityClasses.add(fullName);
                    entitySimpleToFull.put(cls.getNameAsString(), fullName);
                }
            });
        } catch (Exception e) {
            // Skip unparseable files
        }
    }

    private void analyzeControllers(Path sourcePath) throws IOException {
        try (Stream<Path> files = Files.walk(sourcePath)) {
            files.filter(p -> p.toString().endsWith(".java"))
                 .forEach(this::analyzeController);
        }
    }

    private void analyzeController(Path file) {
        try {
            ParseResult<CompilationUnit> result = parser.parse(file);
            if (!result.isSuccessful() || result.getResult().isEmpty()) return;

            CompilationUnit cu = result.getResult().get();
            String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getNameAsString())
                .orElse("");

            // Collect imports for type resolution
            Map<String, String> imports = new HashMap<>();
            cu.getImports().forEach(imp -> {
                String importStr = imp.getNameAsString();
                String simpleName = importStr.substring(importStr.lastIndexOf('.') + 1);
                imports.put(simpleName, importStr);
            });

            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(cls -> {
                if (!hasAnnotation(cls, "RestController") && !hasAnnotation(cls, "Controller")) {
                    return;
                }

                controllersFound++;
                String controllerName = cls.getNameAsString();
                String module = getModuleFromPackage(packageName);
                String relativePath = getRelativePath(file);

                // Get base path from @RequestMapping on class
                String basePath = getRequestMappingPath(cls);

                cls.getMethods().forEach(method -> {
                    // Check if it's a REST endpoint
                    String foundHttpMethod = null;
                    String methodPath = "";

                    for (String annotation : REST_MAPPING_ANNOTATIONS) {
                        if (hasAnnotation(method, annotation)) {
                            foundHttpMethod = annotation.replace("Mapping", "").toUpperCase();
                            if (foundHttpMethod.equals("REQUEST")) foundHttpMethod = "REQUEST";
                            methodPath = getMappingPath(method, annotation);
                            break;
                        }
                    }

                    if (foundHttpMethod == null) return;

                    final String httpMethod = foundHttpMethod;
                    String fullPath = combinePaths(basePath, methodPath);
                    int lineNumber = method.getBegin().map(p -> p.line).orElse(0);

                    // Check return type for entity violations
                    Type returnType = method.getType();
                    Set<String> returnEntityViolations = findEntityTypesInType(returnType, imports, packageName);
                    for (String entityClass : returnEntityViolations) {
                        Map<String, Object> violation = new LinkedHashMap<>();
                        violation.put("controller", controllerName);
                        violation.put("method", method.getNameAsString());
                        violation.put("endpoint", httpMethod + " " + fullPath);
                        violation.put("returnType", returnType.asString());
                        violation.put("entityClass", getSimpleName(entityClass));
                        violation.put("file", relativePath);
                        violation.put("line", lineNumber);

                        moduleReturnViolations.computeIfAbsent(module, k -> new ArrayList<>()).add(violation);
                    }

                    // Check parameters for entity input violations
                    method.getParameters().forEach(param -> {
                        boolean hasRequestBody = hasAnnotation(param, "RequestBody");
                        boolean hasRequestPart = hasAnnotation(param, "RequestPart");

                        if (hasRequestBody || hasRequestPart) {
                            Set<String> paramEntityViolations = findEntityTypesInType(param.getType(), imports, packageName);
                            for (String entityClass : paramEntityViolations) {
                                Map<String, Object> violation = new LinkedHashMap<>();
                                violation.put("controller", controllerName);
                                violation.put("method", method.getNameAsString());
                                violation.put("endpoint", httpMethod + " " + fullPath);
                                violation.put("parameterName", param.getNameAsString());
                                violation.put("parameterType", param.getType().asString());
                                violation.put("annotationType", hasRequestBody ? "@RequestBody" : "@RequestPart");
                                violation.put("entityClass", getSimpleName(entityClass));
                                violation.put("file", relativePath);
                                violation.put("line", lineNumber);

                                moduleInputViolations.computeIfAbsent(module, k -> new ArrayList<>()).add(violation);
                            }
                        }
                    });
                });
            });
        } catch (Exception e) {
            // Skip unparseable files silently
        }
    }

    private void analyzeDtoClasses(Path sourcePath) throws IOException {
        try (Stream<Path> files = Files.walk(sourcePath)) {
            files.filter(p -> p.toString().endsWith(".java"))
                 .forEach(this::analyzeDtoClass);
        }
    }

    private void analyzeDtoClass(Path file) {
        try {
            ParseResult<CompilationUnit> result = parser.parse(file);
            if (!result.isSuccessful() || result.getResult().isEmpty()) return;

            CompilationUnit cu = result.getResult().get();
            String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getNameAsString())
                .orElse("");

            // Collect imports
            Map<String, String> imports = new HashMap<>();
            cu.getImports().forEach(imp -> {
                String importStr = imp.getNameAsString();
                String simpleName = importStr.substring(importStr.lastIndexOf('.') + 1);
                imports.put(simpleName, importStr);
            });

            String module = getModuleFromPackage(packageName);
            String relativePath = getRelativePath(file);

            // Check classes
            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(cls -> {
                String className = cls.getNameAsString();
                if (!className.contains("DTO") && !className.endsWith("Dto")) return;

                dtosFound++;
                cls.getFields().forEach(field -> {
                    field.getVariables().forEach(var -> {
                        Set<String> entityViolations = findEntityTypesInType(var.getType(), imports, packageName);
                        for (String entityClass : entityViolations) {
                            int lineNumber = field.getBegin().map(p -> p.line).orElse(0);

                            Map<String, Object> violation = new LinkedHashMap<>();
                            violation.put("dtoClass", className);
                            violation.put("fieldName", var.getNameAsString());
                            violation.put("fieldType", var.getType().asString());
                            violation.put("entityClass", getSimpleName(entityClass));
                            violation.put("file", relativePath);
                            violation.put("line", lineNumber);

                            moduleFieldViolations.computeIfAbsent(module, k -> new ArrayList<>()).add(violation);
                        }
                    });
                });
            });

            // Also check record components
            cu.findAll(RecordDeclaration.class).forEach(rec -> {
                String recName = rec.getNameAsString();
                if (!recName.contains("DTO") && !recName.endsWith("Dto")) return;

                dtosFound++;
                rec.getParameters().forEach(param -> {
                    Set<String> entityViolations = findEntityTypesInType(param.getType(), imports, packageName);
                    for (String entityClass : entityViolations) {
                        int lineNumber = param.getBegin().map(p -> p.line).orElse(0);

                        Map<String, Object> violation = new LinkedHashMap<>();
                        violation.put("dtoClass", recName);
                        violation.put("fieldName", param.getNameAsString());
                        violation.put("fieldType", param.getType().asString());
                        violation.put("entityClass", getSimpleName(entityClass));
                        violation.put("file", relativePath);
                        violation.put("line", lineNumber);

                        moduleFieldViolations.computeIfAbsent(module, k -> new ArrayList<>()).add(violation);
                    }
                });
            });
        } catch (Exception e) {
            // Skip unparseable files
        }
    }

    private Set<String> findEntityTypesInType(Type type, Map<String, String> imports, String currentPackage) {
        Set<String> violations = new HashSet<>();
        findEntityTypesRecursive(type, imports, currentPackage, violations);
        return violations;
    }

    private void findEntityTypesRecursive(Type type, Map<String, String> imports, String currentPackage, Set<String> violations) {
        if (type.isClassOrInterfaceType()) {
            ClassOrInterfaceType cit = type.asClassOrInterfaceType();
            String typeName = cit.getNameAsString();

            // Resolve full type name
            String fullTypeName = resolveTypeName(typeName, imports, currentPackage);

            if (entityClasses.contains(fullTypeName)) {
                violations.add(fullTypeName);
            }

            // Check generic type arguments (e.g., List<Entity>, ResponseEntity<Entity>)
            cit.getTypeArguments().ifPresent(args -> {
                args.forEach(arg -> findEntityTypesRecursive(arg, imports, currentPackage, violations));
            });
        } else if (type.isArrayType()) {
            findEntityTypesRecursive(type.asArrayType().getComponentType(), imports, currentPackage, violations);
        } else if (type.isWildcardType()) {
            // Handle wildcards like ? extends Entity or ? super Entity
            var wildcard = type.asWildcardType();
            wildcard.getExtendedType().ifPresent(ext -> findEntityTypesRecursive(ext, imports, currentPackage, violations));
            wildcard.getSuperType().ifPresent(sup -> findEntityTypesRecursive(sup, imports, currentPackage, violations));
        }
    }

    private String resolveTypeName(String simpleName, Map<String, String> imports, String currentPackage) {
        // Check if it's in imports
        if (imports.containsKey(simpleName)) {
            return imports.get(simpleName);
        }
        // Check if it matches a known entity by simple name
        if (entitySimpleToFull.containsKey(simpleName)) {
            return entitySimpleToFull.get(simpleName);
        }
        // Assume it's in current package
        return currentPackage + "." + simpleName;
    }

    private boolean hasAnnotation(BodyDeclaration<?> decl, String annotationName) {
        return decl.getAnnotations().stream()
            .anyMatch(a -> a.getNameAsString().equals(annotationName));
    }

    private boolean hasAnnotation(Parameter param, String annotationName) {
        return param.getAnnotations().stream()
            .anyMatch(a -> a.getNameAsString().equals(annotationName));
    }

    private String getRequestMappingPath(ClassOrInterfaceDeclaration cls) {
        return cls.getAnnotations().stream()
            .filter(a -> a.getNameAsString().equals("RequestMapping"))
            .findFirst()
            .map(this::extractPathFromAnnotation)
            .orElse("");
    }

    private String getMappingPath(MethodDeclaration method, String annotationName) {
        return method.getAnnotations().stream()
            .filter(a -> a.getNameAsString().equals(annotationName))
            .findFirst()
            .map(this::extractPathFromAnnotation)
            .orElse("");
    }

    private String extractPathFromAnnotation(AnnotationExpr annotation) {
        if (annotation.isSingleMemberAnnotationExpr()) {
            return extractStringValue(annotation.asSingleMemberAnnotationExpr().getMemberValue());
        } else if (annotation.isNormalAnnotationExpr()) {
            for (MemberValuePair pair : annotation.asNormalAnnotationExpr().getPairs()) {
                if (pair.getNameAsString().equals("value") || pair.getNameAsString().equals("path")) {
                    return extractStringValue(pair.getValue());
                }
            }
        }
        return "";
    }

    private String extractStringValue(Expression expr) {
        if (expr.isStringLiteralExpr()) {
            return expr.asStringLiteralExpr().getValue();
        } else if (expr.isArrayInitializerExpr()) {
            // Take first element if it's an array
            return expr.asArrayInitializerExpr().getValues().stream()
                .findFirst()
                .map(this::extractStringValue)
                .orElse("");
        }
        return "";
    }

    private String combinePaths(String base, String path) {
        if (base.isEmpty()) return path.isEmpty() ? "/" : path;
        if (path.isEmpty()) return base;
        if (base.endsWith("/") && path.startsWith("/")) {
            return base + path.substring(1);
        }
        if (!base.endsWith("/") && !path.startsWith("/")) {
            return base + "/" + path;
        }
        return base + path;
    }

    private String getModuleFromPackage(String packageName) {
        for (Map.Entry<String, String> entry : PACKAGE_TO_MODULE.entrySet()) {
            if (packageName.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "other";
    }

    private String getRelativePath(Path file) {
        try {
            return sourceRoot.relativize(file).toString().replace('\\', '/');
        } catch (Exception e) {
            return file.getFileName().toString();
        }
    }

    private String getSimpleName(String fullName) {
        int lastDot = fullName.lastIndexOf('.');
        return lastDot >= 0 ? fullName.substring(lastDot + 1) : fullName;
    }

    private void writeOutput(Path outputPath) throws IOException {
        Map<String, Object> output = new LinkedHashMap<>();

        // Build modules structure
        Map<String, Object> modules = new LinkedHashMap<>();

        Set<String> allModules = new HashSet<>();
        allModules.addAll(PACKAGE_TO_MODULE.values());
        allModules.addAll(moduleReturnViolations.keySet());
        allModules.addAll(moduleInputViolations.keySet());
        allModules.addAll(moduleFieldViolations.keySet());

        int totalReturn = 0, totalInput = 0, totalField = 0;

        for (String module : allModules.stream().sorted().toList()) {
            List<Map<String, Object>> returns = moduleReturnViolations.getOrDefault(module, List.of());
            List<Map<String, Object>> inputs = moduleInputViolations.getOrDefault(module, List.of());
            List<Map<String, Object>> fields = moduleFieldViolations.getOrDefault(module, List.of());

            Map<String, Object> moduleData = new LinkedHashMap<>();
            moduleData.put("entityReturnViolations", returns.size());
            moduleData.put("entityInputViolations", inputs.size());
            moduleData.put("dtoEntityFieldViolations", fields.size());
            moduleData.put("entityReturnDetails", returns);
            moduleData.put("entityInputDetails", inputs);
            moduleData.put("dtoEntityFieldDetails", fields);

            modules.put(module, moduleData);

            totalReturn += returns.size();
            totalInput += inputs.size();
            totalField += fields.size();
        }

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("entityReturnViolations", totalReturn);
        totals.put("entityInputViolations", totalInput);
        totals.put("dtoEntityFieldViolations", totalField);

        output.put("modules", modules);
        output.put("totals", totals);

        Gson gson = new GsonBuilder().setPrettyPrinting().create();
        Files.writeString(outputPath, gson.toJson(output));

        System.out.println("\n=== RESULTS (FULL COVERAGE) ===");
        System.out.println("Files analyzed: " + filesAnalyzed);
        System.out.println("Entity classes found: " + entityClasses.size());
        System.out.println("REST controllers found: " + controllersFound);
        System.out.println("DTO classes found: " + dtosFound);
        System.out.println("");
        System.out.println("TOTAL VIOLATIONS: " + (totalReturn + totalInput + totalField));
        System.out.println("  - Entity return violations: " + totalReturn);
        System.out.println("  - Entity input violations: " + totalInput);
        System.out.println("  - DTO entity field violations: " + totalField);
        System.out.println("\nOutput written to: " + outputPath);
    }
}
