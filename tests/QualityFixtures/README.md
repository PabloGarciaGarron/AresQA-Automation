# Sonar quality fixtures

These intentionally flawed examples are isolated from the AresQA production application. They demonstrate Security, Reliability, Maintainability, Coverage, and Duplications findings without changing production behavior. The weak-hash example only processes its input and does not contain real credentials or data.

The fixture library is explicitly classified as source code so Sonar applies the normal code rules and duplication analysis to it. The separate test project exercises only one branch, so coverage remains deliberately low.

```powershell
dotnet test tests/QualityFixtures.Tests/AresQA.QualityFixtures.Tests.csproj `
  -p:CollectCoverage=true `
  -p:CoverletOutputFormat=opencover `
  -p:CoverletOutput=../../work/quality-fixtures/coverage
```

The GitHub Actions workflow `.github/workflows/sonarcloud-quality-fixtures.yml` builds the solution, runs the fixture test, imports its OpenCover report, and submits a manual SonarCloud analysis. Before using it:

1. Disable automatic analysis for the SonarCloud project; SonarCloud automatic and CI-based analyses should not run together.
2. In GitHub repository **Settings → Secrets and variables → Actions**, add the `SONAR_TOKEN` secret and the `SONAR_ORGANIZATION` and `SONAR_PROJECT_KEY` variables.
3. Merge this workflow, then open **Actions → SonarCloud quality fixtures → Run workflow**.

The workflow analyzes `AresQA-Web/AresQA.sln` and imports `work/quality-fixtures/coverage.opencover.xml`. Keep these examples in the test fixtures; do not copy them into production code.
