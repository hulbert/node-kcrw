#!/usr/bin/env node

var http = require('http')
var url = require('url')
var util = require('util')

// 3rd party
var lame = require('lame')
var Speaker = require('speaker')
var Promise = require('bluebird')

var CHANNELS = require('./channels')
var packageInfo = require('./package.json')

var USER_AGENT = util.format('node-kcrw (%s)', packageInfo.version)


function main() {
	var options = process.argv.slice(2)
	
	if (options.length > 1 || options[0] === '-h' || options[0] === '--help' || (typeof options[0] === 'string' && !CHANNELS.hasOwnProperty(options[0]))) {
		console.log(USER_AGENT, '\n\nUsage: kcrw [channel]', '\n\nSupported channels:\n -', Object.keys(CHANNELS).join('\n - '))
		return
	}
	
	var channelName = options[0] || 'live'
	playChannel(channelName)
}
main()


/* Hoisted functions only */

function playChannel(channelName) {
	var channelSettings = CHANNELS[channelName]
	
	console.log(USER_AGENT)

    get(channelSettings.stream, function(res) {
		res.pipe(new lame.Decoder())
		   .pipe(new Speaker())

		printLatestTrack({
			trackUrl: channelSettings.track,
			nowPlayingUrl: channelSettings.nowPlaying
		})
	})
}

// get the width of terminal, or default
function columnWidth() {
	if (process && process.stdout && !isNaN(process.stdout.columns)) {
		return process.stdout.columns
	}
	return 80
}

// wrap up HTTP get requests with a user agent
function get(uri, callback) {
	var parsed = url.parse(uri)
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
	return http.get(options, callback)
}

// returns a promise, wrapping our get() fn
function getAnd(uri) {
	return new Promise(function(resolve, reject) {
		var req = get(uri, function(res) {
			var data = ''

			res.on('data', function(chunk) {
				data += chunk
			})

			res.on('end', function() {
				resolve(data)
			})
		})
	
		req.on('error', function(err) {
			reject(err)
		})
	})
}

// wrap lines, breaking on spaces columns arg is optional number
function notTooWide(str, columns) {
	if (isNaN(columns)) columns = columnWidth()
	
	var indentStr = '  '
	var lines = Array(indentStr)
	var words = str.split(' ')
	
	words.forEach(function(word, i) {
		var lastLine = lines[lines.length-1] // this is a copy, not reference
		if ((lastLine.length + word.length) < columns) {
			lines[lines.length-1] =	 util.format('%s%s ', lastLine, word)
		} else {
			lines.push( util.format('%s%s ', indentStr, word) )
		}
	})
	return lines.join('\n')
}

// calls checkLatest recursively internally
/**
 * Begin printing info, calls checkLatest recursively internally.
 * 
 * @param {Object} settings
 * @param settings.nowPlayingUrl
 * @param settings.trackUrl
 */
function printLatestTrack(settings) {
	var currentTrackBody = null
	var currentHost = null

	checkLatest(true)

	function checkLatest(firstRun) {
		Promise.all([
			getAnd(settings.nowPlayingUrl),
			getAnd(settings.trackUrl)
		]).spread(function(nowPlayingData, currentTrackData) {
			var nowPlaying = JSON.parse(nowPlayingData)
			
			// check for host change
			var host1 = null
			if (nowPlaying.hosts && nowPlaying.hosts.length > 0) {
				host1 = nowPlaying['hosts'][0]['name']
			}
			
			var printOut = function(host, showTitle) {
				var stationBadge = 'KCRW: Member supported independent public radio - http://kcrw.com/join'
				var sep = Array(columnWidth()+1).join('=')
				
				var str = util.format('\n%s\n%s\n\nCurrently playing: ', sep, stationBadge)
				if (host) {
					str += util.format('%s (%s)', host1, showTitle)
				} else {
					str += showTitle
				}				
				str += util.format('\n%s\n\n', sep)
				console.log(str)
			}
			
			if (firstRun) {
				currentHost = host1
				printOut(host1, nowPlaying.show_title)
			} else if (host1 !== currentHost) { // this gets skipped for host-less shows after first run
				currentHost = host1
				printOut(host1, nowPlaying.show_title)
			}
			
			// if no songlist key in now playing data, 
			// then track listing is wrong (could eventually use the segments part)
			// so we skip the rest, check again a bit later
			if (nowPlaying.songlist === null) {
				currentTrackBody = null
				setTimeout(checkLatest, 30*1000)
				return
			} 
			
			// track is unchanged, check again soon
			if (currentTrackBody == currentTrackData) {
				setTimeout(checkLatest, 4*1000)
				return
			}
			
			// print out current track info
			currentTrackBody = currentTrackData
			var song = JSON.parse(currentTrackData)
			
			var lines = ['','','']
			lines[0] = util.format('“%s” by %s', song.title, song.artist)

			if (song.album) lines[1] += song.album
			if (song.year > 0) lines[1] += util.format(' (%s)', song.year)

			if (song.comments) lines[2] = util.format("More info:\n%s", notTooWide(song.comments))
			
			lines.push('\n')
			console.log(lines.join('\n'))
			setTimeout(checkLatest, 4000)
		})
	}
}
