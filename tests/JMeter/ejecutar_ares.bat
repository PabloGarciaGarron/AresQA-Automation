@echo off
set "JMETER_HOME=C:\00. BORRAR\apache-jmeter-5.6.3"
set "PROYECTO_DIR=%~dp0"
set "PLAN=%PROYECTO_DIR%Proyecto_ARES.jmx"
set "RESULTADOS=%PROYECTO_DIR%resultados.jtl"
set "REPORTE=%PROYECTO_DIR%reporte_html"

:: Limpiar resultados y reporte de ejecuciones anteriores
if exist "%RESULTADOS%" del /f /q "%RESULTADOS%"
if exist "%REPORTE%" rmdir /s /q "%REPORTE%"

:: Ejecutar ApacheJMeter.jar directamente con Java
java -Xms1g -Xmx2g -jar "%JMETER_HOME%\bin\ApacheJMeter.jar" -n -t "%PLAN%" -l "%RESULTADOS%" -e -o "%REPORTE%"

:: Abrir el reporte automaticamente en el navegador al finalizar
if exist "%REPORTE%\index.html" (
    start "" "%REPORTE%\index.html"
) else (
    echo Error: No se pudo generar el reporte.
    pause
)