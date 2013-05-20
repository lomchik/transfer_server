var DownloadFile = function(file, progressCB) {
	var self = this;
	this.file = file;
    this.parts = {};
	this.connect('ws://127.0.0.1:1338');
	this.connection.onopen = function() {
		self._createFileOnFS(function() {
			self._downloadFile();
		});
	};
	this.progressCB = progressCB;
};

DownloadFile.prototype = {
	connect: function(adress) {
		var self = this;
		this.connection = new WebSocket(adress);
		this.connection.onopen = function() {
			log(arguments);
		};
		this.connection.onerror = function(error) {

		};
		this.connection.onmessage = function (message) {
			log('got message', message);
			if (message.data instanceof Blob) {
				var meta = message.data.slice(2,7),
					fileSlice = message.data.slice(7),
					reader = new FileReader();
				reader.onload  = function() {
					if (reader.readyState != 2) return;
					var startByte = UShortArrayToInt(new Uint8Array(reader.result));
                    self.parts[startByte] = fileSlice;
                    self._writeToFile();
				};
				reader.readAsArrayBuffer(meta);
			}
		};
	},
	_downloadFile: function() {
		this.connection.send(JSON.stringify({
			method: 'get file',
			data: {
				fileUniqueId: this.file.uniqueId
			}
		}));
		this.progressCB('loading', {ready: 0, total: this.file.size});
	},
	_writeToFile: function() {
		if ('undefined' != typeof this.parts[this.file.writer.length] && !this.file.writer.using) {
            var startByte = this.file.writer.length,
                blob = this.parts[this.file.writer.length];
			delete this.parts[this.file.writer.length];
            this.file.writer.using = true;
            log(['Write ',startByte, '-', startByte + blob.size, ' part'].join(''));
			this.file.writer.seek(startByte);
			this.file.writer.write(blob);

            return true;
		}

        return false;
	},
	_createFileOnFS: function(callback) {
		var self = this;
		function onInitFs(fs) {
			log('Opened file system: ' + fs.name);
			self.fs = fs;
			fs.root.getFile(self.file.name, {create: true}, function(fileEntry) {
				self.file.handler = fileEntry;
				self.file.handler.getMetadata(function(data) {
					if (data.size !== 0) {
						if (data.size == self.file.size) {
							self.progressCB('downloaded', {
								ready: self.file.size,
								total: self.file.size,
								url: self.file.handler.toURL()
							});
						}
						else {
							fileEntry.remove(function() {
								onInitFs(fs);
							});
						}

						return;
					}
					self.file.handler.createWriter(function(fileWriter) {
						fileWriter.onwriteend = function(e) {
							log(['Write completed. ', fileWriter.length].join(''));
							self.file.writer.using = false;
							if (fileWriter.length == self.file.size) {
								self.progressCB('downloaded', {
									ready: fileWriter.length,
									total: self.file.size,
									url: self.file.handler.toURL()
								});
							}
							else {
								self.progressCB('loading', {ready: fileWriter.length, total: self.file.size});
								self._writeToFile();
							}
						};
						fileWriter.onerror = function(e) {
							log(['Write failed: ', e.toString()].join(''));
						};
						self.file.writer = fileWriter;

						callback && callback();
					});
				});
			}, fsErrorHandler);
		}
		window.webkitStorageInfo.requestQuota(TEMPORARY, this.file.size, function(grantedBytes) {
			window.requestFileSystem(TEMPORARY, grantedBytes, onInitFs, fsErrorHandler);
		}, function(e) {
			log('Error', e);
		});
	},
	removeFile: function() {
		this.file.handler.remove(function() {
			log('File removed.');
		}, fsErrorHandler);
	}
};