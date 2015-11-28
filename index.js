'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.readConfig = readConfig;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _ramda = require('ramda');

var MappingSpecification = (function () {
    function MappingSpecification(composeFile, service, port) {
        _classCallCheck(this, MappingSpecification);

        this.composeFile = composeFile;
        this.service = service;
        this.port = port;
    }

    _createClass(MappingSpecification, [{
        key: 'equals',
        value: function equals(mappingSpecification) {
            return this.composeFile == mappingSpecification.composeFile && this.service == mappingSpecification.service && this.port == mappingSpecification.port;
        }
    }]);

    return MappingSpecification;
})();

exports.MappingSpecification = MappingSpecification;

var Ports = (function () {
    function Ports() {
        _classCallCheck(this, Ports);

        this.mappings = [];
    }

    _createClass(Ports, [{
        key: 'unregister',
        value: function unregister(mappingSpecification, next) {
            (0, _assert2['default'])(mappingSpecification instanceof MappingSpecification);
            this.mappings = this.mappings.filter(function (mapping) {
                return mappingSpecification.port = mapping.port;
            });
            next(null);
        }
    }, {
        key: 'register',
        value: function register(mappingSpecification, next) {
            (0, _assert2['default'])(mappingSpecification instanceof MappingSpecification);
            var already = this.mappings.filter(function (mapping) {
                return mappingSpecification.port = mapping.port;
            });
            if (already.length) {
                return next(null, already[0]);
            }
            this.mappings.push(mappingSpecification);
            next(null, mappingSpecification);
        }
    }]);

    return Ports;
})();

exports.Ports = Ports;

function processFile(readFileF, filename, next) {
    f = JSON.parse;
    if (filename.match(/ya{0,1}ml$/)) {
        var f = _jsYaml2['default'].safeLoad;
    }
    try {
        readFileF(filename, { encoding: 'utf8' }, function (err, data) {
            if (err) {
                return next(err);
            }
            next(null, f(data));
        });
    } catch (e) {
        next(e);
    }
}

function reduceConfig(filesDataList) {
    var reducer = function reducer(acc, _ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var filename = _ref2[0];
        var data = _ref2[1];

        return (0, _ramda.assocPath)([filename.replace(/\.[^\.]+\.[^\.]+$/, ''), (0, _ramda.nth)(1, (0, _ramda.reverse)(filename.split(".")))], data, acc);
    };
    return (0, _ramda.reduce)(reducer, {}, filesDataList);
}

function mixinStarted(getStateF, readConfigReturn) {
    return (0, _ramda.mapObjIndexed)(function (v, k) {
        return (0, _ramda.merge)({ state: getStateF(k) }, v);
    }, readConfigReturn);
}

function readConfig(readdirF, readFileF, getStateF, directory, next) {
    readdirF(directory, function (err, files) {
        _async2['default'].parallel(files.map(function (file) {
            return processFile.bind(null, readFileF, _path2['default'].join(directory, file));
        }), function (err2, datas) {
            if (err2) {
                return next(err2);
            }
            next(null, mixinStarted(getStateF, reduceConfig((0, _ramda.zip)(files, datas))));
        });
    });
}

