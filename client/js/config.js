var config = {
	downloadPage: {
		url: 'http://host/recipient.html',
		createUrl: function(clientId, fileId, file) {
			return [this.url, '#'
				, clientId, ':', fileId , '&', encodeURIComponent(file.name), '&', file.size, '&', encodeURIComponent(file.type)].join('');
		},
		parseUrl: function(url) {
			var hash = location.href.replace(config.downloadPage.url + '#', ''),
				fileMeta = hash.split('&');
			return {
				uniqueId: fileMeta[0],
				name: decodeURIComponent(fileMeta[1]),
				size: fileMeta[2],
				type: decodeURIComponent(fileMeta[3])
			};
		},
		parseFileUniqueId: function(uniqueId) {
			var result = uniqueId.split(':');
			return {
				clientId: result[0],
				fileId:   result[1]
			};
		}
	},
	webSocketServer:  {
		host: 'ws://127.0.0.1',
		port: 1338
	},
	sliceSize: 10 * 1024,
	debug: true
};


if ('undefined' !== typeof module) {
	module.exports = config;
}