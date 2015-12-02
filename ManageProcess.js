import { spawn } from 'child_process';
import Loggify from './Loggify.js';
import EventEmitter from 'events';

export default class ManageProcess extends EventEmitter {

    constructor(getDate, name, stdout, stderr) {
        super();
        this._mainStdout = stdout;
        this._mainStderr = stderr;
        this._lOut = new Loggify(getDate, name, 'STDOUT');
        this._lErr = new Loggify(getDate, name, 'STDERR');
        this._lExit = new Loggify(getDate, name, 'EXIT');
        this._child;
    }

    running() { return !!this._child; }

    stop(force) {

        if (!this._child) { return; }

        let arg = 'SIGHUP';
        if (force) {
            arg = 'SIGKILL';
        }

        this._child.kill(arg);
    }

    start(cmd, args, onStop) {
        if (this._child) {
            return onStop(new Error('ALREADY_RUNNING'));
        }
        console.log("CMD: ", [cmd, args]);
        this._child = spawn(cmd, args);
        this._child.stdout.pipe(this._lOut).pipe(this._mainStdout);
        this._child.stderr.pipe(this._lErr).pipe(this._mainStderr);
        this._child.on('exit', (code) => {
            this._mainStdout.write(this._lExit.represent('Exited with code ' + code));
            this._child = null;
            onStop(null, code);
        });
    }

}
