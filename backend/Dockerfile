FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -Dmaven.test.skip=true package \
    && cp target/*.jar /workspace/application.jar

FROM eclipse-temurin:17-jre-alpine AS runtime

RUN addgroup -S umlforge && adduser -S umlforge -G umlforge

WORKDIR /app
COPY --from=build --chown=umlforge:umlforge /workspace/application.jar /app/application.jar

USER umlforge
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/application.jar"]
