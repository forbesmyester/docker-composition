import Hapi from 'hapi';
import { mkdir, readdir, readFile, writeFile, rename } from 'fs';
import path from 'path';
import { once } from 'ramda';
import getTLIdEncoderDecoder from 'get_tlid_encoder_decoder';

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
    readConfig.bind(this, readdir, readFile, () => 'stopped', CONFIG_DIR)
);

let genRand = (function() {
    let encoderDecoder = getTLIdEncoderDecoder(
        new Date(2015, 8, 1).getTime(),
        4
    );
    return () => encoderDecoder.encode();
}());

let server = new Hapi.Server();
server.connection({ port: PORT });

server.route({
    method: 'POST',
    path: '/composition/{composition}',
    handler: (req, rep) => {
        // rep({a: req.params.composition, p: req.payload});
        var response = rep({});
        response.code(201);
    }
});

function moveToSubDir(from, fullPath, next) {
    mkdir(path.dirname(fullPath), function() {
        rename(from, fullPath, next);
    });
}

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
        readConfig(
            readdir,
            readFile,
            () => { return 'stopped'; },
            CONFIG_DIR,
            (err, config) => {
                rep(err, config);
            }
        );

    }
});

server.route({
    method: 'PUT',
    path: '/composition/{composition}/state/start',
    handler: (req, rep) => {

        let done = once(function(httpStatus, message) {
            var response = rep({ message: message });
            response.code(httpStatus);
        });

        let error = function(err, message) {
            let httpStatus = 500;
            if (err == "INVALID_COMPOSITION_CONFIGURATION") {
                httpStatus = 409;
            }
            done(httpStatus, message);
        };

        validateConfig(readdir, CONFIG_DIR, req.params.composition, (err, configOk) => {
            if (!configOk) {
                return error(
                    "INVALID_COMPOSITION_CONFIGURATION",
                    "configuration for '" + req.params.composition + "' " +
                        "is currently invalid."
                );
            }
            multiRunner.start(req.params.composition, (err2, message) => {
                if (err2) {
                    return error("UNKNOWN_ERROR", message);
                }
                done(200, message);
            });
            setTimeout(() => { done(200, "RUNNING"); }, 500);
        });
    }
});


server.start((err) => {
    if (err) { throw err; }
    console.log("Listening on: " + server.info.uri);
});
