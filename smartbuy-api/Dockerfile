# Build from the repository root, so the image can take the ranking library and the data file:
#   docker build -f smartbuy-api/Dockerfile -t smartbuy-api .
#   docker run -p 8080:8080 smartbuy-api

# Stage 1: compile with the full JDK and Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY smartbuy-java/pom.xml smartbuy-java/pom.xml
COPY smartbuy-java/src smartbuy-java/src
COPY smartbuy-api/pom.xml smartbuy-api/pom.xml
COPY smartbuy-api/src smartbuy-api/src
# The tests run in CI before the image is built, so they're skipped here.
# The cache mount keeps downloaded Maven packages between builds.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -f smartbuy-java/pom.xml install -DskipTests \
 && mvn -B -q -f smartbuy-api/pom.xml package -DskipTests

# Stage 2: only the Java runtime, the app and the data, run as a non-root user
FROM eclipse-temurin:17-jre
WORKDIR /app
# A numeric user, so Kubernetes' runAsNonRoot check can confirm it isn't root
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app app
COPY --from=build /src/smartbuy-api/target/smartbuy-api.jar app.jar
COPY smartbuy-frontend/public/phones.json phones.json
ENV SMARTBUY_DATAFILE=/app/phones.json
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
