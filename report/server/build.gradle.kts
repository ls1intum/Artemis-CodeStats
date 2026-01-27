plugins {
    java
    application
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.google.code.gson:gson:2.11.0")
    implementation("com.github.javaparser:javaparser-core:3.26.2")
}

application {
    mainClass.set("de.tum.cit.aet.codestats.DtoViolationExtractor")
}

tasks.named<JavaExec>("run") {
    val artemisSourceDir = project.findProperty("artemisSource")?.toString()
        ?: "${project.rootDir}/../../artemis/src/main/java"

    systemProperty("artemis.source", artemisSourceDir)
    systemProperty("output.file", "${project.rootDir}/violations.json")

    doFirst {
        println("Artemis source: $artemisSourceDir")
        println("Output file: ${project.rootDir}/violations.json")
    }
}
