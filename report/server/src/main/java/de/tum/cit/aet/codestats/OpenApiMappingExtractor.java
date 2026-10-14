package de.tum.cit.aet.codestats;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.google.gson.GsonBuilder;

import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;

/** Independent potential Spring mapping inventory. Does not compile or execute Artemis. */
public final class OpenApiMappingExtractor {
    private record FileEvidence(String path, int line, String symbol, boolean parsed) {}
    private record Issue(String path, int line, String symbol, String reason, String nextStep) {}
    private record Mapping(String path, int line, String symbol, List<String> paths,
                           List<String> methods, List<String> declaredPaths, List<String> conditions,
                           Map<String, List<String>> attributes) {}
    private record Source(String path, CompilationUnit unit) {}
    private record TypeSource(Source source, TypeDeclaration<?> type) {}
    private record Result(List<FileEvidence> files, List<Mapping> mappings, List<Issue> issues) {}
    private static final Set<String> HTTP = Set.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE");
    private static final Set<String> MAPPINGS = Set.of("RequestMapping", "GetMapping", "PostMapping", "PutMapping", "PatchMapping", "DeleteMapping");
    private static final Set<String> EXCHANGES = Set.of("HttpExchange", "GetExchange", "PostExchange", "PutExchange", "PatchExchange", "DeleteExchange");
    private final Map<String, TypeSource> types = new TreeMap<>();
    private final List<FileEvidence> files = new ArrayList<>();
    private final List<Mapping> mappings = new ArrayList<>();
    private final List<Issue> issues = new ArrayList<>();

    public static void main(String[] args) throws Exception {
        if (args.length != 3) throw new IllegalArgumentException("Expected archive root, server source root, output file");
        var extractor = new OpenApiMappingExtractor();
        extractor.read(Path.of(args[0]), Path.of(args[0]).resolve(args[1]));
        extractor.extract();
        Files.writeString(Path.of(args[2]), new GsonBuilder().disableHtmlEscaping().create()
                .toJson(new Result(extractor.files, extractor.mappings, extractor.issues)));
    }

