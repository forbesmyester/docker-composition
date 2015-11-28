import {expect} from "chai";
import {readConfig, Ports, MappingSpecification} from "../es6";
import {readFile, readdir} from 'fs';

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
                        "environment": {"KEY": "abc", "VAL": "def"}
                    }
                }
            );
            done();
        });
    });
});
