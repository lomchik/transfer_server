window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
window.WebSocket = window.WebSocket || window.MozWebSocket;

function log(message) {
	if (!config.debug) {
		return;
	}
	var date = new Date(),
		formated = [date.getHours(), date.getMinutes(), date.getSeconds()].join(':');
	arguments = Array.prototype.reverse.apply(arguments);
	Array.prototype.push.apply(arguments, [formated]);
	arguments = Array.prototype.reverse.apply(arguments);
	console.log.apply(console, arguments);
}

function FileSlicer(file, sliceSize) {
	this.sliceSize = sliceSize;
	this.slices = Math.ceil(file.size / this.sliceSize);

	this.currentSlice = 0;

	this.getNextSlice = function() {
		var start = this.currentSlice * this.sliceSize;
		var end = Math.min((this.currentSlice+1) * this.sliceSize, file.size);
		++this.currentSlice;

		return file.slice(start, end);
	}
}

function p2pFileReceiveEnable() {
	return window.FileReader && window.requestFileSystem && window.WebSocket;
}

function p2pFileSendEnable() {
	return window.FileReader && window.WebSocket;
}

function IntToUShortArray(value, length) {
	var array = new Array(length);
	for (var i = 0; i < length; i++) {
		array[i] = value & 255;
		value = value >> 8;
	}
	return array;
}

function UShortArrayToInt(array) {
	var value = 0;
	for (var i = array.length; i >= 0; i--) {
		value = value << 8;
		value += array[i];
	}
	return value;
}


function fsErrorHandler(e) {
	var msg = '';

	switch (e.code) {
		case FileError.QUOTA_EXCEEDED_ERR:
			msg = 'QUOTA_EXCEEDED_ERR';
			break;
		case FileError.NOT_FOUND_ERR:
			msg = 'NOT_FOUND_ERR';
			break;
		case FileError.SECURITY_ERR:
			msg = 'SECURITY_ERR';
			break;
		case FileError.INVALID_MODIFICATION_ERR:
			msg = 'INVALID_MODIFICATION_ERR';
			break;
		case FileError.INVALID_STATE_ERR:
			msg = 'INVALID_STATE_ERR';
			break;
		default:
			msg = 'Unknown Error';
			break;
	};

	log('Error: ' + msg);
}


function show(element) {
	for (var i = 0, len = arguments.length; i < len; i++) {
		arguments[i].className = arguments[i].className.replace('hidden', '');
	}
}

function hide(element) {
	for (var i = 0, len = arguments.length; i < len; i++) {
		if (arguments[i].className.indexOf('hidden') == -1) {
			arguments[i].className += ' hidden';
		}
	}
}