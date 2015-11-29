import {expect} from "chai";
import Loggify from "../Loggify";

describe('Loggify', function() {
    it('will clean up logs', function() {
        var i = 0;
        function getDate() {
            return i++;
        }
        var l = new Loggify(getDate, 'bob', 'STDOUT'),
            out = [];
        l.push = function(data) {
            out.push(data);
        };
        l._transform('abc', '', function() {});
        l._transform('d\n', '', function() {});
        l._transform('x', '', function() {});
        l._transform('yz', '', function() {});
        l._flush(function() {});
        expect(out).to.eql(["[0/bob:STDOUT] abcd\n", "[1/bob:STDOUT] xyz\n"]);
    });
});

