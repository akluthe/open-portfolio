# syntax=docker/dockerfile:1
# .NET 9 minimal API. Build context = the api-resume project dir:
#   docker build -t resume-api apps/api-resume

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY api-resume.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish api-resume.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runner
WORKDIR /app
# aspnet image listens on 8080 by default (non-root friendly).
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app ./
USER $APP_UID
ENTRYPOINT ["dotnet", "api-resume.dll"]
