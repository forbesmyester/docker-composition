import {expect} from "chai";
import { writeComposeFile, writeEnvironemntFile, readConfig, Ports, MappingSpecification } from "../lib";
import {readFile, readdir} from 'fs';
import { last, reverse, tail } from 'ramda';

// import getTLIdEncoderDecoder from 'get_tlid_encoder_decoder';
// var encoderDecoder = getTLIdEncoderDecoder(
//     new Date(2015, 8, 1).getTime(),
//     4
// );


describe('ports', function() {
    it('can register ports', function(done) {
        let ports = new Ports();
        let mappings = [
            new MappingSpecification('a/b', 'c', 80),
            new MappingSpecification('d/e', 'c', 80)
        ];
        ports.register(mappings[0], (err, result) => {
            expect(err).to.eql(null);
            expect(result.equals(mappings[0])).to.eql(true);
            ports.register(mappings[1], (err2, result2) => {
                expect(err2).to.eql(null);
                expect(result2.equals(mappings[0])).to.eql(true);
                ports.unregister(mappings[0], (err3) => {
                    expect(err3).to.eql(null);
                    ports.register(mappings[1], (err4, result4) => {
                        expect(result4.equals(mappings[0])).to.eql(true);
                        done();
                    });
                });
            });
        });
    });
});

describe('atomically write config files for', function() {

    let genRand = () => 'aaa';

    let checkerNext = (...expected) => {
        return (...args) => {
            let actual = reverse(tail(reverse(args)));
            expect(expected).to.eql(actual);
            last(args)(null);
        };
    };

    it('compose', function(done) {

        let writeFile = checkerNext(
            '/tmp/aaa',
            "mongo:\n  image: 'mongo:3'\n",
            { mode: 0x600, encoding: 'utf8' }
        );

        let moveFile = checkerNext('/tmp/aaa', '/tmp/a.compose.yaml');

        writeComposeFile(
            genRand,
            writeFile,
            moveFile,
            '/tmp',
            'a',
            { mongo: { image: "mongo:3" } },
            (err) => {
                expect(err).to.eql(null);
                done();
            }
        );
    });

    it('environment', function(done) {

        let writeFile = checkerNext(
            '/tmp/aaa',
            "NODE_ENV=production",
            { mode: 0x600, encoding: 'utf8' }
        );

        let moveFile = checkerNext('/tmp/aaa', '/tmp/a.environment.env');

        writeEnvironemntFile(
            genRand,
            writeFile,
            moveFile,
            '/tmp',
            'a',
            { NODE_ENV: 'production' },
            (err) => {
                expect(err).to.eql(null);
                done();
            }
        );
    });
});

describe('readConfig', function() {
    it('can read', function(done) {
        let getStateF = function(n) { return n == "a" ? "started" : "stopped"; };
        readConfig(readdir, readFile, getStateF, './test-data', function(err, data) {
            expect(err).to.eql(null);
            expect(data).to.eql(
                {
                    "a": {
                        "state": "started",
                        "compose": {"person": {"name": "bob"}},
                        "environment": {"NODE_ENV": "production"}
                    },
                    "b":{
                        "state": "stopped",
                        "compose": {
                            "abc": {
                                "image": "mongo:3",
                                "ports": ["27017:27017"]
                            }
                        },
                        "environment": {"KEY1": "abc=def", "KEY2": "def"}
                    }
                }
            );
            done();
        });
    });
});
