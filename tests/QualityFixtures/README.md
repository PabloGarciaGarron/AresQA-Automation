# Sonar quality fixtures

These intentionally flawed examples are isolated from the AresQA production application. They demonstrate Security, Reliability, Maintainability, Coverage, and Duplications findings without changing production behavior. The weak-hash example only processes its input and does not contain real credentials or data.

The test project exercises only one branch, so coverage remains deliberately low:

```powershell
dotnet test tests/QualityFixtures.Tests/AresQA.QualityFixtures.Tests.csproj `
  -p:CollectCoverage=true `
  -p:CoverletOutputFormat=opencover `
  -p:CoverletOutput=../../work/quality-fixtures/coverage
```

Configure Sonar analysis with:

```text
sonar.cs.opencover.reportsPaths=work/quality-fixtures/coverage.opencover.xml
```

Analyze `AresQA-Web/AresQA.sln` to include both fixture projects. Keep these examples in the test fixtures; do not copy them into production code.
