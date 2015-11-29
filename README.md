# Docker Composition Runner

Restful service for running multiple docker-compose.yml files

A single docker-compose.yml file is called a composition.

## Needs to manage

### Done

 * POST /composition/:name - creates a composition
 * PUT/POST /composition/:name/environment - registers an environment file
 * PUT/POST /composition/:name/compose - registers an compose file
 * GET /composition - Export of all configuration

### Pending

 * PUT /composition/:state - starts / stops a composition
 * DELETE /composition/:name - removes a composition

## Notes

 * Need to ensure no two compositions use the same port
