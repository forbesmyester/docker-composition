import Hapi from 'hapi';
import { mkdir, readdir, readFile, writeFile, rename } from 'fs';
import async from 'async';
import path from 'path';
import { pipe, map, nth, uniq, concat, filter, once } from 'ramda';
import getTLIdEncoderDecoder from 'get_tlid_encoder_decoder';
import inert from 'inert';

import { Ports, getHostPorts, validateConfig, writeEnvironmentFile, writeComposeFile, readConfig } from './lib';
import ManageProcess from './ManageProcess';
import MultiRunner from './MultiRunner';

/* eslint no-console: 0 */

const PORT = process.env.PORT;
if (!PORT) {
    console.log("Need to specify PORT environmental variable");
    process.exit(1);
}
const CONFIG_DIR = process.env.CONFIG_DIR;
if (!CONFIG_DIR) {
    console.log("Need to specify CONFIG_DIR environmental variable");
    process.exit(1);
}

let respawning = [];
function addToRespawning(compositionKey) {
    respawning = uniq(concat(respawning, [compositionKey]));
}
function removeFromRespawning(compositionKey) {
    respawning = filter(
        (ck) => ck != compositionKey,
        respawning
    );
}

let boundReadConfig = readConfig.bind(
        this,
        readdir,
        readFile,
        (ck) => {
            let r =  multiRunner.isRunning(ck) ? 'started' : 'stopped';
            if (respawning.indexOf(ck) > -1) {
                r = 'respawning (' + r + ')';
            }
            return r;
        },
        CONFIG_DIR
    );

let multiRunner = new MultiRunner(
    (ck) => { return [
            'docker-compose', [
                '-f',
                path.join(CONFIG_DIR, ck, 'compose.yaml'),
                'up',
                '--no-color'
            ]
        ]; },
    getHostPorts,
    (ck) => {
            return new ManageProcess(
                () => (new Date()).toISOString(),
                ck,
                process.stdout,
                process.stderr
            );
        },
    new Ports(),
    boundReadConfig
);

let genRand = (function() {
    let encoderDecoder = getTLIdEncoderDecoder(
        new Date(2015, 8, 1).getTime(),
        4
    );
    return () => encoderDecoder.encode();
}());

function moveToSubDir(from, fullPath, next) {
    mkdir(path.dirname(fullPath), function() {
        rename(from, fullPath, next);
    });
}


function shouldIStartRespawner(ck, next) {

    let wantsStarting = () => {
        return ((respawning.indexOf(ck) > -1) && (!multiRunner.isRunning(ck)));
    };

    setTimeout(() => {
        if (!wantsStarting()) {
            return next(null, [ck, false]);
        }
        setTimeout(() => {
            if (!wantsStarting) {
                return next(null, [ck, false]);
            }
            return next(null, [ck, true]);
        }, 2000);
    }, 5000);

}

setInterval(() => {
    async.map(
        respawning,
        shouldIStartRespawner,
        (err, possibleRespawners) => {
            pipe(
                filter(([, start]) => start),
                map(nth(0)),
                map((ck) => multiRunner.start(ck, () => {}))
            )(possibleRespawners);
        }
    );
}, 10000);

let server = new Hapi.Server();
server.connection({ port: PORT });
server.register(inert, function (err) { if (err) { throw err; } });

server.route({
    method: 'POST',
    path: '/composition/{composition}',
    handler: (req, rep) => {
        // rep({a: req.params.composition, p: req.payload});
        var response = rep({});
        response.code(201);
    }
});

let setupComposeEnvironmentRoute = (leaf, func) => {
    server.route({
        method: 'POST',
        path: '/composition/{composition}/' + leaf,
        handler: (req, rep) => {
            func(
                genRand,
                writeFile,
                moveToSubDir,
                CONFIG_DIR,
                req.params.composition,
                req.payload,
                (err) => {
                    var response = rep(err, {});
                    response.code(err ? 500 : 201);
                }
            );

        }
    });
};

setupComposeEnvironmentRoute('environment', writeEnvironmentFile);
setupComposeEnvironmentRoute('compose', writeComposeFile);

server.route({
    method: 'GET',
    path: '/composition',
    handler: (req, rep) => {
        boundReadConfig(
            (err, config) => {
                rep(config);
            }
        );
    }
});

function getStartStopRespawnErrorFunc(done) {
    return function(err, code, message) {
        console.log(err);
        let httpStatus = 500;
        if (code == "INVALID_COMPOSITION_CONFIGURATION") {
            httpStatus = 409;
        }
        done(httpStatus, code, message);
    };
}

function getStartStopRespawnDoneBaseFunc(rep) {
    return function(httpStatus, code, message) {
        let replyData = { code };
        if (message) { replyData.message = message; }
        var response = rep(replyData);
        response.code(httpStatus);
    };
}

function startComposition(composition, rep) {

    let done = once(getStartStopRespawnDoneBaseFunc(rep)),
        error = getStartStopRespawnErrorFunc(done);

    validateConfig(readdir, CONFIG_DIR, composition, (err, configOk) => {
        if (err) {
            return error(err, "UNKNOWN_ERROR");
        }
        if (!configOk) {
            return error(
                err,
                "INVALID_COMPOSITION_CONFIGURATION",
                "configuration for '" + composition + "' " +
                    "is currently invalid."
            );
        }

        multiRunner.start(composition, (err2, code) => {
            if (err2) {
                return error(err2, "UNKNOWN_ERROR");
            }
            done(200, code);
        });
        setTimeout(() => { done(202, "STARTING"); }, 500);
    });
}

function stopComposition(composition, rep) {

    let done = once(getStartStopRespawnDoneBaseFunc(rep)),
        error = getStartStopRespawnErrorFunc(done);

    multiRunner.stop(composition, (err, code) => {
        if (err) {
            return error(err, "UNKNOWN_ERROR");
        }
        done(200, code);
    });
    setTimeout(() => { done(202, "STOPPING"); }, 500);

}

function respawnComposition(composition, rep) {

    let done = once(getStartStopRespawnDoneBaseFunc(rep)),
        error = getStartStopRespawnErrorFunc(done);

    validateConfig(readdir, CONFIG_DIR, composition, (err, configOk) => {
        if (err) {
            return error(err, "UNKNOWN_ERROR");
        }
        if (!configOk) {
            return error(
                err,
                "INVALID_COMPOSITION_CONFIGURATION",
                "configuration for '" + composition + "' " +
                    "is currently invalid."
            );
        }

        addToRespawning(composition);

        done(202, 'RESPAWNING');
    });
}

server.route({
    method: 'PUT',
    path: '/composition/{composition}/state',
    handler: (req, rep) => {
        switch (req.payload) {
            case 'started':
                removeFromRespawning(req.params.composition);
                startComposition(req.params.composition, rep);
                break;
            case 'stopped':
                removeFromRespawning(req.params.composition);
                stopComposition(req.params.composition, rep);
                break;
            case 'respawning':
                respawnComposition(req.params.composition, rep);
                break;
            default:
                getStartStopRespawnDoneBaseFunc(rep)(409, 'INVALID_STATE');
        }
    }
});

server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: './public',
            redirectToSlash: true,
            index: true
        }
    }
});

server.start((err) => {
    if (err) { throw err; }
    console.log("Listening on: " + server.info.uri);
});
