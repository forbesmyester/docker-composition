import async from 'async';
import yaml from 'js-yaml';
import path from 'path';
import { flatten, uniq, map, pipe, concat, defaultTo, values, nth, split, join, tail, merge, mapObjIndexed, zip, assocPath, reduce } from 'ramda';

export class Ports {
    constructor() {
        this.mappings = [];
    }
    unregister(service) {
        this.mappings = this.mappings.filter(([s]) => {
            if (service == s) { return false; }
            return true;
        });
    }
    register(serviceName, ports) {
        let already = this.mappings.filter(([, port]) => {
            return ports.indexOf(port) > -1;
        });
        if (already.length) {
            return uniq(map(nth(0), already));
        }
        this.mappings = concat(
            this.mappings,
            map((p) => [serviceName, p], ports)
        );
        return [serviceName];
    }
}

function writeConfigFile(genRand, writeFile, moveFile, mapper, extension, directory, composition, data, fNext) {

    let tmpFile = path.join(directory, "." + genRand());

    let writer = (next) => {
        writeFile(tmpFile, mapper(data), {encoding: 'utf8', mode: 0o600}, next);
    };

    let mover = (next) => {
        moveFile(
            tmpFile,
            path.join(directory, composition, extension),
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
                filename.replace(/\/.*/, ''),
                filename.replace(/.*\//, '').replace(/\.[^\.]+/, '')
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

function getHostPortsForContainer(containerCompose) {
    return reduce(
        (acc, dockerPort) => {
            if (typeof dockerPort == 'number') { return acc; }
            if (typeof dockerPort != 'string') { return acc; }
            if (dockerPort.indexOf(":") == -1) { return acc; }
            return concat(acc, [parseInt(nth(0, split(":", dockerPort)))]);
        },
        [],
        defaultTo([], containerCompose.ports)
    );
}

export function getHostPorts(aComposeFile) {

    return pipe(
        mapObjIndexed((v) => {
            return getHostPortsForContainer(v);
        }),
        values,
        reduce((acc, lst) => {
            return concat(acc, lst);
        }, [])
    )(aComposeFile);

}

function semiRecursiveReadDirF(readdirF, directory, next) {
    readdirF(directory, function(err, dirs) {
        if (err) { return next(err); }
        async.map(
            map((s) => { return directory + '/' + s; }, dirs),
            readdirF,
            function(err2, files) {
                if (err2) { return next(err2); }

                let dirFiles = map(([d, fs]) => {
                    return map((f) => path.join(d, f), fs);
                }, zip(dirs, files));

                next(null, flatten(dirFiles));
            }
        );
    });
}

export function validateConfig(readdirF, directory, configKey, next) {
    readdirF(path.join(directory, configKey), function(err, files) {
        if (err) { return next(null, false); }
        next(
            null,
            (files.indexOf('compose.yaml') > -1) && (files.indexOf('environment.env') > -1)
        );
    });
}

export function readConfig(readdirF, readFileF, getStateF, directory, next) {
    semiRecursiveReadDirF(readdirF, directory, function(err, files) {
        if (err) { return next(err); }
        async.parallel(
            map(
                function(file) {
                    return processFile.bind(null, readFileF, path.join(directory, file));
                },
                files
            ),
            function(err2, datas) {
                if (err2) { return next(err2); }
                next(null, mixinStarted(getStateF, reduceConfig(zip(files, datas))));
            }
        );
    });
}
