import {Transform} from 'stream';

// # Usage
//
//     process.stdin.pipe(
//         new LoggifyTransform(
//             function() {
//                 return (new Date()).getTime();
//             },
//             'bob'
//         )).pipe(process.stdout);

export default class LoggifyTransform extends Transform {

    constructor(getDate, name, stream) {
        super();
        Transform.call(this, { objectMode: true });
        this._getDate = getDate;
        this._name = name;
        this._stream = stream;
        this._existing = '';
    }

    represent(section) {
        return "[" + this._getDate() + "/" +  this._name + ":" + this._stream + "] " + section + "\n";
    }

    _transform(chunk, encoding, done) {

        var inLines = (this._existing + chunk).split("\n"),
            i = 0;
        while (i < inLines.length - 1) {
            this.push(this.represent(inLines[i]));
            i++;
        }
        this._existing = inLines[inLines.length - 1];
        done();
    }

    _flush(done) {
        if (this._existing) {
            this.push(this.represent(this._existing));
            this._existing = false;
        }
        done();
    }

}



