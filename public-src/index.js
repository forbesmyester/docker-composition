import React from 'react';
import ReactDOM from 'react-dom';
import { values, mapObjIndexed } from 'ramda';

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

        function getIcon(status) {

            let icon = 'refresh',
                color = 'started',
                iconmap = {
                    started: 'play',
                    stopped: 'stop'
                };

            if (status.indexOf("(") == -1) {
                icon = iconmap[status];
            }
            if (status.indexOf('stopped') > -1) {
                color = 'stopped';
            }

            return [color, 'fa', 'fa-' + icon].join(' ');
        }

        function getStatusWord(status) { return status; }

        var status = getIcon(this.props.composition.status),
            statusWord = getStatusWord(this.props.composition.statusWord),
            name = this.props.name,
            items = this.props.composition.items;

        var itemEls = items.map(function(item) {
            return (<li key={ item }>{ item }</li>);
        });

        return(
            <div className="selected composition pure-g">
                <div className="pure-u-1">
                <h3>
                    <i className={ status } aria-label={ statusWord }></i>&nbsp;
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
        status: "respawning (started)",
        items: ["mongos", "mongodb"]
    },
    nginx: {
        status: "started",
        items: ["qsmtpd", "imapd"]
    },
    m: {
        status: "stopped",
        items: ["qsmtpd", "imapd"]
    }
};

ReactDOM.render(
  <Timer name="Bob"/>, document.getElementById('main')
);
ReactDOM.render(
  <CompositionList compositions={ compositionList }/>, document.getElementById('list')
);
