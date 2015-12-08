import {} from 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { values, mapObjIndexed } from 'ramda';
import { createHistory } from 'history';



var Timer = React.createClass({
    getInitialState: function() {
        return {a: 1};
    },
    tick: function() {
        this.setState({a: this.state.a + 1});
    },
    componentDidMount: function() {
        this.interval = setInterval(this.tick, 1000);
    },
    componentWillUnmount: function() {
        clearInterval(this.tick);
    },
    render: function() {
        return (<h1>Hello, { this.props.name } { this.state.a }!</h1>);
    }
});

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

        return(
            <div className="selected composition pure-g">
                <div className="pure-u-1">
                <h3>
                    <i className={ state } aria-label={ stateWord }></i>&nbsp;
                    { name }
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

function composeMapper(comp) {
    return {
        state: comp.state,
        items: comp.compose ? Object.keys(comp.compose) : []
    };
}

fetch('/composition')
    .then((resp) => {
        return resp.json();
    })
    .then((json) => {
        return Object.entries(json).reduce((r, [k, v]) => {
            r[k] = composeMapper(v);
            return r;
        }, {});
    })
    .then((toDisplay) => {
        ReactDOM.render(
            <CompositionList compositions={ toDisplay }/>, document.getElementById('list')
        );
    });

function displayComposition(composition) {

    var controls = {
        stopped: ( <span key="stopped"><a href="#" className="pure-button">
                <i className="fa fa-stop"></i>&nbsp;
                Stop Service
            </a>&nbsp;</span> ),
        started: ( <span key="started"><a href="#" className="pure-button">
                <i className="fa fa-play"></i>&nbsp;
                Run Without Respawning
            </a>&nbsp;</span> ),
        respawning: ( <span key="respawning"><a href="#" className="pure-button">
                <i className="fa fa-refresh"></i>&nbsp;
                Respawn
            </a>&nbsp;</span> )
    };

    delete controls[composition.state];

    ReactDOM.render(
        <span>
            { Object.values(controls) }
        </span>,
        document.getElementById('controls')
    );

}

let history = createHistory();
history.listen(location => {
    let m = location.search.match(/[\?&]composition=([a-z0-9A-Z]+)/);
    if (!m) { return; }
    fetch('/composition/' + m[1])
        .then((resp) => {
            if (resp.status != 200) {
                // Not found... handle
                alert("Could not find composition " + m[1]);
                return;
            }
            resp.json().then(displayComposition);
        });
});

// ReactDOM.render(
//   <Timer name="Bob"/>, document.getElementById('main')
// );
