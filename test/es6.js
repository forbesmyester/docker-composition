import {expect} from "chai";
import {Ports, MappingSpecification} from "../es6";

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
