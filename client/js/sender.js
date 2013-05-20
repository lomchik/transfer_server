var SendFile = function(config, file, getUrlCB, progressCB) {
	var self = this;
	this.file = file;
	this.sliceSize = config.sliceSize;
	this.connect(config.wsServer);
	this.connection.onopen = function() {
		self.createFile(file);
	};
	this.getFileUrlCB = getUrlCB;
	this.progressCB = progressCB;
};

SendFile.prototype = {
	connect: function(adress) {
		var self = this;
		this.connection = new WebSocket(adress);
		this.connection.onopen = function() {
			log(arguments);
		};
		this.connection.onerror = function(error) {

		};
		this.connection.onmessage = function (message) {
			try {
				var json = JSON.parse(message.data);
				log('got message', json);
			} catch (e) {
				log('This doesn\'t look like a valid JSON: ', message.data);
				return;
			}

			switch (json.method) {
				case 'file url':
					self.getFileUrlCB(json.data);
					break;
				case 'send file':
					self._sendFile(json.data.recipientId, json.data.fileId);
					break;
			}
		};
	},
	createFile: function(file) {
		this.connection.send(JSON.stringify({
			method: 'create file',
			data: {
				name: file.name,
				size: file.size,
				type: file.type
			}
		}));
	},
	_sendFilePart: function(recipientId, fileId, startByte, slice) {
		var array = new Uint8Array(slice),
			arrayToSend = new Uint8Array(array.length + 2 + 5),
			startByteArray = IntToUShortArray(startByte, 5);
		arrayToSend[0] = recipientId;
		arrayToSend[1] = fileId;
		for (var i = 0, len = startByteArray.length; i < len; i++) {
			arrayToSend[2 + i] = startByteArray[i];
		}
		for (var i = 0; i < array.length; i++) {
			arrayToSend[7 + i] = array[i];
		}
        this.progressCB && this.progressCB('sending', {ready: startByte + slice.byteLength, total: this.file.size});
        this.connection.send(arrayToSend);
	},
	_sendFile: function(recipientId, fileId) {
		var fs = new FileSlicer(this.file, this.sliceSize),
			reader = new FileReader(),
			i = 0,
			self = this;

		function sendPart() {
			reader.readAsArrayBuffer(fs.getNextSlice());
		}

		reader.onload  = function(){
			if (reader.readyState != 2) return;
			self._sendFilePart(recipientId, fileId, i * fs.sliceSize, reader.result);
			if (++i < fs.slices) {
				reader.readAsArrayBuffer(fs.getNextSlice());
			}
		};

		sendPart();
	}
};
