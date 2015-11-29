import assert from 'assert';
import async from 'async';
import yaml from 'js-yaml';
import path from 'path';
import { values, nth, split, join, tail, merge, mapObjIndexed, zip, assocPath, reverse, reduce } from 'ramda';

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

function writeConfigFile(genRand, writeFile, moveFile, mapper, extension, directory, composition, data, fNext) {

    let tmpFile = path.join(directory, genRand());

    let writer = (next) => {
        writeFile(tmpFile, mapper(data), {encoding: 'utf8', mode: 0o600}, next);
    };

    let mover = (next) => {
        moveFile(
            tmpFile,
            path.join(directory, composition) + '.' + extension,
            next
        );
    };

    async.waterfall([writer, mover], fNext);
}

export function writeComposeFile(genRand, writeFile, moveFile, directory, composition, data, next) {

    let mapper = function(ob) {
        return yaml.safeDump(ob);
    };

    writeConfigFile(
        genRand,
        writeFile,
        moveFile,
        mapper,
        'compose.yaml',
        directory,
        composition,
        data,
        next
    );

}

export function writeEnvironmentFile(genRand, writeFile, moveFile, directory, composition, data, next) {

    let mapper = function(ob) {
        return join("\n", values(mapObjIndexed((v, k) => {
            return k + '=' + v;
        }, ob)));
    };

    writeConfigFile(
        genRand,
        writeFile,
        moveFile,
        mapper,
        'environment.env',
        directory,
        composition,
        data,
        next
    );

}

function processFile(readFileF, filename, next) {
    try {
        var f = function(str) {
            let lineProcess = (acc, s) => {
                if (!s) { return acc; }
                let ss = split("=", s);
                if (nth(0, ss) == '') {
                    return acc;
                }
                acc[nth(0, ss)] = join("=", tail(ss));
                return acc;
            };
            return (reduce(lineProcess, {}, split("\n", str)));
        };
        if (filename.match(/ya{0,1}ml$/)) {
            f = yaml.safeLoad;
        }
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
