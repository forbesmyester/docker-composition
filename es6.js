import assert from 'assert';
export class MappingSpecification {
    constructor(composeFile, service, port) {
        this.composeFile = composeFile;
        this.service = service;
        this.port = port;
    }

    equals(mappingSpecification) {
        return (
            (this.composeFile == mappingSpecification.composeFile) &&
            (this.service == mappingSpecification.service) &&
            (this.port == mappingSpecification.port)
        );
    }
}

export class Ports {
    constructor() {
        this.mappings = [];
    }
    unregister(mappingSpecification, next) {
        assert(mappingSpecification instanceof MappingSpecification);
        this.mappings = this.mappings.filter((mapping) => {
            return mappingSpecification.port = mapping.port;
        });
        next(null);
    }
    register(mappingSpecification, next) {
        assert(mappingSpecification instanceof MappingSpecification);
        let already = this.mappings.filter((mapping) => {
            return mappingSpecification.port = mapping.port;
        });
        if (already.length) {
            return next(null, already[0]);
        }
        this.mappings.push(mappingSpecification);
        next(null, mappingSpecification);
    }
}