    private void read(Path root, Path server) throws Exception {
        var parser = new JavaParser(new ParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.BLEEDING_EDGE));
        try (var paths = Files.walk(server)) {
            for (var file : paths.filter(path -> path.toString().endsWith(".java")).sorted().toList()) {
                String path = root.relativize(file).toString().replace('\\', '/');
                var result = parser.parse(file);
                var unit = result.getResult();
                boolean parsed = result.isSuccessful() && unit.isPresent();
                String symbol = unit.flatMap(CompilationUnit::getPackageDeclaration).map(p -> p.getNameAsString()).orElse("source");
                files.add(new FileEvidence(path, 1, symbol, parsed));
                if (!parsed) {
                    issues.add(new Issue(path, 1, symbol, "JavaParser could not completely parse this file: " + result.getProblems(),
                            "Inspect the syntax and extend/update the existing JavaParser extraction support; re-run this module."));
                    continue;
                }
                Source source = new Source(path, unit.orElseThrow());
                for (TypeDeclaration<?> type : source.unit.findAll(TypeDeclaration.class)) {
                    String name = type.getFullyQualifiedName().orElse(symbol + "." + type.getNameAsString());
                    types.put(name, new TypeSource(source, type));
                }
            }
        }
    }

    private void extract() {
        for (var entry : types.values()) {
            var type = entry.type;
            var source = entry.source;
            var classMappings = type.getAnnotations().stream().filter(this::isMapping).toList();
            if (type instanceof AnnotationDeclaration) continue;
            boolean controller = type.getAnnotations().stream().anyMatch(a -> Set.of("RestController", "Controller").contains(shortName(a)));
            boolean mapped = type.getAnnotations().stream().anyMatch(a -> potentialMapping(source, type, a, new HashSet<>()))
                    || type.getMethods().stream().anyMatch(m -> m.getAnnotations().stream().anyMatch(a -> potentialMapping(source, type, a, new HashSet<>())));
            for (var annotation : type.getAnnotations()) customMapping(source, type, annotation);
            if ((controller || mapped) && type instanceof ClassOrInterfaceDeclaration declaration) {
                var parents = new ArrayList<>(declaration.getExtendedTypes());
                parents.addAll(declaration.getImplementedTypes());
                for (var parent : parents) {
                    var target = resolveType(source, parent.getNameWithScope(), type);
                    if (target == null || hasInheritedMappings(target, new HashSet<>())) {
                        issue(source, declaration, "Inherited/interface routes require reconciliation: " + parent,
                                "Inspect the parent mapping hierarchy and add evidenced inherited mapping support or a scoped runtime export.");
                    }
                }
                if (declaration.isInterface()) issue(source, declaration, "Mapping declared on an interface; concrete controller ownership is unresolved.",
                        "Reconcile concrete implementations before claiming a complete denominator.");
            }
            if (classMappings.size() > 1) issue(source, type, "Multiple mapping annotations on one type are ambiguous.", "Resolve Spring's selected mapping before counting exclusive identities.");
            for (var method : type.getMethods()) {
                for (var annotation : method.getAnnotations()) customMapping(source, method, annotation);
                var methodMappings = method.getAnnotations().stream().filter(this::isMapping).toList();
                if (methodMappings.size() > 1) issue(source, method, "Multiple mapping annotations on one handler are ambiguous.", "Resolve Spring's selected mapping before counting exclusive identities.");
                if (!methodMappings.isEmpty() && !controller) issue(source, method,
                        "Mapping is not on a directly annotated Controller/RestController; activation is unresolved.",
                        "Reconcile composed controller stereotypes or concrete implementations.");
                for (var methodMapping : methodMappings) {
                    if (classMappings.isEmpty()) extractMapping(source, type, method, null, methodMapping);
                    else for (var classMapping : classMappings) extractMapping(source, type, method, classMapping, methodMapping);
                }
                if (method.getType().asString().contains("RouterFunction") || method.findAll(MethodCallExpr.class).stream()
                        .anyMatch(call -> call.getNameAsString().equals("registerMapping"))) {
                    issue(source, method, "Programmatic route registration is outside annotation extraction.",
                            "Inventory this registration independently or supply a revision/profile-bound runtime mapping export.");
                }
            }
        }
    }

    private boolean hasInheritedMappings(TypeSource target, Set<String> seen) {
        if (!seen.add(target.type.getFullyQualifiedName().orElse(target.type.getNameAsString()))) return true;
        if (target.type.getAnnotations().stream().anyMatch(a -> potentialMapping(target.source, target.type, a, new HashSet<>()))
                || target.type.getMethods().stream().anyMatch(m -> m.getAnnotations().stream()
                .anyMatch(a -> potentialMapping(target.source, target.type, a, new HashSet<>())))) return true;
        if (target.type instanceof ClassOrInterfaceDeclaration declaration) {
            var parents = new ArrayList<>(declaration.getExtendedTypes());
            parents.addAll(declaration.getImplementedTypes());
            for (var parent : parents) {
                var next = resolveType(target.source, parent.getNameWithScope(), target.type);
                if (next == null || hasInheritedMappings(next, seen)) return true;
            }
        }
        return false;
    }

    private void customMapping(Source source, Node node, AnnotationExpr annotation) {
        if (isMapping(annotation)) return;
        if (potentialMapping(source, enclosingType(node), annotation, new HashSet<>())) {
            issue(source, node, (EXCHANGES.contains(shortName(annotation)) ? "HTTP exchange mapping is unsupported: " : "Custom composed mapping is unsupported: ") + annotation,
                    "Reconcile this mapping's annotation hierarchy/aliases or supply a scoped runtime export before claiming a complete inventory.");
        }
    }

    // Recognize route evidence at any meta-annotation depth without inventing alias semantics.
    private boolean potentialMapping(Source source, TypeDeclaration<?> type, AnnotationExpr annotation, Set<String> seen) {
        if (isMapping(annotation) || EXCHANGES.contains(shortName(annotation))) return true;
        var target = resolveType(source, annotation.getNameAsString(), type);
        if (target == null) return false;
        String name = target.type.getFullyQualifiedName().orElse(target.type.getNameAsString());
        if (!seen.add(name)) return false;
        return target.type.getAnnotations().stream().anyMatch(a -> potentialMapping(target.source, target.type, a, seen));
    }

    private void extractMapping(Source source, TypeDeclaration<?> type, MethodDeclaration method,
                                AnnotationExpr classMapping, AnnotationExpr methodMapping) {
        try {
            var classPaths = paths(classMapping, source, type);
            var methodPaths = paths(methodMapping, source, type);
            var paths = new TreeSet<String>();
            for (var prefix : classPaths) for (var suffix : methodPaths) {
                // Only the composition boundary is normalized. Trailing slash/case/placeholder names survive.
                if (prefix.contains("//") || suffix.contains("//")) throw new IllegalArgumentException("Unsupported repeated slash mapping");
                String path = suffix.isEmpty() ? (prefix.isEmpty() ? "/" : prefix)
                        : prefix.replaceAll("/+$", "") + "/" + suffix.replaceAll("^/+", "");
                if (!path.startsWith("/")) path = "/" + path;
                if (path.contains("${") || path.contains("#{") || path.contains("//") || path.contains("*") || path.contains("\\") || Pattern.compile("[?#\\s]").matcher(path).find()
                        || path.matches(".*\\{[^}]*:[^}]*}.*")) {
                    throw new IllegalArgumentException("Unsupported constrained/dynamic path: " + path);
                }
                paths.add(path);
            }
            var methods = new TreeSet<>(httpMethods(classMapping));
            methods.addAll(httpMethods(methodMapping));
            if (methods.isEmpty()) throw new IllegalArgumentException("Unconstrained RequestMapping HTTP methods");
            var conditions = new ArrayList<String>();
            for (var a : type.getAnnotations()) condition(a, source, type, conditions);
            for (var a : method.getAnnotations()) condition(a, source, type, conditions);
            var attributes = new TreeMap<String, List<String>>();
            attributes(classMapping, "class.", attributes);
            attributes(methodMapping, "method.", attributes);
            mappings.add(new Mapping(source.path, line(method.getName()), type.getFullyQualifiedName().orElse(type.getNameAsString()) + "." + method.getNameAsString(),
                    new ArrayList<>(paths), new ArrayList<>(methods), List.of(classMapping == null ? "<no class mapping>" : classMapping.toString(), methodMapping.toString()),
                    conditions, attributes));
        } catch (IllegalArgumentException exception) {
            issue(source, method, exception.getMessage() + "; declared " + classMapping + " / " + methodMapping,
                    "Resolve the mapping expression/method set and add focused support; this handler is excluded from known-operation counts.");
        }
    }

    private List<String> paths(AnnotationExpr annotation, Source source, TypeDeclaration<?> type) {
        if (annotation == null) return List.of("");
        Expression expression = attribute(annotation, "value");
        Expression path = attribute(annotation, "path");
        if (expression != null && path != null) throw new IllegalArgumentException("Both value and path aliases supplied");
        if (expression == null) expression = path;
        return expression == null ? List.of("") : strings(expression, source, type, new HashSet<>());
    }

    private List<String> strings(Expression expression, Source source, TypeDeclaration<?> type, Set<String> seen) {
        if (expression instanceof StringLiteralExpr literal) return List.of(literal.asString());
        if (expression instanceof EnclosedExpr enclosed) return strings(enclosed.getInner(), source, type, seen);
        if (expression instanceof ArrayInitializerExpr array) {
            var result = new ArrayList<String>();
            for (var value : array.getValues()) result.addAll(strings(value, source, type, new HashSet<>(seen)));
            if (result.isEmpty()) throw new IllegalArgumentException("Empty mapping array");
            return result;
        }
        if (expression instanceof BinaryExpr binary && binary.getOperator() == BinaryExpr.Operator.PLUS) {
            var left = strings(binary.getLeft(), source, type, new HashSet<>(seen));
            var right = strings(binary.getRight(), source, type, new HashSet<>(seen));
            if (left.size() != 1 || right.size() != 1) throw new IllegalArgumentException("Non-scalar concatenation");
            return List.of(left.get(0) + right.get(0));
        }
        String name;
        TypeSource owner = new TypeSource(source, type);
        if (expression instanceof FieldAccessExpr field) {
            name = field.getNameAsString();
            owner = resolveType(source, field.getScope().toString(), type);
        } else if (expression instanceof NameExpr identifier) {
            name = identifier.getNameAsString();
            if (!hasConstant(type, name)) {
                var candidates = new ArrayList<TypeSource>();
                for (var imported : source.unit.getImports()) if (imported.isStatic()) {
                    String qualified = imported.getNameAsString();
                    if (imported.isAsterisk()) {
                        var candidate = types.get(qualified);
                        if (candidate != null && hasConstant(candidate.type, name)) candidates.add(candidate);
                    } else if (qualified.endsWith("." + name)) {
                        var candidate = types.get(qualified.substring(0, qualified.length() - name.length() - 1));
                        if (candidate != null) candidates.add(candidate);
                    }
                }
                owner = candidates.size() == 1 ? candidates.get(0) : null;
            }
        } else throw new IllegalArgumentException("Unsupported string expression: " + expression);
        if (owner == null) throw new IllegalArgumentException("Unresolved constant: " + expression);
        String key = owner.type.getFullyQualifiedName().orElse(owner.type.getNameAsString()) + "." + name;
        if (!seen.add(key)) throw new IllegalArgumentException("Cyclic constant: " + key);
        for (var field : owner.type.getFields()) if (constantField(owner.type, field)) {
            for (var variable : field.getVariables()) if (variable.getNameAsString().equals(name) && variable.getInitializer().isPresent()) {
                return strings(variable.getInitializer().orElseThrow(), owner.source, owner.type, seen);
            }
        }
        throw new IllegalArgumentException("Not a resolvable static final string: " + expression);
    }

    private boolean hasConstant(TypeDeclaration<?> type, String name) {
        return type.getFields().stream().filter(f -> constantField(type, f))
                .flatMap(f -> f.getVariables().stream()).anyMatch(v -> v.getNameAsString().equals(name));
    }

    private boolean constantField(TypeDeclaration<?> type, FieldDeclaration field) {
        return (field.isStatic() && field.isFinal()) || (type instanceof ClassOrInterfaceDeclaration declaration && declaration.isInterface());
    }

    private TypeSource resolveType(Source source, String name, TypeDeclaration<?> enclosing) {
        if (types.containsKey(name)) return types.get(name);
        var candidates = new LinkedHashSet<String>();
        if (enclosing != null) enclosing.getFullyQualifiedName().ifPresent(qualified -> candidates.add(qualified + "." + name));
        source.unit.getPackageDeclaration().ifPresent(p -> candidates.add(p.getNameAsString() + "." + name));
        for (var imported : source.unit.getImports()) if (!imported.isStatic()) {
            String qualified = imported.getNameAsString();
            if (imported.isAsterisk()) candidates.add(qualified + "." + name);
            else if (qualified.endsWith("." + name)) candidates.add(qualified);
        }
        var matches = candidates.stream().filter(types::containsKey).toList();
        return matches.size() == 1 ? types.get(matches.get(0)) : null;
    }

    private List<String> httpMethods(AnnotationExpr annotation) {
        if (annotation == null) return List.of();
        String name = shortName(annotation);
        if (!name.equals("RequestMapping")) return List.of(name.replace("Mapping", "").toUpperCase(Locale.ROOT));
        Expression expression = attribute(annotation, "method");
        if (expression == null) return List.of();
        var values = expression instanceof ArrayInitializerExpr array ? array.getValues() : List.of(expression);
        var methods = new ArrayList<String>();
        for (var value : values) {
            String method = value instanceof FieldAccessExpr field ? field.getNameAsString() : value.toString();
            if (!HTTP.contains(method)) throw new IllegalArgumentException("Unsupported HTTP method expression: " + value);
            methods.add(method);
        }
        return methods;
    }

    private void condition(AnnotationExpr annotation, Source source, TypeDeclaration<?> type, List<String> result) {
        String name = shortName(annotation);
        var target = resolveType(source, annotation.getNameAsString(), type);
        boolean conditional = name.equals("Profile") || name.startsWith("Conditional") || name.endsWith("Enabled")
                || (target != null && target.type.getAnnotations().stream().anyMatch(a -> shortName(a).startsWith("Conditional")));
        if (!conditional) return;
        String value = annotation.toString();
        if (name.equals("Profile") && attribute(annotation, "value") != null) {
            try { value += " => " + strings(attribute(annotation, "value"), source, type, new HashSet<>()); }
            catch (IllegalArgumentException ignored) { value += " (activation expression unresolved)"; }
        }
        result.add(value);
        if (target != null) result.addAll(target.type.getAnnotations().stream().filter(a -> shortName(a).startsWith("Conditional"))
                .map(a -> target.type.getFullyQualifiedName().orElse(name) + ": " + a).toList());
    }

    private static Expression attribute(AnnotationExpr annotation, String name) {
        if (annotation instanceof SingleMemberAnnotationExpr single && name.equals("value")) return single.getMemberValue();
        if (annotation instanceof NormalAnnotationExpr normal) return normal.getPairs().stream()
                .filter(pair -> pair.getNameAsString().equals(name)).map(MemberValuePair::getValue).findFirst().orElse(null);
        return null;
    }

    private static void attributes(AnnotationExpr annotation, String prefix, Map<String, List<String>> output) {
        if (annotation == null) return;
        if (annotation instanceof SingleMemberAnnotationExpr single) output.put(prefix + "value", List.of(single.getMemberValue().toString()));
        if (annotation instanceof NormalAnnotationExpr normal) for (var pair : normal.getPairs()) {
            var expression = pair.getValue();
            output.put(prefix + pair.getNameAsString(), expression instanceof ArrayInitializerExpr array
                    ? array.getValues().stream().map(Object::toString).toList() : List.of(expression.toString()));
        }
    }

    private boolean isMapping(AnnotationExpr annotation) { return MAPPINGS.contains(shortName(annotation)); }
    private static String shortName(AnnotationExpr annotation) { return annotation.getName().getIdentifier(); }
    private static int line(Node node) { return node.getBegin().map(p -> p.line).orElse(1); }
    private static TypeDeclaration<?> enclosingType(Node node) { return node.findAncestor(TypeDeclaration.class).orElse(null); }
    private void issue(Source source, Node node, String reason, String nextStep) {
        var type = node instanceof TypeDeclaration<?> declaration ? declaration : enclosingType(node);
        String symbol = type == null ? "source" : type.getFullyQualifiedName().orElse(type.getNameAsString());
        if (node instanceof MethodDeclaration method) symbol += "." + method.getNameAsString();
        issues.add(new Issue(source.path, line(node), symbol, reason, nextStep));
    }
}
