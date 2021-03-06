import {} from 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { values, mapObjIndexed } from 'ramda';
import { createHistory } from 'history';
import yaml from 'js-yaml';

var currentStatus = {};

var CompositionList = React.createClass({
    render: function() {
        function m(comp, k) {
            return (
                <div key={ k }>
                    <Composition name={ k } composition={ comp } />
                </div>
            );
        }
        return (<div>{ values(mapObjIndexed(m, this.props.compositions)) }</div>);
    }
});

var Composition = React.createClass({
    render: function() {

        function getIcon(state) {

            let icon = 'refresh',
                color = 'started',
                iconmap = {
                    started: 'play',
                    stopped: 'stop'
                };

            if (state.indexOf("(") == -1) {
                icon = iconmap[state];
            }
            if (state.indexOf('stopped') > -1) {
                color = 'stopped';
            }

            return [color, 'fa', 'fa-' + icon].join(' ');
        }

        function getStatusWord(state) { return state; }

        var state = getIcon(this.props.composition.state),
            stateWord = getStatusWord(this.props.composition.stateWord),
            name = this.props.name,
            items = this.props.composition.items;

        var itemEls = items.map(function(item) {
            return (<li key={ item }>{ item }</li>);
        });

        let l = `/?composition=${name}`;
        return(
            <div className="selected composition pure-g">
                <div className="pure-u-1">
                <h3>
                    <i className={ state } aria-label={ stateWord }></i>&nbsp;
                    <a href={ l } onClick={ loadComposition(name) }>{ name }</a>
                </h3>
                <ul>
                    { itemEls }
                </ul>
                </div>
            </div>
        );
    }
});

var compositionList = {
    db: {
        state: "respawning (started)",
        items: ["mongos", "mongodb"]
    },
    nginx: {
        state: "started",
        items: ["qsmtpd", "imapd"]
    },
    m: {
        state: "stopped",
        items: ["qsmtpd", "imapd"]
    }
};

function loadComposition(composition) {
    return function(evt) {
        evt.preventDefault();
        history.push('/?composition=' + composition);
    };
}

function composeMapper(comp) {
    return {
        state: comp.state,
        items: comp.compose ? Object.keys(comp.compose) : []
    };
}

function setCompositionState(name, state) {
    return function setCompositionStateImpl(evt) {
        evt.preventDefault();
        fetch(`/composition/${name}/state`, {
            method: 'PUT',
            body: '"' + state + '"',
            headers: new Headers({ 'Content-Type': 'application/json' })
        });
    };
}


function getControls(name, composition) {
    var controls = {
        stopped: (
            <span key="stopped">
            <a href="#"
                    onClick={ setCompositionState(name, 'stopped') }
                    className="pure-button">
                <i className="fa fa-stop"></i>&nbsp;
                Stop Service
            </a>&nbsp;
            </span> ),
        started: (
            <span key="started">
            <a href="#"
                    onClick={ setCompositionState(name, 'started') }
                    className="pure-button">
                <i className="fa fa-play"></i>&nbsp;
                Start Service
            </a>&nbsp;
            </span> ),
        respawning: (
            <span key="respawning">
            <a href="#"
                    onClick={ setCompositionState(name, 'respawning') }
                    className="pure-button">
                <i className="fa fa-refresh"></i>&nbsp;
                Respawn Service
            </a>&nbsp;
            </span> )
    };

    delete controls[composition.state.replace(/ .*/, '')];
    return (
        <span>
            { Object.values(controls) }
        </span>
    );
}

function getEnvironment(composition) {
    let t = Object.entries(composition.environment).reduce((acc, [k, v]) => {
        acc.push(k + '=' + v);
        return acc;
    }, []).join("\n");
    return (<code>{ t }</code>);
}

function getComposeYaml(composition) {
    let y = 'ERROR: COULD NOT CREATE YAML...';
    try {
        y = yaml.safeDump(composition.compose);
    } catch (e) {
        return (<code>{y}</code>);
    }
    return (<code>{y}</code>);
}

function getHeading(name, composition) {
    let toFa = {
        stopped: 'stop',
        respawning: 'refresh',
        started: 'play'
    };

    let started = composition.state.indexOf('started') > -1 ? 'started' : '';
    let headingTitleClass = `${started} fa fa-${ toFa[composition.state.replace(/ .*/, '')] }`;

    return (
        <heading>
        <h2><i className={headingTitleClass}></i> { name }</h2>
        <dl className="inline">
            <dt>Status</dt>
            <dd>{ composition.state }</dd>
        </dl>
        </heading>
    );
}

function displayComposition(name, composition) {

    ReactDOM.render(
        getHeading(name, composition),
        document.getElementById('info-heading')
    );

    ReactDOM.render(
        getEnvironment(composition),
        document.getElementById('info-environment')
    );

    ReactDOM.render(
        getComposeYaml(composition),
        document.getElementById('info-compose')
    );

    ReactDOM.render(
        getControls(name, composition),
        document.getElementById('info-controls')
    );

    displayFlip('info');
}

function displayIntroduction() {
    displayFlip('introduction');
}

function displayFlip(shown) {
    document.getElementById('introduction').setAttribute(
        'style',
        shown == 'introduction' ? '' : 'display: none'
    );
    document.getElementById('info').setAttribute(
        'style',
        shown == 'info' ? '' : 'display: none'
    );
}

let refreshMain = (location, myCurrentStatus) => {
    let m = location.search.match(/[\?&]composition=([a-z0-9A-Z]+)/);
    if (!m) {
        return displayIntroduction();
    }
    let comp = m[1];
    if (!myCurrentStatus[comp]) {
        // Not found... handle
        alert("Could not find composition " + comp);
        return;
    }
    displayComposition(comp, myCurrentStatus[comp]);
};

function refreshState() {
    return fetch('/composition')
        .then((resp) => {
            return resp.json();
        })
        .then((compositionData) => {
            currentStatus = compositionData;
            history.push({ search: location.search });
            return compositionData;
        });
}


function displayList(compositionData) {
    let toDisplay = Object.entries(compositionData).reduce((r, [k, v]) => {
        r[k] = composeMapper(v);
        return r;
    }, {});
    ReactDOM.render(
        <CompositionList compositions={ toDisplay }/>, document.getElementById('list')
    );
}


let history = createHistory();
refreshState().then(() => {
    history.listen((location) => {
        displayList(currentStatus);
        refreshMain(location, currentStatus);
    });
});
