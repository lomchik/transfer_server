var config = require('../client/js/config');

function log(message) {
	if (!config.debug) {
		return;
	}
	var date = new Date(),
		formated = [date.getHours(), date.getMinutes(), date.getSeconds()].join(':');
	console.log([formated, message].join(' : '));
}

var webSocketServer = require('websocket').server;
var WebSocketConnection = require('websocket').connection;
var Http = require('http');
var Client = require('client');
var File = require('file');

WebSocketConnection.prototype.sendJSON = function(data, cb) {
	return this.sendUTF(JSON.stringify(data), cb);
};

var clients = [],
	server = Http.createServer(function(request, response) {});

server.listen(config.webSocketServer.port, function() {
	log(["Server is listening on port ", config.webSocketServer.port].join(''));
});


var wsServer = new webSocketServer({
	httpServer: server,
	maxReceivedFrameSize: 0x1000000
});

wsServer.on('request', function(request) {
	log(['Connection from origin ', request.origin].join(''));
	var connection = request.accept(null, request.origin);

	var client = new Client(connection);
	var clientId = clients.push(client) - 1;

	log(['Connection accepted. Client: #', clientId].join(''));

	connection.on('message', function(message) {
		log(message.type);
		switch (message.type) {
			case 'utf8':
				log(['Client #', clientId, ' sent utf8 request:\n ', message.utf8Data].join(''));
				var command = JSON.parse(message.utf8Data);
				switch (command.method) {
					case 'create file':
						var file = new File(command.data),
							fileId = client.addFile(file),
							fileUrl = config.downloadPage.createUrl(clientId, fileId, file);
						client.connection.sendJSON({
							method: 'file url',
							data:	fileUrl
						});
						log(['To client #', clientId, ' was sent file url:\n ', fileUrl].join(''));
						break;
					case 'get file':
						var path = config.downloadPage.parseFileUniqueId(command.data.fileUniqueId);
						if ('undefined' == typeof !clients[path.clientId] || clients[path.clientId] === null) {
                            log(['Client #', clientId, ' requests file of not existing peer #', path.clientId].join(''));
						}
						else {
							clients[path.clientId].connection.sendJSON({
								method: 'send file',
								data: {
									fileId: path.fileId,
									recipientId: clientId
								}
							});
						}
						break;
				}
				break;
			case 'binary':
				log(['Client #', clientId, ' sent binary data'].join(''));
				var data = new Uint8Array(message.binaryData),
					receiverId = data[0];
				log(['To Client #', receiverId, ' forwarded binary data'].join(''));
				if (clients[receiverId]) {
					clients[receiverId].connection.send(message.binaryData);
				}
				break;
		}
	});

	connection.on('close', function(connection) {
		log(["Client #", clientId, " disconnected."].join(''));
		log(JSON.stringify(arguments));
		clients[clientId] = null;
	});

});
