var testShift = false;
var client = mqtt.connect('mqtt://tangible_pong_key:reco_final@broker.shiftr.io', {
	clientId: 'javascript'
});

client.on('connect', function() {
	console.log('client has connected!');

	client.subscribe('/buzz');
	// client.unsubscribe('/example');


	setInterval(function() {
		print("interFIRE", testShift);
		if (testShift === true) {
			// print(publishED);
			client.publish('/buzz', 'now');
			testShift = false;
		}
	}, 100);
});

client.on('message', function(topic, message) {
	console.log('new message:', topic, message.toString());
});