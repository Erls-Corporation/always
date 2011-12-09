
/*!
  Module dependencies
*/

require('colors');

var fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    previousEvent,
    app = null;

/*!
  Exports nitrix
 */

var nitrix = function(){};

module.exports = nitrix;

/*!
  processes managed by nitrix
 */

var managed = exports.managed = [];

/*!
  @method init
  Setup node for spawn
 */

exports.init = function init(env){
  var obj = {
    pid : null,
    id : managed.length,
    startTime : new Date().getTime()
  }
  nitrix.managed.push(obj);
  // npm test
  app = npm(env);
  logger('sarting '+app.green +' with Node');
  start();  
};

/*!
  @method npm
  Test for npm test being used,
  if so; format the string.
 */

exports.npm = function npm(env) {
  if (new RegExp(/test/i).test(env)){
    return env;
  } else {
    return __dirname+'./'+env;
  }
};

/*!
  @method logger
  Log methods with nice highlighting
*/

exports.logger = function logger(str, isError){
  isError = isError || false;
  console.log('[nitrix]'.magenta+' '+str);
  if (isError) {
    
  } else {
    
  }
};

/*!
  @method watcher
  @param {String} file Name of file to monitor for changes
*/

exports.monitor = function monitor(){
  /* NOTE: 
    -- there is an open Node 0.6.5 stable bug reporting on strange and
       unstable fs.watch behavior. Change is triggered twice, at the expense of
       the app firing twice on each edit:
        => https://github.com/joyent/node/issues/1986
  */
  fs.watch(app, { interval:1 }, function(event, filename){
    if (event === 'change')
      logger(app.green+' has changed, restarting');
      restart();
  });
};

/*!
  @method exists
  Check that file exists
  @param {String} file File to check exists
*/

exports.exists = function exists(file){
  try {
    var stats = fs.lstatSync(file);
    if (stats.isDirectory()) {
      logger(file+' is a directory'.red, true);
      return false;
    } else {
      return true;
    }
  } catch (error) {
    logger(error.toString().red);  
    return false;
  }
};

/*!
  @method start
  @param {String} app NodeJS file
*/

exports.start = function start(){
  if (!exists(app)){
    return false;
  } else {
    node = spawn('node', [app]);
    // watch node child process file
    monitor(app);
    node.stdout.on('data', function(data){
      logger(data.toString().split('/\n')[0]);
    });
    node.stderr.on('data', function(data){
      logger(data.toString().red, true);
    });
    node.stderr.on('data', function (data) {
      if (/^execvp\(\)/.test(data)) {
        logger('failed to restart child process.', true);
      }
    });
    node.on('exit', function (code, signal) {
      if (signal == 'SIGUSR2') {
        logger('signal interuption, restarting '+app.green, true);
      } else {
        //...
      }
    });
  };
};

/*!
  @method kill
  Unwatch file, then ->
  Try to kill node process
*/

exports.kill = function kill(){
  fs.unwatchFile(app);
  node && node.kill();
};

/*!
  @method restart
  Kill process, restart
*/

exports.restart = function restart(){
  kill();
  start();
};

/*!
  listen for error instance(s)
  on error, generally restart.
*/

process.on('exit', function(code){
  kill();
});

// CTRL+C
process.on('SIGINT', function(){
  logger('Killing '+app.green, true);
  kill();
  process.exit(0);
});

process.on('SIGTERM', function(){
  logger(app.green+' killed', true);
  kill();
  process.exit(0);
});

process.on('uncaughtException', function(error){
  logger(error.toString().red, true);
  logger(error.stack.toString().red, true);
  logger('Restarting ' +app.green +' with Node');
  restart();
});

/* EOF */