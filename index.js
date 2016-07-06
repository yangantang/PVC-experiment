// require the libraries used by the application
var iot = require('aws-iot-device-sdk');
var _ = require('lodash');
var SimCom = require('simcom').SimCom;
var gpio = require('rpi-gpio');

// open pins for communication
gpio.setup(7, gpio.DIR_IN, readInput);

// connect to the AWS IoT service
var device = iot.device({
   keyPath: '/home/pi/AWSCerts/privateKey.pem',
  certPath: '/home/pi/AWSCerts/cert.pem',
    caPath: '/home/pi/AWSCerts/root.pem',
  clientId: 'rpi01',
    region: 'us-west-2'
});

// establish a serial connection to the USB to TTL serial cable
var simcom = new SimCom('/dev/ttyUSB0');

// called when the serial connection is opened
simcom.on('open', function() {
	console.log('simcom open');
});

// called when the serial connection has an error
simcom.on('error', function() {
	console.log('simcom error');
});

// executes an AT command
function executeAtCmd(atCmd) {
	// log the AT command received
	console.log('Execute AT Command: [' + atCmd + ']');
	// send the AT command to the modem
	simcom.modem.execute(atCmd).then(function(lines) {
		// log the AT command response
		console.log('AT Response', lines);
		// send the AT command response to the admin client
		sendToServer('AT Response: ' + JSON.stringify(lines));
	}, function(error) {
		// log the AT Command error
		console.error('AT Command Error', error);
		// send the AT command error to the admin client
		sendToServer('AT Command Error: ' + JSON.stringify(error));
	});
}

// publish a message to the topic that is subscribed to by the admin client
function sendToServer(message) {
	device.publish('test/topic1', message);
}

// called on connection to the AWS IoT service 
device.on('connect', function() {
	console.log('iot: connect');
	// subscribe to the topic that is used to send commands to the remote device
	device.subscribe('test/topic2');
	// send a message to the admin client that the remote device is connected
	sendToServer('iot: connect');
});

// called when acknowledge received by device, reads input pins
function readInput() {
	gpio.read(7, function(err, value) {
		sendToServer('CO2 reading: ' + value);
	}
}

// called when a message is received from AWS IoT
device.on('message', function(topic, payload) {
	// log the message payload
	console.log('iot: message', topic, payload.toString());
	// echo a copy of the message back to the admin client for confirmation
	sendToServer(payload.toString());
	// in this application messages are in JSON so parse it
	var req = JSON.parse(payload.toString());
	

	// Need to add a function here that polls every 60min to fetch data
	// from sensor. Most probably need to add libraries that configure
	// GPIO pins as data will be pulled from SPI.
	readInput();

	}
});
