import assert from 'assert';
import async from 'async';
import yaml from 'js-yaml';
import path from 'path';
import { merge, mapObjIndexed, zip, assocPath, nth, reverse, reduce } from 'ramda';

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

function processFile(readFileF, filename, next) {
    f = JSON.parse;
    if (filename.match(/ya{0,1}ml$/)) {
        var f = yaml.safeLoad;
    }
    try {
        readFileF(filename, {encoding: 'utf8'}, (err, data) => {
            if (err) { return next(err); }
            next(null, f(data));
        });
    } catch (e) {
        next(e);
    }
}

function reduceConfig(filesDataList) {
    let reducer = (acc, [filename, data]) => {
        return assocPath(
            [
                filename.replace(/\.[^\.]+\.[^\.]+$/, ''),
                nth(1, reverse(filename.split(".")))
            ],
            data,
            acc
        );
    };
    return reduce(reducer, {}, filesDataList);
}

function mixinStarted(getStateF, readConfigReturn) {
    return mapObjIndexed(
        (v, k) => {
            return merge({ state: getStateF(k) }, v);
        },
        readConfigReturn
    );
}

export function readConfig(readdirF, readFileF, getStateF, directory, next) {
    readdirF(directory, function(err, files) {
        async.parallel(
            files.map(
                function(file) {
                    return processFile.bind(null, readFileF, path.join(directory, file));
                }
            ),
            function(err2, datas) {
                if (err2) { return next(err2); }
                next(null, mixinStarted(getStateF, reduceConfig(zip(files, datas))));
            }
        );
    });
}
