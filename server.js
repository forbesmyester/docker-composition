import Hapi from 'hapi';
import { readdir, readFile, writeFile, rename } from 'fs';
import getTLIdEncoderDecoder from 'get_tlid_encoder_decoder';

import { writeEnvironmentFile, writeComposeFile, readConfig } from './lib';

let genRand = (function() {
    let encoderDecoder = getTLIdEncoderDecoder(
        new Date(2015, 8, 1).getTime(),
        4
    );
    return () => encoderDecoder.encode();
}());

/* eslint no-console: 0 */

let server = new Hapi.Server();
server.connection({ port: process.env.PORT });

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
                rename,
                './config',
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
            './config',
            (err, config) => {
                rep(err, config);
            }
        );

    }
});


server.start((err) => {
    if (err) { throw err; }
    console.log("Listening on: " + server.info.uri);
});
