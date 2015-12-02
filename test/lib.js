import {expect} from "chai";
import { validateConfig, getHostPorts, writeComposeFile, writeEnvironmentFile, readConfig, Ports } from "../lib";
import {readFile, readdir} from 'fs';
import { last, reverse, tail } from 'ramda';



describe('ports', function() {
    it('can get ports bound to the host within a docker-compose', function(done) {
        let getStateF = function(n) { return n == "a" ? "started" : "stopped"; };
        readConfig(readdir, readFile, getStateF, './test-data', function(err, data) {
            expect(getHostPorts(data.b.compose)).to.eql([27017, 8080, 3900]);
            done();
        });
    });

    it('can register ports', function() {
        let ports = new Ports();
        expect(ports.register('a', [80, 81])).to.eql(['a']);
        expect(ports.register('b', [80])).to.eql(['a']);
        ports.unregister('a');
        expect(ports.register('b', [80])).to.eql(['b']);
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
            '/tmp/.aaa',
            "mongo:\n  image: 'mongo:3'\n",
            { mode: 0o600, encoding: 'utf8' }
        );

        let moveFile = checkerNext('/tmp/.aaa', '/tmp/a/compose.yaml');

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
            '/tmp/.aaa',
            "NODE_ENV=production",
            { mode: 0o600, encoding: 'utf8' }
        );

        let moveFile = checkerNext('/tmp/.aaa', '/tmp/a/environment.env');

        writeEnvironmentFile(
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

describe('validateConfig', function() {
    it('can validate (success)', function(done) {
        let rd = (p, n) => {
            expect(p).to.eql('test-data/m');
            n(null, ['compose.yaml', 'environment.env']);
        };
        validateConfig(rd, './test-data', 'm', function(err, valid) {
            expect(err).to.eql(null);
            expect(valid).to.eql(true);
            done();
        });
    });
    it('can validate (missing compose)', function(done) {
        let rd = (p, n) => {
            expect(p).to.eql('test-data/m');
            n(null, ['environment.env']);
        };
        validateConfig(rd, './test-data', 'm', function(err, valid) {
            expect(err).to.eql(null);
            expect(valid).to.eql(false);
            done();
        });
    });
    it('can validate (missing env)', function(done) {
        let rd = (p, n) => {
            expect(p).to.eql('test-data/m');
            n(null, ['compose.yaml']);
        };
        validateConfig(rd, './test-data', 'm', function(err, valid) {
            expect(err).to.eql(null);
            expect(valid).to.eql(false);
            done();
        });
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
                                "ports": ["27017:27017", "8080:8081", "2800", 2801]
                            },
                            "def": {
                                "image": "elasticsearch",
                                "ports": ["3900:2900"]
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
