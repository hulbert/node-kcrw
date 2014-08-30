#!/usr/bin/env node

var http = require('http');
var url = require('url');
var util = require('util');

// 3rd party
var lame = require('lame');
var Speaker = require('speaker');

// package.json info
var packageInfo = require('./package.json');

var STREAM_URL = 'http://kcrw.ic.llnwd.net/stream/kcrw_live';
var CURRENT_TRACK_URL = 'http://tracklist-api.kcrw.com/Simulcast';
var USER_AGENT = util.format('node-kcrw (%s)', packageInfo.version);
console.log(USER_AGENT)


get(STREAM_URL, function(res) {
	res.pipe(new lame.Decoder())
	   .pipe(new Speaker());

	printLatestTrack();
});


/* Hoisted functions only */

// get the width of terminal, or default
function columnWidth() {
	if (process && process.stdout && !isNaN(process.stdout.columns)) {
		return process.stdout.columns;
	}
	return 80;
}

// wrap up HTTP get requests with a user agent
function get(uri, callback) {
	var parsed = url.parse(uri);
	var options = {
		protocol: parsed.protocol,
		auth: parsed.auth,
		hostname: parsed.hostname,
		path: parsed.path,
		port: parsed.port,
		headers: {
			'User-agent': USER_AGENT
		}
	}
	return http.get(options, callback);
}

// wrap lines, breaking on spaces; columns arg is optional number
function notTooWide(str, columns) {
	if (isNaN(columns)) columns = columnWidth();
	
	var indentStr = '  ';
	var lines = Array(indentStr);
	var words = str.split(' ');
	
	words.forEach(function(word, i) {
		var lastLine = lines[lines.length-1]; // this is a copy, not reference
		if ((lastLine.length + word.length) < columns) {
			lines[lines.length-1] =	 util.format('%s%s ', lastLine, word);
		} else {
			lines.push( util.format('%s%s ', indentStr, word) );
		}
	});
	return lines.join('\n');
}

// calls checkLatest recursively internally
function printLatestTrack() {
	var currentTrackBody = null;
	var currentHost = null;
	var firstRun = true;

	checkLatest();

	function checkLatest() {
		var req = http.get(CURRENT_TRACK_URL, function(res) {
			var data = '';

			res.on('data', function(chunk) {
				data += chunk;
			});

			res.on('end', function() {
				if (currentTrackBody !== data) {
					currentTrackBody = data;
					var song = JSON.parse(data);
				
					if (song.host != currentHost) {
						currentHost = song.host;
						
						var stationBadge = 'KCRW: Member supported independent public radio - http://kcrw.com/join';
						var sep = Array(columnWidth()+1).join('=');

						console.log( util.format('\n%s\n%s\n\nCurrent Host: %s\n%s\n\n', sep, stationBadge, song.host, sep) );
					}

					var lines = ['','',''];
					lines[0] = util.format('“%s” by %s', song.title, song.artist);

					if (song.album) lines[1] += song.album;
					if (song.year > 0) lines[1] += util.format(' (%s)', song.year);

					if (song.comments) lines[2] = util.format("More info:\n%s", notTooWide(song.comments));
					
					lines.push('\n');
					console.log(lines.join('\n'));
				
					setTimeout(checkLatest, (firstRun ? 4000 : 30*1000)); // just changed so let's wait a bit
					firstRun = false;
				} else {
					setTimeout(checkLatest)
				}
			});
		});
		
		req.on('error', function() {
			setTimeout(checkLatest, 4000);
		})
	}
}
