import { exec } from 'child_process';
import { Loggify } from './Loggify.js';
import EventEmitter from 'events';

export default class ManageProcess extends EventEmitter {

    constructor(getDate, name, stdout, stderr) {
        this._mainStdout = stdout;
        this._mainStderr = stderr;
        this._lOut = new Loggify(getDate, name, 'STDOUT');
        this._lErr = new Loggify(getDate, name, 'STDERR');
        this._lExit = new Loggify(this._getDate, name + ' EXIT');
    }

    start(cmd) {
        var child = exec(cmd, function(err, stdout, stderr) {
            if (err) {
                throw err;
            }
            stdout.pipe(this._lOut).pipe(this._mainStdout);
            stderr.pipe(this._lErr).pipe(this._mainStderr);
        });
        child.on('exit', (code) => {
            this._mainStdout.write(this._lExit.represent('Exited with code ' + code));
            this.emit('exited');
        });
    }

}
