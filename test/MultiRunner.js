import { expect } from "chai";
import { getHostPorts, Ports, readConfig } from "../lib";
import { readFile, readdir } from 'fs';
import MultiRunner from '../MultiRunner';



describe('MultiRunner', function() {
    it('Can start and stop a job', function(done) {

        var running = false,
            foundAlreadyRunning = false,
            foundNoConfigFound = false;

        let getStateF = function() {
            return running ? "started" : "stopped";
        };

        let myReadConfig = readConfig.bind(
            this,
            readdir,
            readFile,
            getStateF,
            './test-data'
        );

        let getManageProcessInstance = function() {
            var myOnStop;
            return {
                start(cmd, args, onStop) {
                    expect(cmd).to.eql("docker-compose");
                    expect(args).to.eql(['-f', './test-data/a.compose.yaml', 'up']);
                    myOnStop = onStop;
                    running = true;
                },
                stop() {setTimeout(() => {
                    running = false;
                    myOnStop(null);
                }, 200); }
            };
        };

        let runner = new MultiRunner(
            (ck) => ['docker-compose', ['-f', './test-data/' + ck + '.compose.yaml', 'up']],
            getHostPorts,
            getManageProcessInstance,
            (new Ports()),
            myReadConfig
        );

        runner.start('z', function(err, result) {
            expect(err).to.eql(null);
            expect(result).to.eql('NO_CONFIG_FOUND');
            foundNoConfigFound = true;
        });

        runner.start('a', function(err) {
            expect(err).to.eql(null);
            expect(running).to.eql(false);
            expect(foundAlreadyRunning).to.eql(true);
            expect(foundNoConfigFound).to.eql(true);
            done();
        });

        runner.start('a', function(err, result) {
            expect(err).to.eql(null);
            expect(result).to.eql('ALREADY_RUNNING');
            foundAlreadyRunning = true;
        });


        setTimeout(() => {
            expect(running).to.eql(true);
            runner.stop('a');
        }, 200);

    });
});

