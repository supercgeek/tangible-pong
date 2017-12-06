var testShift = 0;
var client = mqtt.connect('mqtt://tangible_pong_key:reco_final@broker.shiftr.io', {
	clientId: 'javascript'
});

client.on('connect', function() {
	console.log('client has connected!');

	client.subscribe('/buzz');
	// client.unsubscribe('/example');


	setInterval(function() {
		//print("interFIRE", testShift);
		if (testShift !== 0) {
			if (testShift == 1) {
				client.publish('/left', 'now');
			}
			if (testShift == 2) {
				client.publish('/right', 'now');
			}
			testShift = 0;
		}
	}, 100);
});

client.on('message', function(topic, message) {
	//console.log('new message:', topic, message.toString());
});