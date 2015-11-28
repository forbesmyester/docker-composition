# Docker Composition Runner

Restful service for running multiple docker-compose.yml files

A single docker-compose.yml file is called a composition.

## Needs to manage

 * POST /composition/:name - creates a composition
 * PUT/POST /composition/:name/environment - registers an environment file
 * PUT/POST /composition/:name/compose - registers an compose file
 * PUT/POST /composition/:name/state - starts / stops a composition
 * DELETE /composition/:name - removes a composition
 * POST / - Overwites all configuration
 * GET / - Export of all configuration

## Notes

 * Need to ensure no two compositions use the same port
