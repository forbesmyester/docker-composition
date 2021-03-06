export default class MultiRunner {

    constructor(getCommand, getHostPorts, getManageProcessInstance, ports, readConfig) {
        this._getManageProcessInstance = getManageProcessInstance;
        this._ports = ports;
        this._readConfig = readConfig;
        this._getCommand = getCommand;
        this._mps = {};
        this._getHostPorts = getHostPorts;
    }

    _attemptMapPorts(configKey, ports) {
        var r = this._ports.register(configKey, ports);
        if (r.indexOf(configKey) > -1) {
            return true;
        }
        return false;
    }

    start(configKey, onStop) {
        this._readConfig((err, configData) => {
            if (this._mps.hasOwnProperty(configKey)) {
                return onStop(null, 'ALREADY_RUNNING');
            }
            if (!configData.hasOwnProperty(configKey)) {
                return onStop(null, 'NO_CONFIG_FOUND');
            }
            if (!this._attemptMapPorts(
                configKey,
                this._getHostPorts(configData[configKey].compose))
            ) {
                return onStop(null, 'CANNOT_MAP_PORTS');
            }
            this._mps[configKey] = {
                mp: this._getManageProcessInstance(configKey),
                onStop: onStop
            };
            let [cmd, args] = this._getCommand(configKey);
            this._mps[configKey].mp.start(cmd, args, (err2, code) => {
                this._mps[configKey].onStop(err2, 'EXITED_WITH_CODE ' + code);
                delete this._mps[configKey];
            });
        });
    }

    isRunning(configKey) {
        return this._mps.hasOwnProperty(configKey);
    }

    stop(configKey, onStop) {
        if (!this._mps.hasOwnProperty(configKey)) {
            return onStop(null, 'ALREADY_STOPPED');
        }
        var s = this._mps[configKey].onStop;
        this._mps[configKey].onStop = function(err, code) {
            s(err, code);
            onStop(err, code);
        };
        this._mps[configKey].mp.stop();
    }

}
