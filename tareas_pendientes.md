# Tareas pendientes

## Payloads

Patrón DTO + Funciones RPC
Para mantener los Documentos en el cliente sin violar la Regla de Normalización Relacional (3NF) de la base de datos, debes aplicar el patrón Data Transfer Object combinado con Remote Procedure Calls (RPC) en PostgreSQL:

En el Frontend (React + Zustand): El usuario rellena el "Doc-8 (Parte de Trabajo)". El sistema guarda localmente todo como un único objeto JSON temporal.

En la Red: Cuando el usuario pulsa "Guardar/Finalizar", React Query envía ese mega-objeto JSON de una sola vez hacia Supabase.

En el Backend (Supabase): En lugar de hacer un INSERT directo, llamas a una función RPC de PostgreSQL (ej. procesar_doc8(payload)). Esta función recibe el JSON y se encarga internamente de "despedazarlo" para insertarlo en las tablas correctas de forma atómica: los kilómetros a historial_flota, los repostajes a eventos_fisicos_vehiculo y los tiempos a turnos_operativos.

## Coordenadas GPS

Para los eventos que requieren geolocalización (repostajes, incidencias, etc.), el sistema debe capturar las coordenadas GPS del dispositivo en el momento de registrar el evento. Estas coordenadas se almacenarán en la tabla `eventos_fisicos_vehiculo` junto con el ID del vehículo y la marca temporal. Esto permitirá posteriormente visualizar en un mapa dónde ocurrieron los eventos más relevantes de la flota.

Cuando se solicitan coordenadas (en cualquier campo), si el dispositivo no tiene conexión GPS, se deben mostrar las últimas conocidas y una advertencia de que no se han podido actualizar.
