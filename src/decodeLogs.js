const SolidityEvent = require('web3/lib/web3/event.js');

export default function decodeEventLogs (logs, contract, address) {
    var eventLogs = [];
    for(var i in logs) {
        var log = logs[i];
        var topics = log.topics;
        var events = contract.events;
        for(var j in topics) {
            var topic = topics[j];
            var event = events[topic];
            if(event) {
                event = new SolidityEvent(null, event, address);
                var eventLog = event.decode(log);
                eventLogs.push(eventLog);
            }
        }
    }
    return eventLogs;
}