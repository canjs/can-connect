var serviceWorkerMain;
if(typeof importScripts === 'function') {
  serviceWorkerMain = importScripts(["./service-worker-main.js"]);
} else {
  serviceWorkerMain = require("./service-worker-main.js");
}
